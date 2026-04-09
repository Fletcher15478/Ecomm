"use client";

import { useTransition, useState } from "react";
import { sendTestOrderEmailAction } from "@/app/api/admin/orders/actions";

export function OrdersTestEmailButton() {
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<{ type: "ok" | "err"; text: string } | null>(null);

  const onClick = () => {
    setMessage(null);
    startTransition(async () => {
      const r = await sendTestOrderEmailAction();
      if (r.success) {
        setMessage({ type: "ok", text: "Test email sent to your admin email. Check inbox and spam." });
      } else {
        setMessage({ type: "err", text: r.error });
      }
    });
  };

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        type="button"
        onClick={onClick}
        disabled={pending}
        className="px-3 py-2 text-sm font-medium rounded-lg border border-gray-300 bg-white hover:bg-gray-50 disabled:opacity-50"
      >
        {pending ? "Sending…" : "Send test order email"}
      </button>
      {message && (
        <p
          className={`text-xs max-w-xs text-right ${message.type === "ok" ? "text-green-700" : "text-red-600"}`}
        >
          {message.text}
        </p>
      )}
    </div>
  );
}
