"use client";

import { useState, useTransition, useEffect } from "react";
import dynamic from "next/dynamic";
import {
  submitBatchCodesAction,
  getBatchCodesByWeekAction,
} from "@/app/api/admin/catalog/actions";

const BatchCodeScanner = dynamic(
  () => import("@/components/admin/BatchCodeScanner").then((m) => ({ default: m.BatchCodeScanner })),
  { ssr: false }
);

/** Extract batch code from lid text (e.g. "2B-050" from "2B-050BESTBY02/20/2027"). Format: XX-XXX (alphanumeric). */
function normalizeBatchCode(input: string): string | null {
  const trimmed = input.trim().toUpperCase().replace(/\s+/g, " ");
  if (!trimmed) return null;
  // Match batch segment: 2–3 chars, dash, 2–4 chars (e.g. 2B-050, 26-037)
  const match = trimmed.match(/^([A-Z0-9]{2,3}-[A-Z0-9]{2,4})/);
  if (match) return match[1];
  // If they pasted full line, take part before BESTBY
  const beforeBestBy = trimmed.split(/BESTBY/i)[0].trim();
  if (beforeBestBy) {
    const m = beforeBestBy.match(/([A-Z0-9]{2,3}-[A-Z0-9]{2,4})/);
    if (m) return m[1];
    if (beforeBestBy.length <= 10) return beforeBestBy;
    return beforeBestBy.slice(0, 10);
  }
  return trimmed.length <= 10 ? trimmed : trimmed.slice(0, 10);
}

type ProductOption = { id: string; name: string };

export function BatchCodesClient({
  products,
  thisWeekStart,
  thisWeekLabel,
}: {
  products: ProductOption[];
  thisWeekStart: string;
  thisWeekLabel: string;
}) {
  const [selectedId, setSelectedId] = useState(products[0]?.id ?? "");
  const [weekStart, setWeekStart] = useState(thisWeekStart);
  const [codes, setCodes] = useState<string[]>([]);
  const [storedCodes, setStoredCodes] = useState<Array<{ id: string; code: string; scanned_at: string }>>([]);
  const [weekOptions, setWeekOptions] = useState<Array<{ weekStartDate: string; label: string }>>([]);
  const [manualInput, setManualInput] = useState("");
  const [showScanner, setShowScanner] = useState(false);
  const [message, setMessage] = useState<{ type: "ok" | "err"; text: string } | null>(null);
  const [isPending, startTransition] = useTransition();
  const isThisWeek = weekStart === thisWeekStart;

  useEffect(() => {
    if (!selectedId) return;
    getBatchCodesByWeekAction(selectedId, weekStart).then(({ codes: list, weeks }) => {
      setStoredCodes(list);
      setWeekOptions(weeks.length > 0 ? weeks : [{ weekStartDate: thisWeekStart, label: thisWeekLabel }]);
    });
  }, [selectedId, weekStart, thisWeekStart, thisWeekLabel]);

  useEffect(() => {
    setWeekStart(thisWeekStart);
  }, [selectedId, thisWeekStart]);

  const addCode = (raw: string) => {
    const normalized = normalizeBatchCode(raw);
    if (normalized && !codes.includes(normalized)) {
      setCodes((prev) => [...prev, normalized]);
    }
  };

  const handleManualAdd = () => {
    const trimmed = manualInput.trim();
    if (!trimmed) return;
    trimmed.split(/[\n,;]+/).forEach((s) => addCode(s));
    setManualInput("");
  };

  const handleScan = (code: string) => {
    addCode(code);
  };

  const removeCode = (index: number) => {
    setCodes((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = () => {
    if (!selectedId || codes.length === 0) {
      setMessage({ type: "err", text: "Select a product and add at least one code." });
      return;
    }
    if (!isThisWeek) {
      setMessage({ type: "err", text: "Switch to this week to add new codes." });
      return;
    }
    startTransition(async () => {
      const result = await submitBatchCodesAction(selectedId, codes);
      if (result.success) {
        setMessage({ type: "ok", text: `Saved ${result.inserted} batch code(s) for this week.` });
        setCodes([]);
        getBatchCodesByWeekAction(selectedId, weekStart).then(({ codes: list }) => setStoredCodes(list));
        setTimeout(() => setMessage(null), 3000);
      } else {
        setMessage({ type: "err", text: result.error ?? "Failed to save" });
      }
    });
  };

  return (
    <div className="space-y-6 max-w-xl">
      <h1 className="text-xl font-bold" style={{ color: "var(--millies-pink)" }}>
        Batch codes
      </h1>
      <p className="text-gray-600 text-sm">
        Batches reset every <strong>Wednesday</strong>. Codes on pint lids are <strong>printed text</strong> (e.g. 2B-050BESTBY02/20/2027), not a barcode — type or paste the code below. You can paste the full line; the batch part (e.g. 2B-050) is extracted.
      </p>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Product (pint flavor)</label>
        <select
          value={selectedId}
          onChange={(e) => setSelectedId(e.target.value)}
          className="w-full rounded border border-gray-300 px-3 py-2 bg-white"
          disabled={isPending}
        >
          {products.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Week</label>
        <select
          value={weekStart}
          onChange={(e) => setWeekStart(e.target.value)}
          className="w-full rounded border border-gray-300 px-3 py-2 bg-white"
          disabled={isPending}
        >
          <option value={thisWeekStart}>
            This week ({thisWeekLabel})
          </option>
          {weekOptions
            .filter((w) => w.weekStartDate !== thisWeekStart)
            .map((w) => (
              <option key={w.weekStartDate} value={w.weekStartDate}>
                {w.label}
              </option>
            ))}
        </select>
      </div>

      {storedCodes.length > 0 && (
        <div>
          <p className="text-sm font-medium text-gray-700 mb-2">
            Saved for selected week ({storedCodes.length})
          </p>
          <ul className="flex flex-wrap gap-2">
            {storedCodes.map((r) => (
              <li
                key={r.id}
                className="inline-flex rounded-full bg-gray-100 px-3 py-1 text-sm text-gray-800"
              >
                {r.code}
              </li>
            ))}
          </ul>
        </div>
      )}

      {isThisWeek && (
        <div className="flex flex-col gap-3">
          <div className="flex flex-1 gap-2">
            <input
              type="text"
              placeholder="e.g. 2B-050 or paste full line (2B-050BESTBY02/20/2027)"
              value={manualInput}
              onChange={(e) => setManualInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), handleManualAdd())}
              className="flex-1 rounded border border-gray-300 px-3 py-2"
              disabled={isPending}
            />
            <button
              type="button"
              onClick={handleManualAdd}
              className="px-4 py-2 rounded bg-gray-800 text-white font-medium hover:bg-gray-700 disabled:opacity-50 shrink-0"
            >
              Add
            </button>
          </div>
          <p className="text-xs text-gray-500">
            One code per line or comma-separated. Camera scan is for barcode labels only; pint lids use the manual field above.
          </p>
          <button
            type="button"
            onClick={() => setShowScanner(true)}
            className="self-start px-3 py-2 rounded border border-gray-300 text-gray-600 text-sm hover:bg-gray-50"
          >
            Scan barcode (if applicable)
          </button>
        </div>
      )}

      {isThisWeek && codes.length > 0 && (
        <div>
          <p className="text-sm font-medium text-gray-700 mb-2">
            Codes to submit ({codes.length})
          </p>
          <ul className="flex flex-wrap gap-2">
            {codes.map((code, i) => (
              <li
                key={`${code}-${i}`}
                className="inline-flex items-center gap-1 rounded-full bg-pink-100 px-3 py-1 text-sm"
              >
                <span style={{ color: "var(--millies-pink)", fontWeight: 600 }}>{code}</span>
                <button
                  type="button"
                  onClick={() => removeCode(i)}
                  className="text-gray-500 hover:text-red-600"
                  aria-label={`Remove ${code}`}
                >
                  ×
                </button>
              </li>
            ))}
          </ul>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={isPending}
            className="mt-3 px-4 py-2 rounded bg-[var(--millies-pink)] text-white font-medium hover:opacity-90 disabled:opacity-50"
          >
            {isPending ? "Saving…" : "Save batch codes"}
          </button>
        </div>
      )}

      {message && (
        <p
          className={`text-sm py-2 px-3 rounded ${message.type === "ok" ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}`}
        >
          {message.text}
        </p>
      )}

      {showScanner && (
        <BatchCodeScanner
          onScan={handleScan}
          onClose={() => setShowScanner(false)}
        />
      )}
    </div>
  );
}
