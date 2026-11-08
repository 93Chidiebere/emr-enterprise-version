"use client";

import React, { useState } from "react";
import { useEMR } from "@/context/EMRContext";
import { Patient, Department, RadiologyOrder } from "@/types/emr";
import { Scan, Check, ArrowRightLeft } from "lucide-react";

interface RadiologyWorkstationProps {
  onOpenDossier: (patient: Patient) => void;
  onOpenTransfer: (patient: Patient) => void;
}

export function RadiologyWorkstation({
  onOpenDossier,
  onOpenTransfer,
}: RadiologyWorkstationProps) {
  const { patients, completeRadiologyOrder } = useEMR();

  // Only patients currently at the RADIOLOGY station
  const radQueue = patients.filter((p) => p.currentDepartment === "RADIOLOGY" && p.status === "Active");

  const [selectedPatientId, setSelectedPatientId] = useState<string>(
    radQueue[0]?.id || ""
  );
  // Only patients still in the radiology queue can be open on this screen
  const selectedPatient = radQueue.find((p) => p.id === selectedPatientId);

  const pendingOrders = selectedPatient?.radiologyOrders.filter((ro) => ro.status !== "completed") || [];
  const [selectedOrderId, setSelectedOrderId] = useState<string>(pendingOrders[0]?.id || "");

  const [findings, setFindings] = useState("");
  const [impression, setImpression] = useState("");
  const [routeToDept, setRouteToDept] = useState<Department>("CONSULTATION");
  const [routingReason, setRoutingReason] = useState(
    "Diagnostic imaging study finalized; radiological report routed back to Physician."
  );
  const [submitting, setSubmitting] = useState(false);

  const activeOrder = selectedPatient?.radiologyOrders.find((ro) => ro.id === selectedOrderId);

  const resetForm = () => {
    setFindings("");
    setImpression("");
    setSelectedOrderId("");
    setRouteToDept("CONSULTATION");
    setRoutingReason("Diagnostic imaging study finalized; radiological report routed back to Physician.");
  };

  React.useEffect(() => {
    if (selectedPatientId && !radQueue.some((p) => p.id === selectedPatientId)) {
      setSelectedPatientId("");
      resetForm();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [radQueue.map((p) => p.id).join("|"), selectedPatientId]);

  const handleSelectOrder = (order: RadiologyOrder) => {
    setSelectedOrderId(order.id);
    if (order.studyType.includes("Chest")) {
      setFindings(
        "Lungs: Bilateral lung fields show prominent bronchovascular markings with mild peribronchial cuffing. No lobar consolidation, pneumothorax, or pleural effusion noted.\nHeart: Cardiac silhouette is mildly enlarged with CTR ~0.54. Aortic arch is intact.\nBony Cage: Visualized thoracic cage and ribs appear intact."
      );
      setImpression("Mild cardiomegaly with peribronchial thickening. No acute pulmonary edema.");
    } else if (order.studyType.includes("Abdominal") || order.studyType.includes("Ultrasound")) {
      setFindings(
        "Liver: Normal in size and acoustic parenchymal pattern. No focal mass lesion.\nGallbladder: Well-distended with thin, smooth walls. No intraluminal calculi.\nKidneys: Both kidneys demonstrate normal bipolar diameter and intact corticomedullary differentiation.\nSpleen: Mildly enlarged measuring 13.4cm in bipolar length."
      );
      setImpression("Mild splenomegaly consistent with active febrile illness. Normal hepatobiliary architecture.");
    } else {
      setFindings("");
      setImpression("");
    }
  };

  const handleCompleteRad = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPatient || !selectedOrderId) return;

    setSubmitting(true);
    await completeRadiologyOrder(
      selectedPatient.id,
      selectedOrderId,
      findings,
      impression,
      routeToDept,
      routingReason
    );
    setSubmitting(false);

    // Report sent: clear the form and the screen
    resetForm();
    setSelectedPatientId("");
  };

  return (
    <div className="space-y-6">
      {/* Title */}
      <div className="bg-white border border-paper-border p-4 sm:p-5 flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <Scan className="w-5 h-5 text-brand" />
            <h2 className="font-serif text-lg sm:text-xl font-bold text-charcoal">
              Radiology & Diagnostic Imaging Suite
            </h2>
          </div>
          <p className="hidden sm:block text-xs text-charcoal-muted mt-0.5">
            Conduct radiographic scans, compile anatomical observations and diagnostic radiological impressions.
          </p>
        </div>
        <div className="font-mono text-xs px-2.5 py-1 bg-paper-warm border border-paper-border text-charcoal">
          Radiology Queue: <strong>{radQueue.length}</strong> patient(s)
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Queue */}
        <div className="lg:col-span-4 space-y-3">
          <div className="flex items-center justify-between border-b border-paper-border pb-1">
            <span className="font-mono text-[11px] uppercase tracking-wider text-amber-300 font-bold">
              Imaging Requests ({radQueue.length})
            </span>
          </div>

          {radQueue.length === 0 ? (
            <div className="p-8 text-center text-charcoal-muted bg-white border border-paper-border text-xs">
              No pending imaging requests in Radiology.
            </div>
          ) : (
            <div className="space-y-2">
              {radQueue.map((pat) => {
                const isSelected = pat.id === selectedPatientId;
                const pending = pat.radiologyOrders.filter((ro) => ro.status !== "completed").length;

                return (
                  <div
                    key={pat.id}
                    onClick={() => {
                      if (pat.id !== selectedPatientId) resetForm();
                      setSelectedPatientId(pat.id);
                      const firstPending = pat.radiologyOrders.find((ro) => ro.status !== "completed");
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

                    <div className="mt-2 text-[11px] font-mono">
                      <span className="px-1.5 py-0.2 bg-amber-light text-amber-alert border border-amber-border font-bold">
                        {pending} Pending Scan(s)
                      </span>
                    </div>

                    <div className="mt-2.5 pt-2 border-t border-paper-border/60 flex items-center justify-between">
                      <span className="text-[10px] text-charcoal-subtle">
                        Location: {pat.currentDepartment}
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

        {/* Right: Imaging Form */}
        <div className="lg:col-span-8">
          {selectedPatient ? (
            <div className="bg-white border border-paper-border p-5 sm:p-6 space-y-5">
              <div className="flex flex-wrap items-start justify-between border-b border-paper-border pb-3 gap-2">
                <div>
                  <span className="font-mono text-[10px] uppercase text-brand font-bold block">
                    Diagnostic Imaging Interpretation:
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

              {/* Study Selection */}
              <div className="space-y-2">
                <span className="font-mono text-[11px] uppercase tracking-wider text-amber-300 font-bold block">
                  Select Study to Interpret:
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {selectedPatient.radiologyOrders.map((ro) => {
                    const isSelected = ro.id === selectedOrderId;
                    return (
                      <button
                        key={ro.id}
                        type="button"
                        onClick={() => handleSelectOrder(ro)}
                        className={`p-3 text-left border transition-colors flex flex-col justify-between ${
                          isSelected
                            ? "bg-brand-light border-brand"
                            : "bg-white border-paper-border hover:bg-paper-warm"
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-serif font-bold text-xs text-charcoal">
                            {ro.studyType}
                          </span>
                          <span className={`text-[10px] font-mono px-1.5 py-0.2 border ${
                            ro.status === "completed" ? "bg-white text-brand border-brand font-bold" : "bg-amber-light text-amber-alert border-amber-border"
                          }`}>
                            {ro.status === "completed" ? "Done" : "Pending"}
                          </span>
                        </div>
                        <span className="text-[10px] text-charcoal-muted font-mono mt-1">
                          Ordered by: {ro.doctorName}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {activeOrder && activeOrder.status !== "completed" ? (
                <form onSubmit={handleCompleteRad} className="space-y-4 text-xs pt-2 border-t border-paper-border">
                  <div className="p-3 bg-paper-warm border border-paper-border space-y-1">
                    <span className="font-mono text-[10px] uppercase font-bold text-charcoal block">
                      Study: {activeOrder.studyType}
                    </span>
                    <p className="text-charcoal-muted text-[11px]">
                      Indication: {activeOrder.indication}
                    </p>
                  </div>

                  <div className="space-y-3">
                    <div>
                      <label className="block font-mono text-[10px] uppercase text-charcoal-muted mb-1">
                        Radiological Report Findings *
                      </label>
                      <textarea
                        required
                        rows={4}
                        value={findings}
                        onChange={(e) => setFindings(e.target.value)}
                        placeholder="Detailed anatomical observations across visualized tissue planes..."
                        className="w-full p-2 bg-paper-warm border border-paper-border focus:border-brand text-charcoal font-sans"
                      />
                    </div>

                    <div>
                      <label className="block font-mono text-[10px] uppercase text-brand font-bold mb-1">
                        Radiological Impression & Diagnostic Conclusion *
                      </label>
                      <textarea
                        required
                        rows={2}
                        value={impression}
                        onChange={(e) => setImpression(e.target.value)}
                        placeholder="e.g. Mild cardiomegaly without acute pulmonary edema..."
                        className="w-full p-2 bg-paper-warm border border-paper-border focus:border-brand text-charcoal font-serif font-bold"
                      />
                    </div>
                  </div>

                  {/* Flexible Routing */}
                  <div className="p-3.5 bg-paper border border-paper-border space-y-2">
                    <label className="block font-mono text-[10px] uppercase text-charcoal font-semibold">
                      Route Patient Post-Imaging:
                    </label>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                      {[
                        { dept: "CONSULTATION" as Department, name: "Back to Doctor (Review)", reason: "Imaging completed; report sent to Physician." },
                        { dept: "WARD" as Department, name: "Inpatient Ward", reason: "Direct transfer back to Inpatient Ward." },
                        { dept: "TREATMENT" as Department, name: "Pharmacy", reason: "Direct transfer to Pharmacy." },
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
                      <span>{submitting ? "Signing Scan Report..." : "Publish Imaging Report & Route Patient"}</span>
                    </button>
                  </div>
                </form>
              ) : activeOrder && activeOrder.status === "completed" ? (
                <div className="p-4 bg-brand-light border border-brand text-xs space-y-2">
                  <div className="flex items-center gap-2 text-brand font-bold">
                    <Check className="w-4 h-4" />
                    <span>Report finalized by Radiographer {activeOrder.radiographerName}.</span>
                  </div>
                  <p className="text-charcoal font-serif">
                    Impression: <strong>{activeOrder.impression}</strong>
                  </p>
                </div>
              ) : (
                <div className="p-8 text-center text-charcoal-muted bg-paper-warm border border-paper-border text-xs">
                  Please select an imaging study from above.
                </div>
              )}
            </div>
          ) : (
            <div className="p-12 text-center text-charcoal-muted bg-white border border-paper-border text-xs">
              Select a patient from the queue to review imaging.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
