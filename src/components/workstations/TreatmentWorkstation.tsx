"use client";

import React, { useState } from "react";
import { useEMR } from "@/context/EMRContext";
import { Patient, Department, MedicationAdministration } from "@/types/emr";
import { Syringe, Check, ArrowRightLeft, CheckCircle2, ShieldCheck } from "lucide-react";

interface TreatmentWorkstationProps {
  onOpenDossier: (patient: Patient) => void;
  onOpenTransfer: (patient: Patient) => void;
}

const COMMON_SITES = [
  "IV Cannula (Left Forearm)",
  "IV Cannula (Right Dorsum of Hand)",
  "Left Gluteal (Intramuscular)",
  "Right Gluteal (Intramuscular)",
  "Left Deltoid (Upper Arm)",
  "Right Deltoid (Upper Arm)",
  "Oral (Ingested with clean water)",
];

export function TreatmentWorkstation({
  onOpenDossier,
  onOpenTransfer,
}: TreatmentWorkstationProps) {
  const { patients, administerMedication, dischargePatient } = useEMR();

  // Only patients currently at the PHARMACY station
  const treatmentQueue = patients.filter((p) => p.currentDepartment === "TREATMENT" && p.status === "Active");

  const [selectedPatientId, setSelectedPatientId] = useState<string>(
    treatmentQueue[0]?.id || ""
  );
  // Only patients still in the Pharmacy queue can be open on this screen
  const selectedPatient = treatmentQueue.find((p) => p.id === selectedPatientId);

  const pendingMeds = selectedPatient?.medications.filter((m) => m.status !== "administered") || [];
  const [selectedMedId, setSelectedMedId] = useState<string>(pendingMeds[0]?.id || "");

  // Form State
  const [injectionSite, setInjectionSite] = useState(COMMON_SITES[0]);
  const [nurseNotes, setNurseNotes] = useState(
    "Patient verified against hospital chart. Drug reconstituted and administered as ordered. Vital signs re-checked and stable. No acute hypersensitivity reactions observed."
  );
  const [nextStation, setNextStation] = useState<Department>("DISCHARGED");
  const [routingReason, setRoutingReason] = useState(
    "Stat medication administered successfully; symptoms resolved. Discharged home in stable condition."
  );
  const [submitting, setSubmitting] = useState(false);

  const activeMed = selectedPatient?.medications.find((m) => m.id === selectedMedId);

  const resetForm = () => {
    setSelectedMedId("");
    setInjectionSite(COMMON_SITES[0]);
    setNurseNotes(
      "Patient verified against hospital chart. Drug reconstituted and administered as ordered. Vital signs re-checked and stable. No acute hypersensitivity reactions observed."
    );
    setNextStation("DISCHARGED");
    setRoutingReason(
      "Stat medication administered successfully; symptoms resolved. Discharged home in stable condition."
    );
  };

  React.useEffect(() => {
    if (selectedPatientId && !treatmentQueue.some((p) => p.id === selectedPatientId)) {
      setSelectedPatientId("");
      resetForm();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [treatmentQueue.map((p) => p.id).join("|"), selectedPatientId]);

  const handleAdminister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPatient || !selectedMedId) return;

    setSubmitting(true);
    await administerMedication(
      selectedPatient.id,
      selectedMedId,
      injectionSite,
      nurseNotes,
      nextStation,
      routingReason
    );
    setSubmitting(false);

    // Medication recorded: clear the form and the screen
    resetForm();
    setSelectedPatientId("");
  };

  const handleDirectDischarge = async () => {
    if (!selectedPatient) return;
    setSubmitting(true);
    await dischargePatient(
      selectedPatient.id,
      "Patient completed treatment course and observed in Pharmacy. Vital signs stable. Discharged home."
    );
    setSubmitting(false);
    resetForm();
    setSelectedPatientId("");
  };

  return (
    <div className="space-y-6">
      {/* Title */}
      <div className="bg-white border border-paper-border p-4 sm:p-5 flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <Syringe className="w-5 h-5 text-brand" />
            <h2 className="font-serif text-lg sm:text-xl font-bold text-charcoal">
              Pharmacy & Medication Administration Station
            </h2>
          </div>
          <p className="hidden sm:block text-xs text-charcoal-muted mt-0.5">
            Administer physician-prescribed IV/IM injections, log anatomical injection sites, record nursing observations, and finalize discharge.
          </p>
        </div>
        <div className="font-mono text-xs px-2.5 py-1 bg-paper-warm border border-paper-border text-charcoal">
          Pharmacy Queue: <strong>{treatmentQueue.length}</strong> patient(s) waiting
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Queue */}
        <div className="lg:col-span-4 space-y-3">
          <div className="flex items-center justify-between border-b border-paper-border pb-1">
            <span className="font-mono text-[11px] uppercase tracking-wider text-amber-300 font-bold">
              Waiting at Pharmacy ({treatmentQueue.length})
            </span>
          </div>

          {treatmentQueue.length === 0 ? (
            <div className="p-8 text-center text-charcoal-muted bg-white border border-paper-border text-xs">
              No patients currently waiting at the Pharmacy.
            </div>
          ) : (
            <div className="space-y-2">
              {treatmentQueue.map((pat) => {
                const isSelected = pat.id === selectedPatientId;
                const pendingCount = pat.medications.filter((m) => m.status !== "administered").length;

                return (
                  <div
                    key={pat.id}
                    onClick={() => {
                      if (pat.id !== selectedPatientId) resetForm();
                      setSelectedPatientId(pat.id);
                      const firstPending = pat.medications.find((m) => m.status !== "administered");
                      if (firstPending) setSelectedMedId(firstPending.id);
                    }}
                    className={`p-3.5 border cursor-pointer transition-colors text-xs ${
                      isSelected
                        ? "bg-brand-light border-brand"
                        : "bg-white border-paper-border hover:bg-paper-warm"
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <span className="font-mono text-[10px] text-charcoal-muted block">
                          {pat.hospitalNumber}
                        </span>
                        <span className="font-serif font-bold text-charcoal text-sm">
                          {pat.fullName}
                        </span>
                      </div>
                      <span className="text-[10px] font-mono px-1.5 py-0.2 bg-paper border border-paper-border text-charcoal">
                        {pat.age}y &bull; {pat.gender[0]}
                      </span>
                    </div>

                    <div className="mt-2 text-[11px] font-mono flex items-center gap-2">
                      <span className={`px-1.5 py-0.2 border ${
                        pendingCount > 0 ? "bg-terracotta-light text-terracotta border-terracotta-border font-bold" : "bg-white border-paper-border text-charcoal-muted"
                      }`}>
                        {pendingCount} Pending Injection(s)
                      </span>
                    </div>

                    <div className="mt-2.5 pt-2 border-t border-paper-border/60 flex items-center justify-between">
                      <span className="text-[10px] text-charcoal-subtle">
                        Current Loc: {pat.currentDepartment}
                      </span>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onOpenDossier(pat);
                        }}
                        className="text-[10px] font-mono underline text-charcoal hover:text-brand"
                      >
                        Chart &rarr;
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Right: Active Administration Workbench */}
        <div className="lg:col-span-8">
          {selectedPatient ? (
            <div className="bg-white border border-paper-border p-5 sm:p-6 space-y-5">
              <div className="flex flex-wrap items-start justify-between border-b border-paper-border pb-3 gap-2">
                <div>
                  <span className="font-mono text-[10px] uppercase text-brand font-bold block">
                    Active Medication Administration:
                  </span>
                  <h3 className="font-serif text-lg font-bold text-charcoal">
                    {selectedPatient.fullName}
                  </h3>
                  <div className="text-xs text-charcoal-muted font-mono">
                    {selectedPatient.hospitalNumber} &bull; {selectedPatient.age}y ({selectedPatient.gender})
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => onOpenTransfer(selectedPatient)}
                    className="px-2.5 py-1 text-xs border border-paper-border hover:border-brand bg-paper flex items-center gap-1"
                  >
                    <ArrowRightLeft className="w-3.5 h-3.5 text-brand" />
                    <span>Transfer Patient</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleDirectDischarge}
                    className="px-2.5 py-1 text-xs bg-brand text-paper hover:bg-brand-hover flex items-center gap-1"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5 text-brand-light" />
                    <span>Discharge Home</span>
                  </button>
                </div>
              </div>

              {/* Medication Selection */}
              <div className="space-y-2">
                <span className="font-mono text-[11px] uppercase tracking-wider text-amber-300 font-bold block">
                  Prescribed Pharmacotherapy to Administer:
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {selectedPatient.medications.map((m) => {
                    const isSelected = m.id === selectedMedId;
                    return (
                      <button
                        key={m.id}
                        type="button"
                        onClick={() => setSelectedMedId(m.id)}
                        className={`p-3 text-left border transition-colors flex flex-col justify-between ${
                          isSelected
                            ? "bg-brand-light border-brand"
                            : "bg-white border-paper-border hover:bg-paper-warm"
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-serif font-bold text-xs text-charcoal">
                            {m.drugName} ({m.dosage})
                          </span>
                          <span className={`text-[10px] font-mono px-1.5 py-0.2 border ${
                            m.status === "administered" ? "bg-white text-brand border-brand font-bold" : "bg-terracotta-light text-terracotta border-terracotta-border font-bold"
                          }`}>
                            {m.status === "administered" ? "Given" : "Awaiting Injection"}
                          </span>
                        </div>
                        <span className="text-[10px] text-charcoal-muted font-mono mt-1">
                          Route: <strong>{m.route}</strong> &bull; By {m.doctorName}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {activeMed && activeMed.status !== "administered" ? (
                <form onSubmit={handleAdminister} className="space-y-4 text-xs pt-2 border-t border-paper-border">
                  <div className="p-3 bg-paper-warm border border-paper-border space-y-1">
                    <span className="font-mono text-[10px] uppercase font-bold text-charcoal block">
                      Administering: {activeMed.drugName} ({activeMed.dosage}) — [{activeMed.route}]
                    </span>
                    <p className="text-charcoal-muted text-[11px]">
                      Instructions: {activeMed.instructions || activeMed.frequency}
                    </p>
                  </div>

                  {/* Injection Site */}
                  <div className="space-y-1.5">
                    <label className="block font-mono text-[10px] uppercase text-charcoal font-semibold">
                      Anatomical Administration Site / Route *
                    </label>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
                      {COMMON_SITES.map((site) => (
                        <button
                          key={site}
                          type="button"
                          onClick={() => setInjectionSite(site)}
                          className={`p-2 text-left border text-xs transition-colors ${
                            injectionSite === site
                              ? "bg-brand text-paper border-brand font-bold"
                              : "bg-white border-paper-border hover:bg-paper-warm text-charcoal"
                          }`}
                        >
                          <span className="font-mono text-[11px] block">{site}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Nursing Progress Note */}
                  <div className="space-y-1">
                    <label className="block font-mono text-[10px] uppercase text-charcoal font-semibold">
                      Nursing Administration & Observation Note *
                    </label>
                    <textarea
                      required
                      rows={3}
                      value={nurseNotes}
                      onChange={(e) => setNurseNotes(e.target.value)}
                      placeholder="e.g. Dose administered. Patient observed for 30 minutes without adverse reaction. Vital signs re-checked and stable..."
                      className="w-full p-2.5 bg-paper-warm border border-paper-border focus:border-brand text-charcoal font-sans"
                    />
                  </div>

                  {/* Flexible Routing Post Injection */}
                  <div className="p-3.5 bg-paper border border-paper-border space-y-2">
                    <label className="block font-mono text-[10px] uppercase text-charcoal font-semibold">
                      Route Patient Post-Administration:
                    </label>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                      {[
                        { dept: "DISCHARGED" as Department, name: "Discharge Home (Outpatient)", reason: "Treatment completed; vital signs stable. Patient discharged home." },
                        { dept: "CONSULTATION" as Department, name: "Back to Doctor (Review)", reason: "Post-injection clinical review requested by Physician." },
                        { dept: "WARD" as Department, name: "Inpatient Ward (Admission)", reason: "Transferred to Inpatient Ward for ongoing observation." },
                        { dept: "TRIAGE" as Department, name: "Triage (Post-Treatment Vitals)", reason: "Routine post-treatment vital signs re-assessment." },
                      ].map((d) => (
                        <button
                          key={d.dept}
                          type="button"
                          onClick={() => {
                            setNextStation(d.dept);
                            setRoutingReason(d.reason);
                          }}
                          className={`p-2 text-left border text-xs ${
                            nextStation === d.dept
                              ? "bg-brand text-paper border-brand font-bold"
                              : "bg-white border-paper-border hover:bg-paper-warm text-charcoal"
                          }`}
                        >
                          <span className="font-serif text-xs block">{d.name}</span>
                        </button>
                      ))}
                    </div>

                    <input
                      type="text"
                      value={routingReason}
                      onChange={(e) => setRoutingReason(e.target.value)}
                      className="w-full p-2 bg-white border border-paper-border text-xs text-charcoal font-sans"
                    />
                  </div>

                  <div className="flex justify-end pt-2 border-t border-paper-border">
                    <button
                      type="submit"
                      disabled={submitting}
                      className="px-6 py-2.5 bg-brand hover:bg-brand-hover text-paper text-xs font-semibold flex items-center gap-2 border border-brand transition-colors"
                    >
                      <ShieldCheck className="w-4 h-4" />
                      <span>{submitting ? "Signing Administration..." : "Verify Injection & Route Patient"}</span>
                    </button>
                  </div>
                </form>
              ) : activeMed && activeMed.status === "administered" ? (
                <div className="p-4 bg-brand-light border border-brand text-xs space-y-2">
                  <div className="flex items-center gap-2 text-brand font-bold">
                    <Check className="w-4 h-4" />
                    <span>Medication already administered by Nurse {activeMed.nurseName}.</span>
                  </div>
                  <p className="text-charcoal font-mono text-[11px]">
                    Site: {activeMed.injectionSite} &bull; Time: {new Date(activeMed.timestampAdministered || "").toLocaleTimeString()}
                  </p>
                  <p className="text-charcoal-muted text-xs">
                    Progress Note: {activeMed.nurseNotes}
                  </p>
                </div>
              ) : (
                <div className="p-8 text-center text-charcoal-muted bg-paper-warm border border-paper-border text-xs">
                  No pending injections. Patient has either received all medications or none were prescribed.
                </div>
              )}
            </div>
          ) : (
            <div className="p-12 text-center text-charcoal-muted bg-white border border-paper-border text-xs">
              Select a patient from the queue to dispense and administer prescribed medication.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
