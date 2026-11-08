"use client";

import { FormEvent, useState } from "react";
import { useAuth } from "@/context/AuthContext";

export function RequiredEmailDialog() {
  const { currentUser, updateEmail } = useAuth();
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  if (!currentUser || currentUser.isAdmin || currentUser.email) return null;

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setSaving(true);
    setError("");
    const result = await updateEmail(email);
    setSaving(false);
    if (!result.success) setError(result.error || "Email could not be saved.");
  };

  return (
    <div className="fixed inset-0 z-[100] bg-slate-950/75 flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-labelledby="required-email-title">
      <form onSubmit={submit} className="w-full max-w-md bg-white p-6 shadow-2xl border-t-4 border-brand space-y-4">
        <div>
          <h2 id="required-email-title" className="text-xl font-bold text-navy-dark">Add an email address</h2>
          <p className="mt-2 text-sm text-slate-600">Please provide a valid email address for your student account to continue.</p>
        </div>
        {error && <p role="alert" className="text-sm text-red-700 bg-red-50 border border-red-200 p-2">{error}</p>}
        <label className="block text-sm font-semibold text-slate-700">
          Email address
          <input
            required
            type="email"
            autoComplete="email"
            autoFocus
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            className="mt-1 w-full border border-slate-300 p-3 text-sm font-normal text-charcoal focus:border-brand focus:ring-1 focus:ring-brand outline-none"
            placeholder="you@example.com"
          />
        </label>
        <button type="submit" disabled={saving} className="w-full bg-brand px-4 py-3 font-bold text-navy-dark disabled:opacity-60">
          {saving ? "Saving..." : "Save email and continue"}
        </button>
      </form>
    </div>
  );
}
