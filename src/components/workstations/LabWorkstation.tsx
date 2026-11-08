"use client";

import React, { useState } from "react";
import { useEMR } from "@/context/EMRContext";
import { Patient, Department, LabOrder } from "@/types/emr";
import { FlaskConical, Check, ArrowRightLeft, AlertCircle } from "lucide-react";

interface LabWorkstationProps {
  onOpenDossier: (patient: Patient) => void;
  onOpenTransfer: (patient: Patient) => void;
}

export function LabWorkstation({
  onOpenDossier,
  onOpenTransfer,
}: LabWorkstationProps) {
  const { patients, completeLabOrder, activeStaffName } = useEMR();

  // Only patients currently at the LABORATORY station
  const labQueue = patients.filter((p) => p.currentDepartment === "LABORATORY" && p.status === "Active");

  const [selectedPatientId, setSelectedPatientId] = useState<string>(
    labQueue[0]?.id || ""
  );
  // Only patients still in the lab queue can be open on this screen
  const selectedPatient = labQueue.find((p) => p.id === selectedPatientId);

  const pendingOrders = selectedPatient?.labOrders.filter((lo) => lo.status !== "completed") || [];
  const [selectedOrderId, setSelectedOrderId] = useState<string>(pendingOrders[0]?.id || "");

  // Results form state
  const [findings, setFindings] = useState("");
  const [quantitative, setQuantitative] = useState("");
  const [refRange, setRefRange] = useState("");
  const [comments, setComments] = useState("");
  const [routeToDept, setRouteToDept] = useState<Department>("CONSULTATION");
  const [routingReason, setRoutingReason] = useState(
    "Laboratory test completed & validated; patient results routed back to Physician."
  );
  const [submitting, setSubmitting] = useState(false);

  const activeOrder = selectedPatient?.labOrders.find((lo) => lo.id === selectedOrderId);

  const resetForm = () => {
    setFindings("");
    setQuantitative("");
    setRefRange("");
    setComments("");
    setSelectedOrderId("");
    setRouteToDept("CONSULTATION");
    setRoutingReason("Laboratory test completed & validated; patient results routed back to Physician.");
  };

  React.useEffect(() => {
    if (selectedPatientId && !labQueue.some((p) => p.id === selectedPatientId)) {
      setSelectedPatientId("");
      resetForm();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [labQueue.map((p) => p.id).join("|"), selectedPatientId]);

  // Auto populate typical test suggestions
  const handleSelectOrder = (order: LabOrder) => {
    setSelectedOrderId(order.id);
    if (order.testName.includes("Malaria")) {
      setFindings("POSITIVE (+++). Numerous trophozoites of Plasmodium falciparum observed.");
      setQuantitative("3+ (Heavy parasitemia, ~25,000 parasites/uL)");
      setRefRange("Negative");
      setComments("Schuffner stippling noted. Urgent antimalarial therapy indicated.");
    } else if (order.testName.includes("Blood Sugar")) {
      setFindings("Euglycemic fasting profile.");
      setQuantitative("94 mg/dL (5.2 mmol/L)");
      setRefRange("70 - 100 mg/dL");
      setComments("Normal metabolic parameters.");
    } else if (order.testName.includes("Full Blood Count") || order.testName.includes("FBC")) {
      setFindings("Mild normocytic normochromic anemia. Normal leukocyte differential.");
      setQuantitative("PCV: 33%, Hb: 11.0 g/dL, WBC: 5.8 x 10^9/L, Platelets: 180 x 10^9/L");
      setRefRange("PCV: 36 - 48%, Platelets: 150 - 450 x 10^9/L");
      setComments("Adequate platelet counts.");
    } else {
      setFindings("");
      setQuantitative("");
      setRefRange("");
      setComments("");
    }
  };

  const handleCompleteLab = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPatient || !selectedOrderId) return;

    setSubmitting(true);
    await completeLabOrder(
      selectedPatient.id,
      selectedOrderId,
      findings,
      quantitative,
      refRange,
      comments,
      routeToDept,
      routingReason
    );
    setSubmitting(false);

    // Result sent: clear the form and the screen
    resetForm();
    setSelectedPatientId("");
  };

  return (
    <div className="space-y-6">
      {/* Title */}
      <div className="bg-white border border-paper-border p-4 sm:p-5 flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <FlaskConical className="w-5 h-5 text-brand" />
            <h2 className="font-serif text-lg sm:text-xl font-bold text-charcoal">
              Medical Laboratory Services (MLS) Workbench
            </h2>
          </div>
          <p className="hidden sm:block text-xs text-charcoal-muted mt-0.5">
            Process specimen requisitions, enter qualitative & quantitative diagnostic parameters, and transmit validated reports.
          </p>
        </div>
        <div className="font-mono text-xs px-2.5 py-1 bg-paper-warm border border-paper-border text-charcoal">
          Lab Station Queue: <strong>{labQueue.length}</strong> patient(s) active
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Queue */}
        <div className="lg:col-span-4 space-y-3">
          <div className="flex items-center justify-between border-b border-paper-border pb-1">
            <span className="font-mono text-[11px] uppercase tracking-wider text-amber-300 font-bold">
              Laboratory Patients ({labQueue.length})
            </span>
          </div>

          {labQueue.length === 0 ? (
            <div className="p-8 text-center text-charcoal-muted bg-white border border-paper-border text-xs">
              No pending laboratory orders or specimen requests.
            </div>
          ) : (
            <div className="space-y-2">
              {labQueue.map((pat) => {
                const isSelected = pat.id === selectedPatientId;
                const pending = pat.labOrders.filter((lo) => lo.status !== "completed").length;
                const completed = pat.labOrders.filter((lo) => lo.status === "completed").length;

                return (
                  <div
                    key={pat.id}
                    onClick={() => {
                      if (pat.id !== selectedPatientId) resetForm();
                      setSelectedPatientId(pat.id);
                      const firstPending = pat.labOrders.find((lo) => lo.status !== "completed");
                      if (firstPending) handleSelectOrder(firstPending);
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
                      <span className={`px-1.5 py-0.2 border ${pending > 0 ? "bg-amber-light text-amber-alert border-amber-border font-bold" : "bg-white border-paper-border text-charcoal-muted"}`}>
                        {pending} Pending Order(s)
                      </span>
                      {completed > 0 && (
                        <span className="text-brand font-medium">
                          &bull; {completed} Done
                        </span>
                      )}
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

        {/* Right: Active Test Processing */}
        <div className="lg:col-span-8">
          {selectedPatient ? (
            <div className="bg-white border border-paper-border p-5 sm:p-6 space-y-5">
              <div className="flex flex-wrap items-start justify-between border-b border-paper-border pb-3 gap-2">
                <div>
                  <span className="font-mono text-[10px] uppercase text-brand font-bold block">
                    Diagnostic Pathology Specimen Accession:
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
                    onClick={() => onOpenDossier(selectedPatient)}
                    className="px-2.5 py-1 text-xs border border-paper-border hover:border-brand bg-paper"
                  >
                    Chart
                  </button>
                </div>
              </div>

              {/* Order Selection Pill */}
              <div className="space-y-2">
                <span className="font-mono text-[11px] uppercase tracking-wider text-amber-300 font-bold block">
                  Select Investigation to Process:
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {selectedPatient.labOrders.map((lo) => {
                    const isSelected = lo.id === selectedOrderId;
                    return (
                      <button
                        key={lo.id}
                        type="button"
                        onClick={() => handleSelectOrder(lo)}
                        className={`p-3 text-left border transition-colors flex flex-col justify-between ${
                          isSelected
                            ? "bg-brand-light border-brand"
                            : "bg-white border-paper-border hover:bg-paper-warm"
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-serif font-bold text-xs text-charcoal">
                            {lo.testName}
                          </span>
                          <span className={`text-[10px] font-mono px-1.5 py-0.2 border ${
                            lo.status === "completed" ? "bg-white text-brand border-brand font-bold" : "bg-amber-light text-amber-alert border-amber-border"
                          }`}>
                            {lo.status === "completed" ? "Done" : "Pending"}
                          </span>
                        </div>
                        <span className="text-[10px] text-charcoal-muted font-mono mt-1">
                          Ordered by: {lo.doctorName} ({lo.priority.toUpperCase()})
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {activeOrder && activeOrder.status !== "completed" ? (
                <form onSubmit={handleCompleteLab} className="space-y-4 text-xs pt-2 border-t border-paper-border">
                  <div className="p-3 bg-paper-warm border border-paper-border space-y-1">
                    <span className="font-mono text-[10px] uppercase font-bold text-charcoal block">
                      Investigation in Progress: {activeOrder.testName}
                    </span>
                    <p className="text-charcoal-muted text-[11px]">
                      Clinical Indication: {activeOrder.clinicalIndication}
                    </p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="sm:col-span-2">
                      <label className="block font-mono text-[10px] uppercase text-charcoal-muted mb-1">
                        Qualitative Findings / Microscopic Morphology *
                      </label>
                      <textarea
                        required
                        rows={2}
                        value={findings}
                        onChange={(e) => setFindings(e.target.value)}
                        placeholder="e.g. POSITIVE (+++). Ring-form trophozoites of Plasmodium falciparum seen in RBCs..."
                        className="w-full p-2 bg-paper-warm border border-paper-border focus:border-brand text-charcoal font-sans"
                      />
                    </div>

                    <div>
                      <label className="block font-mono text-[10px] uppercase text-charcoal-muted mb-1">
                        Quantitative Measurement / Numerical Value
                      </label>
                      <input
                        type="text"
                        value={quantitative}
                        onChange={(e) => setQuantitative(e.target.value)}
                        placeholder="e.g. 3+ (~25,000 parasites/uL) or PCV: 33%"
                        className="w-full p-2 bg-paper-warm border border-paper-border focus:border-brand text-charcoal font-mono font-bold"
                      />
                    </div>

                    <div>
                      <label className="block font-mono text-[10px] uppercase text-charcoal-muted mb-1">
                        Normal Reference Interval
                      </label>
                      <input
                        type="text"
                        value={refRange}
                        onChange={(e) => setRefRange(e.target.value)}
                        placeholder="e.g. Negative or 40 - 52%"
                        className="w-full p-2 bg-paper-warm border border-paper-border focus:border-brand text-charcoal font-mono"
                      />
                    </div>

                    <div className="sm:col-span-2">
                      <label className="block font-mono text-[10px] uppercase text-charcoal-muted mb-1">
                        Laboratory Scientist Clinical Comments & Remarks
                      </label>
                      <input
                        type="text"
                        value={comments}
                        onChange={(e) => setComments(e.target.value)}
                        placeholder="e.g. Critical high parasitemia alert communicated to physician."
                        className="w-full p-2 bg-paper-warm border border-paper-border focus:border-brand text-charcoal font-sans"
                      />
                    </div>
                  </div>

                  {/* Flexible Routing after Lab Results */}
                  <div className="p-3.5 bg-paper border border-paper-border space-y-2">
                    <label className="block font-mono text-[10px] uppercase text-charcoal font-semibold">
                      Route Patient Upon Lab Validation:
                    </label>
                    <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                      {[
                        { dept: "CONSULTATION" as Department, name: "Back to Doctor (Standard)", reason: "Specimen analysis validated; patient routed back to Doctor for review." },
                        { dept: "RADIOLOGY" as Department, name: "Send for Imaging (Radiology)", reason: "Laboratory work completed; patient referred to Radiology for imaging." },
                        { dept: "TREATMENT" as Department, name: "Direct to Pharmacy", reason: "Direct transfer to Pharmacy for medication." },
                        { dept: "WARD" as Department, name: "Inpatient Ward", reason: "Direct transfer to Inpatient Ward." },
                        { dept: "RECEPTION" as Department, name: "Front Desk (Outpatient Wait)", reason: "Patient waiting at Reception for printed results." },
                      ].map((d) => (
                        <button
                          key={d.dept}
                          type="button"
                          onClick={() => {
                            setRouteToDept(d.dept);
                            setRoutingReason(d.reason);
                          }}
                          className={`p-2 text-left border text-xs ${
                            routeToDept === d.dept
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
                      className="w-full p-2 bg-white border border-paper-border text-xs text-charcoal"
                    />
                  </div>

                  <div className="flex justify-end pt-2 border-t border-paper-border">
                    <button
                      type="submit"
                      disabled={submitting}
                      className="px-6 py-2.5 bg-brand hover:bg-brand-hover text-paper text-xs font-semibold flex items-center gap-2 border border-brand transition-colors"
                    >
                      <Check className="w-4 h-4" />
                      <span>{submitting ? "Validating Report..." : "Validate Lab Result & Route Patient"}</span>
                    </button>
                  </div>
                </form>
              ) : activeOrder && activeOrder.status === "completed" ? (
                <div className="p-4 bg-brand-light border border-brand text-xs space-y-2">
                  <div className="flex items-center gap-2 text-brand font-bold">
                    <Check className="w-4 h-4" />
                    <span>Report already validated and published on patient chart.</span>
                  </div>
                  <p className="text-charcoal font-serif">
                    Findings: <strong>{activeOrder.resultFindings}</strong> ({activeOrder.quantitativeValue})
                  </p>
                  <p className="text-charcoal-muted text-[11px] font-mono">
                    Signed off by {activeOrder.scientistName} on {new Date(activeOrder.timestampCompleted || "").toLocaleTimeString()}
                  </p>
                </div>
              ) : (
                <div className="p-8 text-center text-charcoal-muted bg-paper-warm border border-paper-border text-xs">
                  Please select an investigation from the list above to input results.
                </div>
              )}
            </div>
          ) : (
            <div className="p-12 text-center text-charcoal-muted bg-white border border-paper-border text-xs">
              Select a patient from the queue to conduct diagnostic lab specimen analysis.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
