"use client";

import React, { useId, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { useEMR } from "@/context/EMRContext";
import { useDialogA11y } from "@/hooks/useDialogA11y";
import { X, Check } from "lucide-react";

interface Props {
  onClose: () => void;
}

/** A student corrects or changes their own name. Confirmed with the current password. */
export function RenameAccountModal({ onClose }: Props) {
  const { currentUser, renameAccount } = useAuth();
  const { refresh } = useEMR();
  const dialogRef = useDialogA11y<HTMLDivElement>(onClose);
  const titleId = useId();
  const nameId = useId();
  const pwId = useId();

  const [name, setName] = useState(currentUser?.fullName || "");
  const [password, setPassword] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError("");
    const res = await renameAccount(name, password);
    if (!res.success) {
      setSaving(false);
      setError(res.error || "Your name could not be changed.");
      setPassword("");
      return;
    }
    await refresh(); // pull the records again so they show the new name straight away
    setSaving(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        className="bg-white text-slate-900 border border-brand max-w-md w-full p-5 sm:p-6 space-y-4 outline-none max-h-[92dvh] overflow-y-auto"
      >
        <div className="flex items-start justify-between gap-3">
          <h2 id={titleId} className="font-sans text-lg font-bold text-navy-dark">
            Change my name
          </h2>
          <button type="button" onClick={onClose} aria-label="Close change name dialog" className="text-slate-500 hover:text-slate-900 p-2">
            <X aria-hidden="true" className="w-5 h-5" />
          </button>
        </div>
        <p className="text-sm text-slate-700">
          Your new name is used to sign in from now on, and the records you worked on will show it too. Your old name stays
          reserved for you, so nobody else can take it.
        </p>

        <form onSubmit={submit} className="space-y-3 text-sm">
          <div>
            <label htmlFor={nameId} className="block text-xs font-mono uppercase font-bold text-slate-600 mb-1">
              Full name *
            </label>
            <input
              id={nameId}
              required
              minLength={2}
              maxLength={80}
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full p-2.5 border border-slate-300 focus:border-brand outline-none"
            />
          </div>
          <div>
            <label htmlFor={pwId} className="block text-xs font-mono uppercase font-bold text-slate-600 mb-1">
              Your current password *
            </label>
            <input
              id={pwId}
              required
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter your password to confirm"
              className="w-full p-2.5 border border-slate-300 focus:border-brand outline-none"
            />
          </div>

          {error && (
            <p role="alert" className="text-sm font-semibold text-red-700">
              {error}
            </p>
          )}

          <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2 pt-2 border-t border-slate-200">
            <button type="button" onClick={onClose} className="px-3 py-2.5 text-sm border border-slate-300 hover:bg-slate-50">
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-4 py-2.5 text-sm bg-navy hover:bg-navy-dark text-amber-300 font-bold flex items-center justify-center gap-1.5 disabled:opacity-60"
            >
              <Check aria-hidden="true" className="w-4 h-4" />
              {saving ? "Saving..." : "Save new name"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
