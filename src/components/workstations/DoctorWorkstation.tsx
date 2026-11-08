"use client";

import React, { useState } from "react";
import { useEMR } from "@/context/EMRContext";
import { Patient, Department, LabOrder, RadiologyOrder, MedicationAdministration, Icd10Code } from "@/types/emr";
import { Icd10Picker } from "@/components/shared/Icd10Picker";
import { Stethoscope, FlaskConical, Syringe, Check, ArrowRightLeft, Plus, Trash2 } from "lucide-react";

interface DoctorWorkstationProps {
  onOpenDossier: (patient: Patient) => void;
  onOpenTransfer: (patient: Patient) => void;
}

const COMMON_LAB_TESTS = [
  "Malaria Parasite (MP) by Giemsa Microscopy",
  "Full Blood Count (FBC / CBC)",
  "Fasting Blood Sugar (FBS)",
  "Random Blood Sugar (RBS)",
  "Urinalysis (Dipstick & Microscopy)",
  "Widal Agglutination Reaction",
  "Electrolytes, Urea & Creatinine (E/U/Cr)",
  "Lipid Profile Panel",
  "High-Sensitivity Cardiac Troponin I (hs-cTnI)",
  "Stool Microscopy & Occult Blood",
];

const COMMON_IMAGING = [
  "Chest X-Ray (Erect PA View)",
  "Abdominal Ultrasound (Abdomino-Pelvic)",
  "Pelvic Ultrasound (Obstetric / Gynecologic)",
  "Lumbar Spine X-Ray (AP & Lateral)",
  "Plain Abdominal X-Ray (Supine / Erect)",
];

const COMMON_MEDICATIONS = [
  { name: "IV Artesunate", dose: "120 mg", route: "IV" as const, freq: "Stat dose now, repeat at 12h, 24h" },
  { name: "IM Diclofenac", dose: "75 mg", route: "IM" as const, freq: "Stat dose deep intragluteal" },
  { name: "IV Ceftriaxone", dose: "1 g", route: "IV" as const, freq: "Stat dose in 100ml Normal Saline" },
  { name: "IV Pantoprazole", dose: "40 mg", route: "IV" as const, freq: "Stat dose slow IV push" },
  { name: "IM Hyoscine Butylbromide", dose: "20 mg", route: "IM" as const, freq: "Stat dose" },
  { name: "Oral Paracetamol", dose: "1000 mg", route: "Oral" as const, freq: "Stat dose, then tds x 3/7" },
  { name: "Oral Coartem (Artemether-Lumefantrine)", dose: "80/480 mg", route: "Oral" as const, freq: "1 tablet twice daily x 3 days with fatty meal" },
];

export function DoctorWorkstation({
  onOpenDossier,
  onOpenTransfer,
}: DoctorWorkstationProps) {
  const { patients, saveDoctorConsultation } = useEMR();
  const consultQueue = patients.filter(
    (p) => p.currentDepartment === "CONSULTATION" && p.status === "Active"
  );

  const [selectedPatientId, setSelectedPatientId] = useState<string>(
    consultQueue[0]?.id || ""
  );

  // Form State
  const [hpi, setHpi] = useState("");
  const [exam, setExam] = useState("");
  const [provisionalDx, setProvisionalDx] = useState("");
  const [definitiveDx, setDefinitiveDx] = useState("");
  const [provisionalIcd, setProvisionalIcd] = useState<Icd10Code | null>(null);
  const [definitiveIcd, setDefinitiveIcd] = useState<Icd10Code | null>(null);
  const [provisionalIcdError, setProvisionalIcdError] = useState("");
  const [definitiveIcdError, setDefinitiveIcdError] = useState("");
  const [clinicalPlan, setClinicalPlan] = useState("");

  // Orders State
  const [labOrders, setLabOrders] = useState<
    Omit<LabOrder, "id" | "timestampOrdered" | "doctorName" | "status">[]
  >([]);
  const [radiologyOrders, setRadiologyOrders] = useState<
    Omit<RadiologyOrder, "id" | "timestampOrdered" | "doctorName" | "status">[]
  >([]);
  const [imagingIndication, setImagingIndication] = useState("");
  const [customStudy, setCustomStudy] = useState("");
  const [imagingError, setImagingError] = useState("");
  const [medications, setMedications] = useState<
    Omit<MedicationAdministration, "id" | "timestampOrdered" | "doctorName" | "status">[]
  >([]);

  // Next Station
  const [targetDept, setTargetDept] = useState<Department>("LABORATORY");
  const [routingReason, setRoutingReason] = useState(
    "Referred to Medical Laboratory for urgent diagnostic investigations."
  );
  const [submitting, setSubmitting] = useState(false);

  // Only patients still waiting for consultation can be open on this screen
  const selectedPatient = consultQueue.find((p) => p.id === selectedPatientId);
  const latestVitals = selectedPatient?.vitalsHistory[0];

  const resetForm = () => {
    setHpi("");
    setExam("");
    setProvisionalDx("");
    setDefinitiveDx("");
    setProvisionalIcd(null);
    setDefinitiveIcd(null);
    setProvisionalIcdError("");
    setDefinitiveIcdError("");
    setClinicalPlan("");
    setLabOrders([]);
    setRadiologyOrders([]);
    setImagingIndication("");
    setCustomStudy("");
    setImagingError("");
    setMedications([]);
    setTargetDept("LABORATORY");
    setRoutingReason("Referred to Medical Laboratory for urgent diagnostic investigations.");
  };

  // Once the patient leaves the consultation queue, clear the screen and the form
  React.useEffect(() => {
    if (selectedPatientId && !consultQueue.some((p) => p.id === selectedPatientId)) {
      setSelectedPatientId("");
      resetForm();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [consultQueue.map((p) => p.id).join("|"), selectedPatientId]);

  const selectPatient = (id: string) => {
    if (id !== selectedPatientId) resetForm();
    setSelectedPatientId(id);
  };

  const handleAddLab = (testName: string) => {
    if (labOrders.some((l) => l.testName === testName)) return;
    setLabOrders([
      ...labOrders,
      {
        testName,
        priority: "urgent",
        clinicalIndication: provisionalDx || "Diagnostic workup in febrile/acute presentation",
      },
    ]);
    setTargetDept("LABORATORY");
    setRoutingReason(`Referred to Medical Laboratory (MLS) for ${testName}.`);
  };

  const handleAddImaging = (rawStudy: string) => {
    const studyType = rawStudy.trim();
    if (!studyType || radiologyOrders.some((r) => r.studyType === studyType)) return;
    setRadiologyOrders([
      ...radiologyOrders,
      {
        studyType,
        indication:
          imagingIndication.trim() || provisionalDx || "Diagnostic imaging to support the clinical diagnosis",
      },
    ]);
    setImagingError("");
    setTargetDept("RADIOLOGY");
    setRoutingReason(`Referred to Diagnostic Imaging for ${studyType}.`);
  };

  const handleRemoveImaging = (index: number) => {
    const remaining = radiologyOrders.filter((_, idx) => idx !== index);
    setRadiologyOrders(remaining);
    // If the last imaging request is removed, don't leave the patient routed to Radiology
    if (remaining.length === 0 && targetDept === "RADIOLOGY") {
      setTargetDept("LABORATORY");
      setRoutingReason("Referred to Medical Laboratory for urgent diagnostic investigations.");
    }
  };

  const handleAddMed = (med: typeof COMMON_MEDICATIONS[0]) => {
    setMedications([
      ...medications,
      {
        drugName: med.name,
        dosage: med.dose,
        route: med.route,
        frequency: med.freq,
        instructions: "Administer as prescribed under clinical nurse supervision.",
      },
    ]);
    if (med.route === "IV" || med.route === "IM") {
      setTargetDept("TREATMENT");
      setRoutingReason(`Transferred to Pharmacy for stat administration of ${med.name}.`);
    }
  };

  const handleSubmitConsult = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPatient) return;

    // ICD-10 coding is part of the documentation
    const missingProvisional = !provisionalIcd;
    const missingDefinitive = !!definitiveDx.trim() && !definitiveIcd;
    setProvisionalIcdError(missingProvisional ? "Select the ICD-10 code that matches the provisional diagnosis." : "");
    setDefinitiveIcdError(missingDefinitive ? "Select the ICD-10 code that matches the definitive diagnosis." : "");
    if (missingProvisional || missingDefinitive) return;

    // Routing to Radiology only makes sense with at least one imaging request
    if (targetDept === "RADIOLOGY" && radiologyOrders.length === 0) {
      setImagingError("Add at least one imaging request before routing the patient to Radiology.");
      return;
    }
    setImagingError("");

    setSubmitting(true);
    await saveDoctorConsultation(
      selectedPatient.id,
      {
        historyOfPresentIllness: hpi || "Patient reviewed in consultation room.",
        physicalExamFindings: exam || "General physical exam recorded.",
        provisionalDiagnosis: provisionalDx || "Clinical Evaluation Underway",
        provisionalIcd10: provisionalIcd || undefined,
        definitiveDiagnosis: definitiveDx || undefined,
        definitiveIcd10: definitiveIcd || undefined,
        clinicalPlan: clinicalPlan || "Continue diagnostic & therapeutic steps as ordered.",
      },
      labOrders,
      radiologyOrders,
      medications,
      targetDept,
      routingReason
    );
    setSubmitting(false);

    // Consultation complete: clear the form and the screen
    resetForm();
    setSelectedPatientId("");
  };

  return (
    <div className="space-y-6">
      {/* Title */}
      <div className="bg-white border border-paper-border p-4 sm:p-5 flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <Stethoscope className="w-5 h-5 text-brand" />
            <h2 className="font-serif text-lg sm:text-xl font-bold text-charcoal">
              Physician Consultation & Clinical Decision Station
            </h2>
          </div>
          <p className="hidden sm:block text-xs text-charcoal-muted mt-0.5">
            Evaluate triage vitals, review laboratory & imaging results, document and ICD-10 code diagnoses, and order treatment.
          </p>
        </div>
        <div className="font-mono text-xs px-2.5 py-1 bg-paper-warm border border-paper-border text-charcoal">
          Doctor Queue: <strong>{consultQueue.length}</strong> patient(s) waiting
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Queue */}
        <div className="lg:col-span-4 space-y-3">
          <div className="flex items-center justify-between border-b border-paper-border pb-1">
            <span className="font-mono text-[11px] uppercase tracking-wider text-amber-300 font-bold">
              Waiting for Doctor ({consultQueue.length})
            </span>
          </div>

          {consultQueue.length === 0 ? (
            <div className="p-8 text-center text-charcoal-muted bg-white border border-paper-border text-xs">
              No patients currently waiting for physician consultation.
            </div>
          ) : (
            <div className="space-y-2">
              {consultQueue.map((pat) => {
                const isSelected = pat.id === selectedPatientId;
                const vit = pat.vitalsHistory[0];
                const hasCompletedLabs = pat.labOrders.some((l) => l.status === "completed");

                return (
                  <div
                    key={pat.id}
                    onClick={() => selectPatient(pat.id)}
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

                    {/* Vitals Summary Pill */}
                    {vit && (
                      <div className="mt-2 text-[11px] font-mono p-1.5 bg-paper-warm border border-paper-border flex items-center justify-between">
                        <span>BP: {vit.bloodPressureSystolic}/{vit.bloodPressureDiastolic}</span>
                        <span className={vit.temperature >= 38.0 ? "text-terracotta font-bold" : ""}>
                          T: {vit.temperature}&deg;C
                        </span>
                        <span>SpO2: {vit.spO2}%</span>
                      </div>
                    )}

                    {hasCompletedLabs && (
                      <div className="mt-1.5 text-[10px] font-mono text-brand font-bold flex items-center gap-1">
                        &bull; Completed Lab Results Ready in Chart!
                      </div>
                    )}

                    <div className="mt-2.5 pt-2 border-t border-paper-border/60 flex items-center justify-between">
                      <span className="text-[10px] text-charcoal-muted line-clamp-1 max-w-[170px]">
                        {vit?.chiefComplaint || "Enrolled for doctor review"}
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

        {/* Right: Consultation Form */}
        <div className="lg:col-span-8">
          {selectedPatient ? (
            <div className="bg-white border border-paper-border p-5 sm:p-6 space-y-5">
              {/* Patient Top Summary Banner */}
              <div className="flex flex-wrap items-start justify-between border-b border-paper-border pb-3 gap-2">
                <div>
                  <span className="font-mono text-[10px] uppercase text-brand font-bold block">
                    Active Clinical Consultation:
                  </span>
                  <h3 className="font-serif text-lg font-bold text-charcoal">
                    {selectedPatient.fullName}
                  </h3>
                  <div className="text-xs text-charcoal-muted font-mono">
                    {selectedPatient.hospitalNumber} &bull; {selectedPatient.age}y ({selectedPatient.gender}) &bull; {selectedPatient.paymentType}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => onOpenTransfer(selectedPatient)}
                    className="px-2.5 py-1 text-xs border border-paper-border hover:border-brand bg-paper flex items-center gap-1"
                  >
                    <ArrowRightLeft className="w-3.5 h-3.5 text-brand" />
                    <span>Transfer Direct</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => onOpenDossier(selectedPatient)}
                    className="px-2.5 py-1 text-xs border border-paper-border hover:border-brand bg-paper"
                  >
                    Inspect Full Docket
                  </button>
                </div>
              </div>

              {/* Triage Vitals Preview Strip */}
              {latestVitals ? (
                <div className="p-3 bg-paper-warm border border-paper-border space-y-1.5 text-xs">
                  <div className="flex items-center justify-between text-[11px] font-mono">
                    <span className="font-semibold text-charcoal">Triage Vitals (Logged by {latestVitals.takenBy}):</span>
                    <span className="text-charcoal-muted">{new Date(latestVitals.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 font-mono text-center">
                    <div className="bg-white p-1.5 border border-paper-border">
                      <span className="text-[10px] text-charcoal-muted block">BP</span>
                      <strong>{latestVitals.bloodPressureSystolic}/{latestVitals.bloodPressureDiastolic}</strong>
                    </div>
                    <div className="bg-white p-1.5 border border-paper-border">
                      <span className="text-[10px] text-charcoal-muted block">Temp</span>
                      <strong className={latestVitals.temperature >= 38 ? "text-terracotta" : ""}>
                        {latestVitals.temperature}&deg;C
                      </strong>
                    </div>
                    <div className="bg-white p-1.5 border border-paper-border">
                      <span className="text-[10px] text-charcoal-muted block">Pulse</span>
                      <strong>{latestVitals.pulseRate} bpm</strong>
                    </div>
                    <div className="bg-white p-1.5 border border-paper-border">
                      <span className="text-[10px] text-charcoal-muted block">SpO2</span>
                      <strong className={latestVitals.spO2 < 95 ? "text-terracotta" : ""}>
                        {latestVitals.spO2}%
                      </strong>
                    </div>
                    <div className="bg-white p-1.5 border border-paper-border">
                      <span className="text-[10px] text-charcoal-muted block">BMI</span>
                      <strong>{latestVitals.bmi}</strong>
                    </div>
                  </div>
                  {latestVitals.chiefComplaint && (
                    <p className="text-charcoal text-xs pt-1 border-t border-paper-border/60">
                      <strong>Chief Complaint:</strong> {latestVitals.chiefComplaint}
                    </p>
                  )}
                </div>
              ) : (
                <div className="p-3 bg-amber-light border border-amber-border text-amber-alert text-xs">
                  Note: Patient bypassed Triage; no baseline vitals recorded yet.
                </div>
              )}

              {/* Lab Results Available Notice */}
              {selectedPatient.labOrders.length > 0 && (
                <div className="p-3 bg-paper border border-paper-border space-y-2 text-xs">
                  <span className="font-mono text-[10px] uppercase font-bold text-charcoal block">
                    Diagnostic Lab Status ({selectedPatient.labOrders.length} test ordered):
                  </span>
                  <div className="space-y-1.5">
                    {selectedPatient.labOrders.map((lo) => (
                      <div key={lo.id} className="p-2 bg-white border border-paper-border flex items-start justify-between">
                        <div>
                          <strong>{lo.testName}</strong>
                          {lo.resultFindings && (
                            <p className="text-xs text-charcoal font-serif mt-0.5">
                              Result: {lo.resultFindings} ({lo.quantitativeValue || ""})
                            </p>
                          )}
                        </div>
                        <span className={`text-[10px] font-mono px-1.5 py-0.2 border ${
                          lo.status === "completed" ? "bg-brand-light text-brand border-brand-border font-bold" : "bg-paper-warm text-charcoal-muted border-paper-border"
                        }`}>
                          {lo.status === "completed" ? "Validated" : "Pending"}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Imaging Requests & Results */}
              {selectedPatient.radiologyOrders.length > 0 && (
                <div className="p-3 bg-paper border border-paper-border space-y-2 text-xs">
                  <span className="font-mono text-[10px] uppercase font-bold text-charcoal block">
                    Imaging Status ({selectedPatient.radiologyOrders.length} {selectedPatient.radiologyOrders.length === 1 ? "study" : "studies"} requested):
                  </span>
                  <div className="space-y-1.5">
                    {selectedPatient.radiologyOrders.map((ro) => (
                      <div key={ro.id} className="p-2 bg-white border border-paper-border flex items-start justify-between gap-2">
                        <div>
                          <strong>{ro.studyType}</strong>
                          {ro.impression && (
                            <p className="text-xs text-charcoal font-serif mt-0.5">Impression: {ro.impression}</p>
                          )}
                        </div>
                        <span
                          className={`shrink-0 text-[10px] font-mono px-1.5 py-0.5 border ${
                            ro.status === "completed"
                              ? "bg-brand-light text-brand border-brand-border font-bold"
                              : "bg-paper-warm text-charcoal-muted border-paper-border"
                          }`}
                        >
                          {ro.status === "completed" ? "Reported" : "Pending"}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <form onSubmit={handleSubmitConsult} className="space-y-4 text-xs">
                {/* Clinical Notes Inputs */}
                <div className="space-y-3">
                  <h4 className="font-mono text-[11px] uppercase tracking-wider text-amber-300 font-bold border-b border-paper-border pb-1">
                    1. Physician Clinical Evaluation
                  </h4>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block font-mono text-[10px] uppercase text-charcoal-muted mb-1">
                        History of Present Illness (HPI)
                      </label>
                      <textarea
                        rows={3}
                        value={hpi}
                        onChange={(e) => setHpi(e.target.value)}
                        placeholder="e.g. 3-day history of intermittent high-grade fever, chills, vomiting x2, headache..."
                        className="w-full p-2 bg-paper-warm border border-paper-border focus:border-brand text-charcoal font-sans"
                      />
                    </div>

                    <div>
                      <label className="block font-mono text-[10px] uppercase text-charcoal-muted mb-1">
                        Physical Examination Findings
                      </label>
                      <textarea
                        rows={3}
                        value={exam}
                        onChange={(e) => setExam(e.target.value)}
                        placeholder="e.g. Febrile, mild pallor. Chest clear. Abdomen soft, mild splenomegaly..."
                        className="w-full p-2 bg-paper-warm border border-paper-border focus:border-brand text-charcoal font-sans"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block font-mono text-[10px] uppercase text-charcoal-muted mb-1">
                        Provisional / Working Diagnosis *
                      </label>
                      <input
                        required
                        type="text"
                        value={provisionalDx}
                        onChange={(e) => setProvisionalDx(e.target.value)}
                        placeholder="e.g. Severe Malaria vs Enteric Fever"
                        className="w-full p-2 bg-paper-warm border border-paper-border focus:border-brand text-charcoal font-serif font-bold"
                      />
                    </div>

                    <div>
                      <label className="block font-mono text-[10px] uppercase text-brand font-bold mb-1">
                        Definitive Diagnosis (Post-Lab / Imaging)
                      </label>
                      <input
                        type="text"
                        value={definitiveDx}
                        onChange={(e) => setDefinitiveDx(e.target.value)}
                        placeholder="e.g. Acute Plasmodium Falciparum Malaria (confirmed)"
                        className="w-full p-2 bg-paper-warm border border-paper-border focus:border-brand text-charcoal font-serif font-bold"
                      />
                    </div>
                  </div>

                  {/* ICD-10 medical coding */}
                  <div className="p-3 bg-brand-light/40 border border-brand-border space-y-2">
                    <p className="font-mono text-[10px] uppercase text-brand font-bold">
                      Medical Coding (ICD-10)
                    </p>
                    <p className="text-[11px] text-charcoal-muted">
                      Choose the most specific code that matches each diagnosis. Search by code or by word.
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <Icd10Picker
                        label="ICD-10 for Provisional Diagnosis"
                        required
                        value={provisionalIcd}
                        onChange={(v) => {
                          setProvisionalIcd(v);
                          if (v) setProvisionalIcdError("");
                        }}
                        error={provisionalIcdError}
                      />
                      <Icd10Picker
                        label="ICD-10 for Definitive Diagnosis"
                        value={definitiveIcd}
                        onChange={(v) => {
                          setDefinitiveIcd(v);
                          if (v) setDefinitiveIcdError("");
                        }}
                        error={definitiveIcdError}
                        hint="Required once a definitive diagnosis is typed."
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block font-mono text-[10px] uppercase text-charcoal-muted mb-1">
                      Clinical Management Plan
                    </label>
                    <textarea
                      rows={2}
                      value={clinicalPlan}
                      onChange={(e) => setClinicalPlan(e.target.value)}
                      placeholder="e.g. 1. Order Giemsa MP and FBC. 2. Prescribe stat IV Artesunate. 3. Review post-lab..."
                      className="w-full p-2 bg-paper-warm border border-paper-border focus:border-brand text-charcoal font-sans"
                    />
                  </div>
                </div>

                {/* Investigations Ordering */}
                <div className="space-y-3 pt-2">
                  <h4 className="font-mono text-[11px] uppercase tracking-wider text-amber-300 font-bold border-b border-paper-border pb-1 flex items-center justify-between">
                    <span>2. Order Laboratory & Imaging Investigations</span>
                    <span className="text-[10px] font-normal text-charcoal-muted">Click panel to append</span>
                  </h4>

                  <div className="space-y-2">
                    <span className="font-mono text-[10px] uppercase text-charcoal-muted block">
                      Common Diagnostic Panels:
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {COMMON_LAB_TESTS.map((t) => (
                        <button
                          key={t}
                          type="button"
                          onClick={() => handleAddLab(t)}
                          className="px-2 py-1 bg-paper-warm hover:bg-paper border border-paper-border hover:border-brand text-[11px] text-charcoal flex items-center gap-1"
                        >
                          <Plus className="w-3 h-3 text-brand" />
                          <span>{t}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Active Selected Labs */}
                  {labOrders.length > 0 && (
                    <div className="p-3 bg-brand-light/60 border border-brand space-y-2">
                      <span className="font-mono text-[10px] uppercase font-bold text-brand block">
                        Pending Tests to be Sent to MLS Lab ({labOrders.length}):
                      </span>
                      {labOrders.map((lo, i) => (
                        <div key={i} className="flex items-center justify-between bg-white p-2 border border-brand-border text-xs">
                          <span>{lo.testName} ({lo.priority.toUpperCase()})</span>
                          <button
                            type="button"
                            onClick={() => setLabOrders(labOrders.filter((_, idx) => idx !== i))}
                            className="text-terracotta hover:text-charcoal"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Imaging requests (X-ray / Ultrasound) */}
                  <div className="space-y-2 pt-3 border-t border-paper-border">
                    <span className="font-mono text-[10px] uppercase text-charcoal-muted block">
                      Request Imaging Services (Radiology):
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {COMMON_IMAGING.map((s) => (
                        <button
                          key={s}
                          type="button"
                          onClick={() => handleAddImaging(s)}
                          className="px-2 py-1 bg-paper-warm hover:bg-paper border border-paper-border hover:border-brand text-[11px] text-charcoal flex items-center gap-1"
                        >
                          <Plus aria-hidden="true" className="w-3 h-3 text-brand" />
                          <span>{s}</span>
                        </button>
                      ))}
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <input
                        type="text"
                        aria-label="Clinical indication for imaging"
                        value={imagingIndication}
                        onChange={(e) => setImagingIndication(e.target.value)}
                        placeholder="Clinical indication"
                        className="p-2 bg-paper-warm border border-paper-border focus:border-brand text-charcoal"
                      />
                      <div className="flex gap-2">
                        <input
                          type="text"
                          aria-label="Other imaging study"
                          value={customStudy}
                          onChange={(e) => setCustomStudy(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              e.preventDefault();
                              handleAddImaging(customStudy);
                              setCustomStudy("");
                            }
                          }}
                          placeholder="Other study"
                          className="flex-1 min-w-0 p-2 bg-paper-warm border border-paper-border focus:border-brand text-charcoal"
                        />
                        <button
                          type="button"
                          disabled={!customStudy.trim()}
                          onClick={() => {
                            handleAddImaging(customStudy);
                            setCustomStudy("");
                          }}
                          className="px-3 py-2 border border-paper-border hover:border-brand bg-paper text-xs disabled:opacity-50"
                        >
                          Add
                        </button>
                      </div>
                    </div>

                    {radiologyOrders.length > 0 && (
                      <div className="p-3 bg-brand-light/60 border border-brand space-y-2">
                        <span className="font-mono text-[10px] uppercase font-bold text-brand block">
                          Imaging Requests to be Sent to Radiology ({radiologyOrders.length}):
                        </span>
                        {radiologyOrders.map((ro, i) => (
                          <div
                            key={i}
                            className="flex items-center justify-between gap-2 bg-white p-2 border border-brand-border text-xs"
                          >
                            <div>
                              <strong>{ro.studyType}</strong>
                              <span className="text-[11px] text-charcoal-muted block">Indication: {ro.indication}</span>
                            </div>
                            <button
                              type="button"
                              onClick={() => handleRemoveImaging(i)}
                              aria-label={`Remove imaging request ${ro.studyType}`}
                              className="text-terracotta hover:text-charcoal p-1.5"
                            >
                              <Trash2 aria-hidden="true" className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}

                    {imagingError && (
                      <p role="alert" className="text-[11px] text-terracotta font-semibold">
                        {imagingError}
                      </p>
                    )}
                  </div>
                </div>

                {/* Medications & Injections */}
                <div className="space-y-3 pt-2">
                  <h4 className="font-mono text-[11px] uppercase tracking-wider text-amber-300 font-bold border-b border-paper-border pb-1 flex items-center justify-between">
                    <span>3. Prescribe Injections & Medications</span>
                    <span className="text-[10px] font-normal text-charcoal-muted">Stat injections route to Pharmacy</span>
                  </h4>

                  <div className="space-y-2">
                    <span className="font-mono text-[10px] uppercase text-charcoal-muted block">
                      Quick Pharmacotherapy Formulary:
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {COMMON_MEDICATIONS.map((m) => (
                        <button
                          key={m.name}
                          type="button"
                          onClick={() => handleAddMed(m)}
                          className="px-2 py-1 bg-paper-warm hover:bg-paper border border-paper-border hover:border-brand text-[11px] text-charcoal flex items-center gap-1"
                        >
                          <Plus className="w-3 h-3 text-brand" />
                          <span>{m.name} ({m.dose}) [{m.route}]</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Active Selected Meds */}
                  {medications.length > 0 && (
                    <div className="p-3 bg-paper-warm border border-paper-border space-y-2">
                      <span className="font-mono text-[10px] uppercase font-bold text-charcoal block">
                        Prescription Orders to Issue ({medications.length}):
                      </span>
                      {medications.map((m, i) => (
                        <div key={i} className="flex items-center justify-between bg-white p-2 border border-paper-border text-xs">
                          <div>
                            <strong>{m.drugName}</strong> ({m.dosage}) &bull; Route: <span className="font-mono">{m.route}</span>
                            <span className="text-[11px] text-charcoal-muted block">{m.frequency}</span>
                          </div>
                          <button
                            type="button"
                            onClick={() => setMedications(medications.filter((_, idx) => idx !== i))}
                            className="text-terracotta hover:text-charcoal"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Flexible Next Destination Routing */}
                <div className="p-3.5 bg-paper border border-paper-border space-y-2">
                  <label className="block font-mono text-[10px] uppercase text-charcoal font-semibold">
                    Flexible Patient Routing Post-Consultation:
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                    {[
                      { dept: "LABORATORY" as Department, name: "Medical Lab (MLS)", reason: "Referred for ordered diagnostic tests." },
                      { dept: "RADIOLOGY" as Department, name: "Radiology", reason: "Referred for diagnostic imaging." },
                      { dept: "TREATMENT" as Department, name: "Pharmacy", reason: "Referred to Pharmacy for prescribed medication / stat injection." },
                      { dept: "WARD" as Department, name: "Inpatient Ward", reason: "Admitted to Inpatient Ward for ongoing care." },
                      { dept: "DISCHARGED" as Department, name: "Discharge Home", reason: "Outpatient consultation concluded; discharged on oral meds." },
                    ].map((d) => (
                      <button
                        key={d.dept}
                        type="button"
                        onClick={() => {
                          setTargetDept(d.dept);
                          setRoutingReason(d.reason);
                        }}
                        className={`p-2 text-left border text-xs ${
                          targetDept === d.dept
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
                    placeholder="Physician routing justification..."
                  />
                </div>

                {/* Submit */}
                <div className="flex justify-end pt-2 border-t border-paper-border">
                  <button
                    type="submit"
                    disabled={submitting}
                    className="px-6 py-2.5 bg-brand hover:bg-brand-hover text-paper text-xs font-semibold flex items-center gap-2 border border-brand transition-colors"
                  >
                    <Check className="w-4 h-4" />
                    <span>{submitting ? "Signing Consultation..." : "Sign Clinical Encounter & Route Patient"}</span>
                  </button>
                </div>
              </form>
            </div>
          ) : (
            <div className="p-12 text-center text-charcoal-muted bg-white border border-paper-border text-xs">
              Select a patient from the consultation queue to conduct physician review.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
