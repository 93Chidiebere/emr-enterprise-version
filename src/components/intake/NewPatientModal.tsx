"use client";

import React, { useState } from "react";
import { useEMR } from "@/context/EMRContext";
import { Department, Patient } from "@/types/emr";
import { UserPlus, X, Check } from "lucide-react";
import { useDialogA11y } from "@/hooks/useDialogA11y";
import { ageFromDateOfBirth, localDateString } from "@/lib/patient-age";

interface NewPatientModalProps {
  onClose: () => void;
  /** called with the saved patient so the screen can confirm where they were sent */
  onEnrolled?: (patient: Patient) => void;
}

export const KIN_RELATIONSHIPS = [
  "Spouse",
  "Father",
  "Mother",
  "Son",
  "Daughter",
  "Brother",
  "Sister",
  "Grandparent",
  "Uncle",
  "Aunt",
  "Cousin",
  "Legal Guardian",
  "Friend",
  "Employer / Colleague",
  "Other",
];

export function NewPatientModal({ onClose, onEnrolled }: NewPatientModalProps) {
  const { registerPatient } = useEMR();
  const dialogRef = useDialogA11y<HTMLDivElement>(onClose);
  const [fullName, setFullName] = useState("");
  const [gender, setGender] = useState<"Female" | "Male" | "Other">("Female");
  const [dateOfBirth, setDateOfBirth] = useState(() => localDateString());
  const age = ageFromDateOfBirth(dateOfBirth);
  const [phoneNumber, setPhoneNumber] = useState("");
  const [address, setAddress] = useState("");
  const [kinName, setKinName] = useState("");
  const [kinRelation, setKinRelation] = useState("");
  const [kinRelationOther, setKinRelationOther] = useState("");
  const [kinError, setKinError] = useState("");
  const [kinPhone, setKinPhone] = useState("");
  const [paymentType, setPaymentType] = useState<
    "Out-of-Pocket / Cash" | "NHIS / Health Insurance" | "Corporate HMO"
  >("Out-of-Pocket / Cash");
  const [initialRoute, setInitialRoute] = useState<Department>("TRIAGE");
  const [routingReason, setRoutingReason] = useState(
    "New intake enrolled at Front Desk; routed to Nurse Triage for baseline vitals."
  );
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName) return;

    // Emergency contact is compulsory
    const relationFinal = kinRelation === "Other" ? kinRelationOther.trim() : kinRelation;
    if (!kinName.trim() || !relationFinal || kinPhone.replace(/\D/g, "").length < 7) {
      setKinError("Emergency contact is compulsory: enter the contact's name, relationship, and a valid phone number.");
      return;
    }
    setKinError("");

    setSubmitting(true);
    setKinError("");
    let saved: Patient;
    try {
    saved = await registerPatient(
      {
        fullName,
        age: age ?? 0,
        gender,
        dateOfBirth,
        phoneNumber,
        address,
        nextOfKin: {
          name: kinName.trim(),
          relation: relationFinal,
          phone: kinPhone.trim(),
        },
        paymentType,
      },
      initialRoute,
      routingReason
    );
    } catch (err) {
      setSubmitting(false);
      setKinError(err instanceof Error ? err.message : "The patient could not be saved. Please try again.");
      return;
    }
    setSubmitting(false);
    onEnrolled?.(saved);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-charcoal/40 backdrop-blur-[1px] p-4">
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="intake-dialog-title"
        tabIndex={-1}
        className="bg-white border border-brand max-w-2xl w-full p-5 sm:p-6 space-y-4 max-h-[92dvh] overflow-y-auto outline-none"
      >
        <div className="flex items-start justify-between border-b border-paper-border pb-3">
          <div>
            <div className="flex items-center gap-2">
              <UserPlus className="w-4 h-4 text-brand" />
              <h3 id="intake-dialog-title" className="font-serif text-lg font-bold text-charcoal">
                Trinity University Hospital EHR — Patient Intake
              </h3>
            </div>
            <p className="text-xs text-charcoal-muted mt-0.5">
              Medical records admission docket and initial department routing
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close patient intake dialog"
            className="text-charcoal-muted hover:text-charcoal p-2"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          {/* Personal Information */}
          <div className="space-y-3">
            <h4 className="font-mono text-[11px] uppercase tracking-wider text-charcoal font-semibold border-b border-paper-border pb-1">
              1. Patient Demographics
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="sm:col-span-2">
                <label className="block text-charcoal-muted mb-1 font-mono text-[10px] uppercase">
                  Full Legal Name *
                </label>
                <input
                  required
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="e.g. Maryam Olatunji"
                  className="w-full p-2 bg-paper-warm border border-paper-border focus:border-brand text-charcoal font-sans"
                />
              </div>

              <div>
                <label className="block text-charcoal-muted mb-1 font-mono text-[10px] uppercase">
                  Gender *
                </label>
                <select
                  value={gender}
                  onChange={(e) => setGender(e.target.value as any)}
                  className="w-full p-2 bg-paper-warm border border-paper-border focus:border-brand text-charcoal"
                >
                  <option value="Female">Female</option>
                  <option value="Male">Male</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              <div>
                <label className="block text-charcoal-muted mb-1 font-mono text-[10px] uppercase">
                  Age (Years) (calculated)
                </label>
                <input
                  required
                  type="number"
                  min="0"
                  max="125"
                  value={age ?? ""}
                  readOnly
                  aria-readonly="true"
                  placeholder="Enter date of birth"
                  className="w-full p-2 bg-paper-warm border border-paper-border focus:border-brand text-charcoal"
                />
              </div>

              <div>
                <label className="block text-charcoal-muted mb-1 font-mono text-[10px] uppercase">
                  Date of Birth *
                </label>
                <input
                  required
                  type="date"
                  value={dateOfBirth}
                  onChange={(e) => setDateOfBirth(e.target.value)}
                  max={localDateString()}
                  className="w-full p-2 bg-paper-warm border border-paper-border focus:border-brand text-charcoal"
                />
              </div>

              <div>
                <label className="block text-charcoal-muted mb-1 font-mono text-[10px] uppercase">
                  Billing Category
                </label>
                <select
                  value={paymentType}
                  onChange={(e) => setPaymentType(e.target.value as any)}
                  className="w-full p-2 bg-paper-warm border border-paper-border focus:border-brand text-charcoal"
                >
                  <option value="Out-of-Pocket / Cash">Out-of-Pocket / Cash</option>
                  <option value="NHIS / Health Insurance">NHIS / Health Insurance</option>
                  <option value="Corporate HMO">Corporate HMO</option>
                </select>
              </div>

              <div className="sm:col-span-2">
                <label className="block text-charcoal-muted mb-1 font-mono text-[10px] uppercase">
                  Residential Address
                </label>
                <input
                  type="text"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="e.g. 18 Bishop Oluwole, VI, Lagos"
                  className="w-full p-2 bg-paper-warm border border-paper-border focus:border-brand text-charcoal"
                />
              </div>

              <div>
                <label className="block text-charcoal-muted mb-1 font-mono text-[10px] uppercase">
                  Phone Number
                </label>
                <input
                  type="tel"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  placeholder="e.g. 0802 345 6789"
                  className="w-full p-2 bg-paper-warm border border-paper-border focus:border-brand text-charcoal"
                />
              </div>
            </div>
          </div>

          {/* Next of Kin */}
          <div className="space-y-3 pt-2">
            <h4 className="font-mono text-[11px] uppercase tracking-wider text-charcoal font-semibold border-b border-paper-border pb-1">
              2. Emergency Contact / Next of Kin (Required)
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-charcoal-muted mb-1 font-mono text-[10px] uppercase">
                  Name *
                </label>
                <input
                  required
                  type="text"
                  value={kinName}
                  onChange={(e) => setKinName(e.target.value)}
                  placeholder="Contact Name"
                  className="w-full p-2 bg-paper-warm border border-paper-border focus:border-brand text-charcoal"
                />
              </div>
              <div>
                <label className="block text-charcoal-muted mb-1 font-mono text-[10px] uppercase">
                  Relationship *
                </label>
                <select
                  required
                  value={kinRelation}
                  onChange={(e) => setKinRelation(e.target.value)}
                  className="w-full p-2 bg-paper-warm border border-paper-border focus:border-brand text-charcoal"
                >
                  <option value="" disabled>
                    Select relationship
                  </option>
                  {KIN_RELATIONSHIPS.map((r) => (
                    <option key={r} value={r}>
                      {r}
                    </option>
                  ))}
                </select>
                {kinRelation === "Other" && (
                  <input
                    required
                    type="text"
                    value={kinRelationOther}
                    onChange={(e) => setKinRelationOther(e.target.value)}
                    placeholder="Specify relationship"
                    aria-label="Specify the other relationship"
                    className="w-full p-2 mt-2 bg-paper-warm border border-paper-border focus:border-brand text-charcoal"
                  />
                )}
              </div>
              <div>
                <label className="block text-charcoal-muted mb-1 font-mono text-[10px] uppercase">
                  Emergency Phone *
                </label>
                <input
                  required
                  type="tel"
                  inputMode="tel"
                  minLength={7}
                  value={kinPhone}
                  onChange={(e) => setKinPhone(e.target.value)}
                  placeholder="e.g. 0803 111 2222"
                  className="w-full p-2 bg-paper-warm border border-paper-border focus:border-brand text-charcoal"
                />
              </div>
            </div>
          </div>

          {kinError && (
            <p role="alert" className="text-xs text-terracotta font-semibold">
              {kinError}
            </p>
          )}

          {/* Flexible Initial Routing */}
          <div className="space-y-3 pt-2">
            <h4 className="font-mono text-[11px] uppercase tracking-wider text-charcoal font-semibold border-b border-paper-border pb-1">
              3. Flexible Initial Routing Destination
            </h4>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {[
                {
                  dept: "TRIAGE" as Department,
                  label: "Triage & Vitals (Standard)",
                  desc: "Send to Nurse Triage queue",
                },
                {
                  dept: "CONSULTATION" as Department,
                  label: "Direct to Doctor (Follow-Up)",
                  desc: "Bypass triage; returning patient",
                },
                {
                  dept: "TREATMENT" as Department,
                  label: "Emergency / Pharmacy",
                  desc: "Acute urgent medication",
                },
                {
                  dept: "LABORATORY" as Department,
                  label: "Direct to Lab (MLS)",
                  desc: "Routine lab specimen collection",
                },
              ].map((r) => (
                <button
                  key={r.dept}
                  type="button"
                  onClick={() => {
                    setInitialRoute(r.dept);
                    if (r.dept === "CONSULTATION") {
                      setRoutingReason("Patient returning from earlier lab draw; routed straight to Doctor consultation.");
                    } else if (r.dept === "TREATMENT") {
                      setRoutingReason("Patient presenting in acute pain; routed straight to Pharmacy.");
                    } else if (r.dept === "LABORATORY") {
                      setRoutingReason("Patient walking in for routine lab specimen draw.");
                    } else {
                      setRoutingReason("New intake enrolled at Front Desk; routed to Nurse Triage for baseline vitals.");
                    }
                  }}
                  className={`p-2.5 text-left border transition-colors flex flex-col justify-between ${
                    initialRoute === r.dept
                      ? "bg-brand text-paper border-brand font-medium"
                      : "bg-white border-paper-border hover:bg-paper-warm text-charcoal"
                  }`}
                >
                  <span className="font-serif font-bold text-xs">{r.label}</span>
                  <span className="text-[10px] opacity-80 mt-1">{r.desc}</span>
                </button>
              ))}
            </div>

            <div>
              <label className="block text-charcoal-muted mb-1 font-mono text-[10px] uppercase">
                Intake Routing Note
              </label>
              <input
                type="text"
                value={routingReason}
                onChange={(e) => setRoutingReason(e.target.value)}
                className="w-full p-2 bg-paper-warm border border-paper-border focus:border-brand text-charcoal font-sans"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-4 border-t border-paper-border">
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
              <span>{submitting ? "Enrolling..." : "Enroll & Route Patient"}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
