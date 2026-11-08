"use client";

import React, { useState } from "react";
import { useEMR } from "@/context/EMRContext";
import { Patient, Department, DEPARTMENTS_METADATA } from "@/types/emr";
import { ArrowRightLeft, X, Check } from "lucide-react";
import { useDialogA11y } from "@/hooks/useDialogA11y";

interface TransferModalProps {
  patient: Patient;
  onClose: () => void;
}

const COMMON_REASONS = [
  "Routine routing to next clinical post.",
  "Returning patient with completed external/internal lab results for Doctor review.",
  "Urgent referral for stat diagnostic laboratory investigation (MLS).",
  "Referred for radiological imaging (X-Ray / Ultrasound).",
  "Transferred to Pharmacy for dispensing and administration of prescribed medication.",
  "Clinical vitals captured; routed for physician evaluation.",
  "Acute hemodynamic instability; transferred directly to Emergency / Ward.",
  "Symptoms resolved; authorized for discharge.",
];

export function TransferModal({ patient, onClose }: TransferModalProps) {
  const { transferPatient, activeStaffName } = useEMR();
  const [targetDept, setTargetDept] = useState<Department>(
    patient.currentDepartment === "CONSULTATION" ? "LABORATORY" : "CONSULTATION"
  );
  const [reason, setReason] = useState(
    "Patient transferred for continuation of clinical care."
  );
  const [submitting, setSubmitting] = useState(false);
  const dialogRef = useDialogA11y<HTMLDivElement>(onClose);

  const departmentsList: Department[] = [
    "RECEPTION",
    "TRIAGE",
    "CONSULTATION",
    "LABORATORY",
    "RADIOLOGY",
    "TREATMENT",
    "WARD",
    "DISCHARGED",
  ];

  const handleTransfer = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    await transferPatient(patient.id, targetDept, reason);
    setSubmitting(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-charcoal/40 backdrop-blur-[1px] p-4">
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="transfer-dialog-title"
        tabIndex={-1}
        className="bg-white border border-brand max-w-xl w-full max-h-[92dvh] overflow-y-auto p-5 sm:p-6 space-y-5 outline-none"
      >
        {/* Header */}
        <div className="flex items-start justify-between border-b border-paper-border pb-3">
          <div>
            <div className="flex items-center gap-2">
              <ArrowRightLeft className="w-4 h-4 text-brand" />
              <h3 id="transfer-dialog-title" className="font-serif text-lg font-bold text-charcoal">
                Transfer / Route Patient
              </h3>
            </div>
            <p className="text-xs text-charcoal-muted mt-0.5">
              Move <strong>{patient.fullName}</strong> ({patient.hospitalNumber}) to any station
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close transfer dialog"
            className="text-charcoal-muted hover:text-charcoal p-2"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleTransfer} className="space-y-4">
          {/* Current vs Target */}
          <div className="p-3 bg-paper-warm border border-paper-border grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div>
              <span className="text-[10px] uppercase font-mono text-charcoal-muted">
                Current Location:
              </span>
              <p className="font-serif font-bold text-charcoal text-sm mt-0.5">
                {DEPARTMENTS_METADATA[patient.currentDepartment].name}
              </p>
            </div>
            <div>
              <span className="text-[10px] uppercase font-mono text-brand font-bold">
                Authorizing Officer:
              </span>
              <p className="font-mono text-charcoal text-xs mt-0.5 truncate">
                {activeStaffName}
              </p>
            </div>
          </div>

          {/* Target Station Selection */}
          <div>
            <label className="block text-xs font-mono uppercase tracking-wider text-charcoal mb-1.5">
              Select Destination Station (Flexible Hospital Flow):
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {departmentsList.map((dept) => {
                const meta = DEPARTMENTS_METADATA[dept];
                const isCurrent = patient.currentDepartment === dept;
                const isSelected = targetDept === dept;

                return (
                  <button
                    key={dept}
                    type="button"
                    disabled={isCurrent}
                    onClick={() => setTargetDept(dept)}
                    className={`p-2 text-left border text-xs transition-colors flex flex-col justify-between ${
                      isCurrent
                        ? "opacity-40 bg-paper border-paper-border cursor-not-allowed"
                        : isSelected
                        ? "bg-brand text-paper border-brand font-semibold"
                        : "bg-white border-paper-border hover:bg-paper-warm text-charcoal"
                    }`}
                  >
                    <span className="font-mono text-[10px] opacity-80">
                      {meta.code}
                    </span>
                    <span className="font-serif text-xs font-semibold leading-tight mt-1">
                      {meta.shortName}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Quick Reasons */}
          <div>
            <label className="block text-xs font-mono uppercase tracking-wider text-charcoal mb-1">
              Clinical Justification / Reason:
            </label>
            <div className="flex flex-wrap gap-1 mb-2">
              {COMMON_REASONS.slice(0, 4).map((r, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => setReason(r)}
                  className="text-[10px] px-2 py-0.5 bg-paper border border-paper-border hover:border-brand text-charcoal-muted text-left"
                >
                  {r.length > 55 ? r.slice(0, 55) + "..." : r}
                </button>
              ))}
            </div>
            <textarea
              required
              rows={3}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="w-full p-2.5 text-xs bg-white border border-paper-border focus:border-brand text-charcoal font-sans"
              placeholder="e.g. Patient returned after 2 hours with lab results; routed directly to Doctor consultation."
            />
          </div>

          {/* Footer Actions */}
          <div className="flex justify-end gap-2 pt-3 border-t border-paper-border">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs border border-paper-border text-charcoal hover:bg-paper-warm"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-5 py-2 text-xs bg-brand text-paper hover:bg-brand-hover flex items-center gap-1.5"
            >
              <Check className="w-3.5 h-3.5 text-brand-light" />
              <span>{submitting ? "Routing..." : "Confirm & Transfer Patient"}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
