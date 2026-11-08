"use client";

import React, { useId, useState } from "react";
import { useEMR } from "@/context/EMRContext";
import { useAuth } from "@/context/AuthContext";
import { HOSPITAL_ROLES, RoleId } from "@/types/emr";
import { useDialogA11y } from "@/hooks/useDialogA11y";
import { Lock } from "lucide-react";

/** Shown to a student at the start of every class session. Their choice is saved on the server. */
export function RolePickerDialog() {
  const { chooseSessionRole, sessionName } = useEMR();
  const { currentUser, logout } = useAuth();
  const roles = HOSPITAL_ROLES.filter((r) => r.id !== "director");

  const [selected, setSelected] = useState<RoleId>((currentUser?.assignedRole as RoleId) || "receptionist");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const titleId = useId();
  const descId = useId();
  const dialogRef = useDialogA11y<HTMLDivElement>(() => {
    // this choice cannot be dismissed
  });

  const confirm = async () => {
    setSaving(true);
    setError("");
    const res = await chooseSessionRole(selected);
    setSaving(false);
    if (!res.success) setError(res.error || "Could not save your station.");
  };

  const chosen = roles.find((r) => r.id === selected);

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/75 p-4">
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={descId}
        tabIndex={-1}
        className="bg-white text-slate-900 w-full max-w-xl max-h-[94dvh] flex flex-col border-2 border-brand outline-none"
      >
        <div className="p-4 sm:p-6 pb-2 sm:pb-3 shrink-0">
          <h2 id={titleId} className="font-sans text-lg sm:text-xl font-bold text-navy-dark">
            Choose your station for this class session
          </h2>
          {sessionName && <p className="text-xs font-mono text-slate-500 mt-0.5">Session: {sessionName}</p>}
          <p id={descId} className="text-xs sm:text-sm text-slate-700 mt-1.5 [@media(max-height:500px)]:hidden">
            You will act as this station until the session is closed. Your teacher can then start a new session, and you may
            keep the same station or pick another one.
          </p>
        </div>

        <div role="radiogroup" aria-label="Stations" className="flex flex-col sm:flex-row sm:flex-wrap sm:content-start gap-2 overflow-y-auto px-4 sm:px-6 py-1 flex-1 min-h-0">
          {roles.map((r) => {
            const on = selected === r.id;
            return (
              <button
                key={r.id}
                type="button"
                role="radio"
                aria-checked={on}
                onClick={() => setSelected(r.id)}
                className={`text-left p-3 border-2 transition-colors shrink-0 sm:basis-[calc(50%-0.25rem)] ${
                  on ? "border-brand bg-amber-50" : "border-slate-200 hover:border-navy bg-white"
                }`}
              >
                <span className="flex items-center gap-2">
                  <span className="font-mono text-[10px] px-1.5 py-0.5 bg-navy text-white">{r.badge}</span>
                  <span className="font-bold text-sm text-navy-dark">{r.title}</span>
                </span>
                <span className="hidden sm:block [@media(max-height:500px)]:hidden text-xs text-slate-600 mt-1 line-clamp-2">{r.description}</span>
              </button>
            );
          })}
        </div>

        {error && (
          <p role="alert" className="text-sm font-semibold text-red-700 px-4 sm:px-6 pt-2 shrink-0">
            {error}
          </p>
        )}

        <div className="flex flex-col-reverse sm:flex-row sm:items-center sm:justify-between gap-3 p-4 sm:p-6 pt-3 border-t border-slate-200 shrink-0 bg-white">
          <button type="button" onClick={logout} className="text-xs underline text-slate-600 hover:text-slate-900 self-start">
            Sign out
          </button>
          <button
            type="button"
            onClick={confirm}
            disabled={saving}
            className="flex items-center justify-center gap-2 px-5 py-3 bg-navy hover:bg-navy-dark text-amber-300 font-bold text-sm disabled:opacity-60"
          >
            <Lock aria-hidden="true" className="w-4 h-4" />
            {saving ? "Saving..." : `Start as ${chosen?.title ?? "this station"} for this session`}
          </button>
        </div>
      </div>
    </div>
  );
}
