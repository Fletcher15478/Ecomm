"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Html5Qrcode, Html5QrcodeSupportedFormats } from "html5-qrcode";

const SCANNER_ID = "batch-code-scanner-root";

export function BatchCodeScanner({
  onScan,
  onClose,
}: {
  onScan: (code: string) => void;
  onClose: () => void;
}) {
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<"idle" | "starting" | "scanning">("idle");
  const scannerRef = useRef<Html5Qrcode | null>(null);

  const stopScanner = useCallback(async () => {
    const scanner = scannerRef.current;
    if (!scanner) {
      setStatus("idle");
      return;
    }
    try {
      if (scanner.isScanning) {
        await scanner.stop();
      }
      scanner.clear();
    } catch {
      // Ignore: camera may have failed to start or already released (e.g. on desktop)
    } finally {
      scannerRef.current = null;
      setStatus("idle");
    }
  }, []);

  const startCamera = useCallback(async () => {
    setError(null);
    setStatus("starting");
    try {
      const html5Qr = new Html5Qrcode(SCANNER_ID, {
        formatsToSupport: [
          Html5QrcodeSupportedFormats.CODE_128,
          Html5QrcodeSupportedFormats.CODE_39,
          Html5QrcodeSupportedFormats.CODE_93,
          Html5QrcodeSupportedFormats.QR_CODE,
        ],
        verbose: false,
      });
      scannerRef.current = html5Qr;
      await html5Qr.start(
        { facingMode: "environment" },
        { fps: 10, qrbox: { width: 220, height: 120 } },
        (decodedText) => {
          setStatus("scanning");
          onScan(decodedText.trim());
        },
        () => {}
      );
      setStatus("scanning");
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Could not start camera";
      setError(msg);
      setStatus("idle");
      scannerRef.current = null; // don't try to stop a scanner that never started
    }
  }, [onScan]);

  const handleClose = useCallback(() => {
    stopScanner();
    onClose();
  }, [stopScanner, onClose]);

  useEffect(() => {
    return () => {
      stopScanner();
    };
  }, [stopScanner]);

  return (
    <div className="fixed inset-0 z-[100] bg-black flex flex-col">
      <div className="flex items-center justify-between p-4 bg-black/80 text-white">
        <span className="font-medium">Scan batch code (e.g. 26-037)</span>
        <div className="flex gap-2">
          {status === "idle" && (
            <button
              type="button"
              onClick={startCamera}
              className="px-4 py-2 rounded bg-[var(--millies-pink)] text-white font-medium"
            >
              {error ? "Try again" : "Start camera"}
            </button>
          )}
          <button
            type="button"
            onClick={handleClose}
            className="px-4 py-2 rounded border border-white/60 text-white"
          >
            Done
          </button>
        </div>
      </div>
      <div className="flex-1 flex flex-col items-center justify-center p-4">
        <div
          id={SCANNER_ID}
          className="w-full max-w-md aspect-[4/3] bg-gray-900 rounded-lg overflow-hidden"
        />
        {error && (
          <p className="mt-4 text-red-400 text-sm text-center">
            {error}. Use manual entry below or allow camera access and try again.
          </p>
        )}
        {status === "scanning" && (
          <p className="mt-4 text-white/80 text-sm">Point at barcode. Scanned codes are added to the list.</p>
        )}
      </div>
    </div>
  );
}
