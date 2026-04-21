"use client";

import { useState, useTransition } from "react";
import { grantAdminByEmailAction } from "@/app/api/admin/admins/actions";

export function AdminsClient() {
  const [email, setEmail] = useState("phil@millieshomemade.com");
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<{ type: "ok" | "err"; text: string } | null>(null);

  const grant = () => {
    setMessage(null);
    startTransition(async () => {
      const r = await grantAdminByEmailAction(email);
      setMessage(r.success ? { type: "ok", text: "Admin granted." } : { type: "err", text: r.error });
    });
  };

  return (
    <div className="bg-white border rounded-lg p-4 space-y-3">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
        <input
          className="w-full border rounded px-3 py-2"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="name@domain.com"
        />
      </div>
      <button
        type="button"
        onClick={grant}
        disabled={pending}
        className="px-3 py-2 rounded bg-black text-white text-sm disabled:opacity-50"
      >
        {pending ? "Granting…" : "Grant admin"}
      </button>
      {message && (
        <p className={`text-sm ${message.type === "ok" ? "text-green-700" : "text-red-600"}`}>{message.text}</p>
      )}
    </div>
  );
}

