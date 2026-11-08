"use client";

import React, { useId, useState } from "react";
import { useEMR } from "@/context/EMRContext";
import { Patient } from "@/types/emr";
import { KIN_RELATIONSHIPS } from "@/components/intake/NewPatientModal";
import { useDialogA11y } from "@/hooks/useDialogA11y";
import { X, Check } from "lucide-react";
import { ageFromDateOfBirth, localDateString } from "@/lib/patient-age";

interface Props {
  patient: Patient;
  onClose: () => void;
}

const input = "w-full p-2 bg-paper-warm border border-paper-border focus:border-brand text-charcoal";
const labelCls = "block font-mono text-[10px] uppercase text-charcoal-muted mb-1 font-bold";

/** Front Desk: correct a patient's personal details after registration (phone number, spelling, next of kin...). */
export function EditPatientDetailsModal({ patient, onClose }: Props) {
  const { updatePatientDetails } = useEMR();
  const dialogRef = useDialogA11y<HTMLDivElement>(onClose);
  const titleId = useId();

  const knownRelation = KIN_RELATIONSHIPS.includes(patient.nextOfKin?.relation || "");
  const [fullName, setFullName] = useState(patient.fullName);
  const [gender, setGender] = useState<"Female" | "Male" | "Other">((patient.gender as "Female" | "Male" | "Other") || "Other");
  const [dateOfBirth, setDateOfBirth] = useState(patient.dateOfBirth || "");
  const age = ageFromDateOfBirth(dateOfBirth);
  const [phoneNumber, setPhoneNumber] = useState(patient.phoneNumber || "");
  const [address, setAddress] = useState(patient.address || "");
  const [paymentType, setPaymentType] = useState<string>(patient.paymentType || "Out-of-Pocket / Cash");
  const [kinName, setKinName] = useState(patient.nextOfKin?.name || "");
  const [kinRelation, setKinRelation] = useState(knownRelation ? patient.nextOfKin.relation : patient.nextOfKin?.relation ? "Other" : "");
  const [kinRelationOther, setKinRelationOther] = useState(knownRelation ? "" : patient.nextOfKin?.relation || "");
  const [kinPhone, setKinPhone] = useState(patient.nextOfKin?.phone || "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const relation = kinRelation === "Other" ? kinRelationOther.trim() : kinRelation;
    if (!kinName.trim() || !relation || kinPhone.replace(/\D/g, "").length < 7) {
      setError("Emergency contact is compulsory: enter the contact's name, relationship, and a valid phone number.");
      return;
    }
    setSaving(true);
    setError("");
    const res = await updatePatientDetails(patient.id, {
      fullName: fullName.trim(),
      age: age ?? 0,
      gender,
      dateOfBirth,
      phoneNumber: phoneNumber.trim(),
      address: address.trim(),
      paymentType,
      nextOfKin: { name: kinName.trim(), relation, phone: kinPhone.trim() },
    });
    setSaving(false);
    if (!res.success) {
      setError(res.error || "The details could not be saved.");
      return;
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-charcoal/45 backdrop-blur-[1px] p-4">
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        className="bg-white border border-brand max-w-2xl w-full p-5 sm:p-6 space-y-4 max-h-[92dvh] overflow-y-auto outline-none"
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 id={titleId} className="font-serif text-lg font-bold text-charcoal">
              Edit patient details
            </h3>
            <p className="text-xs font-mono text-charcoal-muted">
              {patient.hospitalNumber} · clinical records are not affected
            </p>
          </div>
          <button type="button" onClick={onClose} aria-label="Close edit details dialog" className="text-charcoal-muted hover:text-charcoal p-2">
            <X aria-hidden="true" className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={submit} className="space-y-4 text-xs">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="sm:col-span-2">
              <label htmlFor="ed-name" className={labelCls}>Full name *</label>
              <input id="ed-name" required className={input} value={fullName} onChange={(e) => setFullName(e.target.value)} />
            </div>
            <div>
              <label htmlFor="ed-age" className={labelCls}>Age (calculated)</label>
              <input id="ed-age" type="number" className={input} value={age ?? ""} readOnly aria-readonly="true" placeholder="Enter date of birth" />
            </div>
            <div>
              <label htmlFor="ed-gender" className={labelCls}>Gender</label>
              <select id="ed-gender" className={input} value={gender} onChange={(e) => setGender(e.target.value as "Female" | "Male" | "Other")}>
                <option value="Female">Female</option>
                <option value="Male">Male</option>
                <option value="Other">Other</option>
              </select>
            </div>
            <div>
              <label htmlFor="ed-dob" className={labelCls}>Date of birth</label>
              <input id="ed-dob" required type="date" max={localDateString()} className={input} value={dateOfBirth} onChange={(e) => setDateOfBirth(e.target.value)} />
            </div>
            <div>
              <label htmlFor="ed-phone" className={labelCls}>Patient phone number</label>
              <input id="ed-phone" type="tel" inputMode="tel" className={input} value={phoneNumber} onChange={(e) => setPhoneNumber(e.target.value)} placeholder="e.g. 0803 111 2222" />
            </div>
            <div className="sm:col-span-2">
              <label htmlFor="ed-address" className={labelCls}>Home address</label>
              <input id="ed-address" className={input} value={address} onChange={(e) => setAddress(e.target.value)} />
            </div>
            <div className="sm:col-span-2">
              <label htmlFor="ed-pay" className={labelCls}>Payment scheme</label>
              <select id="ed-pay" className={input} value={paymentType} onChange={(e) => setPaymentType(e.target.value)}>
                <option value="Out-of-Pocket / Cash">Out-of-Pocket / Cash</option>
                <option value="NHIS / Health Insurance">NHIS / Health Insurance</option>
                <option value="Corporate HMO">Corporate HMO</option>
              </select>
            </div>
          </div>

          <fieldset className="border border-paper-border p-3 space-y-3">
            <legend className="px-1 font-mono text-[10px] uppercase font-bold text-charcoal-muted">Emergency contact / next of kin (required)</legend>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label htmlFor="ed-kin-name" className={labelCls}>Name *</label>
                <input id="ed-kin-name" required className={input} value={kinName} onChange={(e) => setKinName(e.target.value)} />
              </div>
              <div>
                <label htmlFor="ed-kin-rel" className={labelCls}>Relationship *</label>
                <select id="ed-kin-rel" required className={input} value={kinRelation} onChange={(e) => setKinRelation(e.target.value)}>
                  <option value="" disabled>Select relationship</option>
                  {KIN_RELATIONSHIPS.map((r) => (
                    <option key={r} value={r}>{r}</option>
                  ))}
                </select>
                {kinRelation === "Other" && (
                  <input required aria-label="Specify the other relationship" className={`${input} mt-2`} value={kinRelationOther} onChange={(e) => setKinRelationOther(e.target.value)} placeholder="Specify relationship" />
                )}
              </div>
              <div>
                <label htmlFor="ed-kin-phone" className={labelCls}>Phone *</label>
                <input id="ed-kin-phone" required type="tel" inputMode="tel" minLength={7} className={input} value={kinPhone} onChange={(e) => setKinPhone(e.target.value)} />
              </div>
            </div>
          </fieldset>

          {error && (
            <p role="alert" className="text-xs text-terracotta font-semibold">
              {error}
            </p>
          )}

          <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2 pt-2 border-t border-paper-border">
            <button type="button" onClick={onClose} className="px-3 py-2.5 sm:py-1.5 text-xs border border-paper-border text-charcoal hover:bg-paper-warm">
              Cancel
            </button>
            <button type="submit" disabled={saving} className="px-4 py-2.5 sm:py-1.5 text-xs bg-brand hover:bg-brand-hover text-navy-dark font-bold flex items-center justify-center gap-1.5 disabled:opacity-60">
              <Check aria-hidden="true" className="w-3.5 h-3.5" />
              {saving ? "Saving..." : "Save changes"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
