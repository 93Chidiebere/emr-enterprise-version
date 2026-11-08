"use client";

import React, { useState } from "react";
import { useEMR } from "@/context/EMRContext";
import { Patient, DEPARTMENTS_METADATA } from "@/types/emr";
import { TransferModal } from "@/components/shared/TransferModal";
import { useDialogA11y } from "@/hooks/useDialogA11y";
import {
  FileText,
  Activity,
  Stethoscope,
  FlaskConical,
  Scan,
  Syringe,
  Clock,
  ArrowRightLeft,
  X,
  AlertTriangle,
  CheckCircle2,
} from "lucide-react";

interface PatientDossierModalProps {
  patient: Patient;
  onClose: () => void;
  /** true when the patient is no longer at this station: the chart can be read but not routed */
  readOnly?: boolean;
}

export function PatientDossierModal({ patient, onClose, readOnly = false }: PatientDossierModalProps) {
  const dialogRef = useDialogA11y<HTMLDivElement>(onClose);
  const [activeTab, setActiveTab] = useState<
    "journey" | "vitals" | "doctor" | "labs" | "radiology" | "meds"
  >("journey");
  const [transferModalOpen, setTransferModalOpen] = useState(false);

  const currentDeptMeta = DEPARTMENTS_METADATA[patient.currentDepartment];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-charcoal/45 backdrop-blur-[1px] p-2 sm:p-4">
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="dossier-dialog-title"
        tabIndex={-1}
        className="bg-white border border-brand max-w-4xl w-full h-[92dvh] max-h-[92dvh] flex flex-col shadow-lg overflow-hidden outline-none"
      >
        {/* Dossier Header / Docket Jacket */}
        <div className="p-4 sm:p-5 bg-paper border-b border-paper-border flex flex-wrap items-start justify-between gap-3">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="font-mono text-xs font-bold px-2 py-0.5 bg-brand text-paper">
                {patient.hospitalNumber}
              </span>
              <span
                className={`text-[10px] font-mono uppercase px-2 py-0.5 border ${
                  patient.status === "Discharged"
                    ? "bg-paper-warm border-paper-border text-charcoal-muted"
                    : "bg-brand text-paper border-brand"
                }`}
              >
                {patient.status}
              </span>
              <span className="text-xs font-mono text-charcoal-muted">
                {patient.paymentType}
              </span>
            </div>
            <h2 id="dossier-dialog-title" className="font-serif text-xl sm:text-2xl font-bold text-charcoal">
              {patient.fullName}
            </h2>
            <div className="text-xs text-charcoal-muted flex flex-wrap items-center gap-3">
              <span>
                <strong>{patient.age}</strong> yrs &bull; {patient.gender}
              </span>
              <span>&bull;</span>
              <span>DOB: {patient.dateOfBirth}</span>
              <span>&bull;</span>
              <span>Tel: {patient.phoneNumber || "N/A"}</span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {readOnly ? (
              <span className="px-3 py-1.5 text-xs font-mono bg-paper-warm border border-paper-border text-charcoal-muted">
                Read-only view
              </span>
            ) : (
              <button
                onClick={() => setTransferModalOpen(true)}
                className="px-3 py-1.5 text-xs font-medium bg-brand hover:bg-brand-hover text-paper flex items-center gap-1.5 transition-colors"
              >
                <ArrowRightLeft className="w-3.5 h-3.5 text-brand-light" />
                <span>Route / Transfer</span>
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              aria-label="Close patient chart"
              className="p-2 text-charcoal-muted hover:text-charcoal border border-paper-border hover:bg-paper-warm"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Current Location Strip */}
        <div className="px-5 py-2.5 bg-paper-warm/70 border-b border-paper-border flex flex-wrap items-center justify-between text-xs gap-2">
          <div className="flex items-center gap-2">
            <span className="font-mono text-charcoal-muted uppercase text-[10px]">
              Current Hospital Station:
            </span>
            <span className="font-serif font-bold text-charcoal text-sm">
              {currentDeptMeta.name}
            </span>
            <span className="font-mono px-1 py-0.2 text-[10px] bg-white border border-paper-border text-charcoal">
              {currentDeptMeta.code}
            </span>
          </div>

          <div className="text-charcoal-muted text-[11px] flex items-center gap-2">
            <span>Enrolled: {new Date(patient.registeredAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
            <span>&bull;</span>
            <span>By: {patient.registeredBy}</span>
          </div>
        </div>

        {/* Tabs */}
        <div role="group" aria-label="Chart sections" className="flex border-b border-paper-border bg-white px-2 sm:px-5 overflow-x-auto text-xs font-mono">
          {[
            { id: "journey", label: `Clinical Journey (${patient.routingHistory.length})`, icon: Clock },
            { id: "vitals", label: `Vital Signs (${patient.vitalsHistory.length})`, icon: Activity },
            { id: "doctor", label: `Physician Notes (${patient.doctorNotes.length})`, icon: Stethoscope },
            { id: "labs", label: `MLS Labs (${patient.labOrders.length})`, icon: FlaskConical },
            { id: "radiology", label: `Imaging (${patient.radiologyOrders.length})`, icon: Scan },
            { id: "meds", label: `Medications (${patient.medications.length})`, icon: Syringe },
          ].map((t) => {
            const Icon = t.icon;
            const isCurrent = activeTab === t.id;
            return (
              <button
                key={t.id}
                type="button"
                aria-pressed={isCurrent}
                onClick={() => setActiveTab(t.id as any)}
                className={`py-3 px-3.5 flex items-center gap-2 border-b-2 whitespace-nowrap transition-colors ${
                  isCurrent
                    ? "border-brand text-charcoal font-bold"
                    : "border-transparent text-charcoal-muted hover:text-charcoal hover:border-paper-border"
                }`}
              >
                <Icon className={`w-3.5 h-3.5 ${isCurrent ? "text-brand" : ""}`} />
                <span>{t.label}</span>
              </button>
            );
          })}
        </div>

        {/* Tab Body */}
        <div className="flex-1 overflow-y-auto p-5 bg-white text-xs">
          {/* 1. CLINICAL JOURNEY (The Audit Trail) */}
          {activeTab === "journey" && (
            <div className="space-y-4 max-w-3xl">
              <div>
                <h3 className="font-serif text-base font-bold text-charcoal">
                  Hospital Movement & Clinical Audit Trail
                </h3>
                <p className="text-charcoal-muted text-[11px] mt-0.5">
                  Complete chronological ledger showing how data and care flowed across Trinity University Hospital EHR stations
                </p>
              </div>

              <div className="border-l-2 border-paper-border ml-3 pl-4 space-y-5">
                {patient.routingHistory.map((event, idx) => {
                  const fromMeta = DEPARTMENTS_METADATA[event.fromDepartment];
                  const toMeta = DEPARTMENTS_METADATA[event.toDepartment];
                  const timeStr = new Date(event.timestamp).toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                  });

                  return (
                    <div key={event.id || idx} className="relative group">
                      {/* Timeline dot */}
                      <div className="absolute -left-[23px] top-1 w-3 h-3 bg-white border-2 border-brand" />

                      <div className="bg-paper-warm/40 border border-paper-border p-3 space-y-1.5">
                        <div className="flex items-center justify-between text-[11px]">
                          <div className="flex items-center gap-1.5 font-mono">
                            <span className="font-semibold text-charcoal">{fromMeta.code}</span>
                            <span className="text-brand font-bold">&rarr;</span>
                            <span className="font-bold text-charcoal bg-white px-1.5 py-0.5 border border-paper-border">
                              {toMeta.name}
                            </span>
                          </div>
                          <span className="text-charcoal-subtle font-mono">{timeStr}</span>
                        </div>

                        <p className="text-charcoal text-xs font-sans leading-relaxed">
                          {event.reason}
                        </p>

                        <div className="text-[10px] text-charcoal-subtle font-mono pt-1 border-t border-paper-border/50">
                          Authorized by: <strong className="text-charcoal">{event.authorizedBy}</strong>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* 2. VITALS LOG */}
          {activeTab === "vitals" && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-serif text-base font-bold text-charcoal">
                    Recorded Clinical Vitals Log
                  </h3>
                  <p className="text-charcoal-muted text-[11px]">
                    Captured by Nurse Triage station
                  </p>
                </div>
              </div>

              {patient.vitalsHistory.length === 0 ? (
                <div className="p-8 text-center text-charcoal-muted bg-paper-warm border border-dashed border-paper-border">
                  No vital signs recorded yet. Route patient to Triage to capture vitals.
                </div>
              ) : (
                <div className="space-y-4">
                  {patient.vitalsHistory.map((v) => (
                    <div
                      key={v.id}
                      className="border border-paper-border p-4 bg-paper/40 space-y-3"
                    >
                      <div className="flex items-center justify-between border-b border-paper-border pb-2 text-xs">
                        <div className="flex items-center gap-2">
                          <span
                            className={`font-mono text-[10px] uppercase px-2 py-0.5 border ${
                              v.urgency === "emergency"
                                ? "bg-terracotta text-paper border-terracotta font-bold"
                                : v.urgency === "urgent"
                                ? "bg-amber-light text-amber-alert border-amber-border font-semibold"
                                : "bg-white border-paper-border text-charcoal"
                            }`}
                          >
                            Priority: {v.urgency}
                          </span>
                          <span className="text-charcoal-muted font-mono">
                            Logged: {new Date(v.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                          </span>
                        </div>
                        <span className="text-charcoal-muted font-mono text-[11px]">
                          Nurse: {v.takenBy}
                        </span>
                      </div>

                      {/* Vitals Grid */}
                      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-2">
                        <div className="p-2 bg-white border border-paper-border">
                          <span className="text-[10px] font-mono text-charcoal-muted uppercase block">Blood Pressure</span>
                          <span className="font-serif text-base font-bold text-charcoal">
                            {v.bloodPressureSystolic}/{v.bloodPressureDiastolic}
                          </span>
                          <span className="text-[10px] text-charcoal-subtle ml-1">mmHg</span>
                        </div>

                        <div className="p-2 bg-white border border-paper-border">
                          <span className="text-[10px] font-mono text-charcoal-muted uppercase block">Pulse / HR</span>
                          <span className="font-serif text-base font-bold text-charcoal">{v.pulseRate}</span>
                          <span className="text-[10px] text-charcoal-subtle ml-1">bpm</span>
                        </div>

                        <div className="p-2 bg-white border border-paper-border">
                          <span className="text-[10px] font-mono text-charcoal-muted uppercase block">Temperature</span>
                          <span className={`font-serif text-base font-bold ${v.temperature >= 38.0 ? "text-terracotta" : "text-charcoal"}`}>
                            {v.temperature}&deg;C
                          </span>
                        </div>

                        <div className="p-2 bg-white border border-paper-border">
                          <span className="text-[10px] font-mono text-charcoal-muted uppercase block">SpO2</span>
                          <span className={`font-serif text-base font-bold ${v.spO2 < 95 ? "text-terracotta" : "text-charcoal"}`}>
                            {v.spO2}%
                          </span>
                        </div>

                        <div className="p-2 bg-white border border-paper-border">
                          <span className="text-[10px] font-mono text-charcoal-muted uppercase block">Resp Rate</span>
                          <span className="font-serif text-base font-bold text-charcoal">{v.respiratoryRate}</span>
                          <span className="text-[10px] text-charcoal-subtle ml-1">cpm</span>
                        </div>

                        <div className="p-2 bg-white border border-paper-border">
                          <span className="text-[10px] font-mono text-charcoal-muted uppercase block">BMI</span>
                          <span className="font-serif text-base font-bold text-charcoal">{v.bmi}</span>
                          <span className="text-[10px] text-charcoal-subtle block">
                            {v.weightKg}kg / {v.heightCm}cm
                          </span>
                        </div>
                      </div>

                      {v.chiefComplaint && (
                        <div className="p-2.5 bg-paper-warm border border-paper-border">
                          <strong className="font-mono text-[10px] uppercase text-charcoal block mb-0.5">
                            Chief Complaint:
                          </strong>
                          <p className="text-charcoal text-xs font-sans">{v.chiefComplaint}</p>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* 3. DOCTOR CLINICAL ENCOUNTERS */}
          {activeTab === "doctor" && (
            <div className="space-y-4">
              <h3 className="font-serif text-base font-bold text-charcoal">
                Physician Consultation Notes
              </h3>

              {patient.doctorNotes.length === 0 ? (
                <div className="p-8 text-center text-charcoal-muted bg-paper-warm border border-dashed border-paper-border">
                  No doctor consultation documented yet. Route patient to Consultation station.
                </div>
              ) : (
                <div className="space-y-4">
                  {patient.doctorNotes.map((note) => (
                    <div
                      key={note.id}
                      className="border border-paper-border p-4 bg-white space-y-3"
                    >
                      <div className="flex items-center justify-between border-b border-paper-border pb-2">
                        <span className="font-serif font-bold text-charcoal text-sm">
                          {note.doctorName}
                        </span>
                        <span className="text-charcoal-muted font-mono text-[11px]">
                          {new Date(note.timestamp).toLocaleString()}
                        </span>
                      </div>

                      <div className="space-y-2">
                        <div>
                          <strong className="font-mono text-[10px] uppercase text-charcoal-muted block">
                            History of Present Illness (HPI):
                          </strong>
                          <p className="text-charcoal font-sans text-xs whitespace-pre-line mt-0.5">
                            {note.historyOfPresentIllness}
                          </p>
                        </div>

                        <div>
                          <strong className="font-mono text-[10px] uppercase text-charcoal-muted block">
                            Physical Examination Findings:
                          </strong>
                          <p className="text-charcoal font-sans text-xs whitespace-pre-line mt-0.5">
                            {note.physicalExamFindings}
                          </p>
                        </div>

                        <div className="p-2.5 bg-paper-warm border border-paper-border grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <div>
                            <strong className="font-mono text-[10px] uppercase text-charcoal-muted block">
                              Provisional Diagnosis:
                            </strong>
                            <span className="font-serif font-bold text-charcoal text-xs">
                              {note.provisionalDiagnosis}
                            </span>
                            {note.provisionalIcd10 && (
                              <span className="block mt-1 text-[11px] text-charcoal">
                                <span className="font-mono font-bold text-brand mr-1.5">{note.provisionalIcd10.code}</span>
                                {note.provisionalIcd10.description}
                              </span>
                            )}
                          </div>
                          {note.definitiveDiagnosis && (
                            <div>
                              <strong className="font-mono text-[10px] uppercase text-brand block font-bold">
                                Definitive Diagnosis:
                              </strong>
                              <span className="font-serif font-bold text-charcoal text-xs">
                                {note.definitiveDiagnosis}
                              </span>
                              {note.definitiveIcd10 && (
                                <span className="block mt-1 text-[11px] text-charcoal">
                                  <span className="font-mono font-bold text-brand mr-1.5">{note.definitiveIcd10.code}</span>
                                  {note.definitiveIcd10.description}
                                </span>
                              )}
                            </div>
                          )}
                        </div>

                        <div>
                          <strong className="font-mono text-[10px] uppercase text-charcoal-muted block">
                            Management Plan:
                          </strong>
                          <p className="text-charcoal font-sans text-xs whitespace-pre-line mt-0.5">
                            {note.clinicalPlan}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* 4. LABORATORY REPORTS (MLS) */}
          {activeTab === "labs" && (
            <div className="space-y-4">
              <h3 className="font-serif text-base font-bold text-charcoal">
                Medical Laboratory Reports (MLS)
              </h3>

              {patient.labOrders.length === 0 ? (
                <div className="p-8 text-center text-charcoal-muted bg-paper-warm border border-dashed border-paper-border">
                  No laboratory tests requested for this patient.
                </div>
              ) : (
                <div className="space-y-3">
                  {patient.labOrders.map((lo) => (
                    <div
                      key={lo.id}
                      className="border border-paper-border p-4 bg-white space-y-2.5"
                    >
                      <div className="flex items-center justify-between border-b border-paper-border pb-2">
                        <div>
                          <span className="font-serif text-sm font-bold text-charcoal">
                            {lo.testName}
                          </span>
                          <span className="text-[10px] font-mono text-charcoal-muted ml-2">
                            Priority: {lo.priority.toUpperCase()}
                          </span>
                        </div>
                        <span
                          className={`font-mono text-[10px] uppercase px-2 py-0.5 border ${
                            lo.status === "completed"
                              ? "bg-brand-light text-brand border-brand-border font-semibold"
                              : "bg-amber-light text-amber-alert border-amber-border font-medium"
                          }`}
                        >
                          {lo.status === "completed" ? "Report Validated" : "Pending Specimen"}
                        </span>
                      </div>

                      <div className="text-xs text-charcoal-muted">
                        Ordered by: <strong>{lo.doctorName}</strong> &bull; Indication: {lo.clinicalIndication}
                      </div>

                      {lo.status === "completed" ? (
                        <div className="p-3 bg-paper-warm border border-paper-border space-y-2">
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            <div>
                              <span className="text-[10px] font-mono uppercase text-charcoal-muted block">
                                Findings:
                              </span>
                              <span className="font-serif font-bold text-charcoal text-xs">
                                {lo.resultFindings}
                              </span>
                            </div>
                            {lo.quantitativeValue && (
                              <div>
                                <span className="text-[10px] font-mono uppercase text-charcoal-muted block">
                                  Quantitative Value:
                                </span>
                                <span className="font-mono font-bold text-charcoal text-xs">
                                  {lo.quantitativeValue}
                                </span>
                              </div>
                            )}
                          </div>
                          {lo.referenceRange && (
                            <div className="text-[11px] text-charcoal-muted">
                              Reference Range: <span className="font-mono">{lo.referenceRange}</span>
                            </div>
                          )}
                          {lo.scientistComments && (
                            <div className="text-[11px] text-charcoal border-t border-paper-border pt-1 mt-1">
                              Scientist Note: {lo.scientistComments}
                            </div>
                          )}
                          <div className="text-[10px] font-mono text-charcoal-subtle pt-1 border-t border-paper-border">
                            Validated by: <strong>{lo.scientistName}</strong> &bull;{" "}
                            {new Date(lo.timestampCompleted || "").toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                          </div>
                        </div>
                      ) : (
                        <p className="text-charcoal-muted italic text-[11px]">
                          Awaiting processing in Medical Laboratory (MLS).
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* 5. RADIOLOGY */}
          {activeTab === "radiology" && (
            <div className="space-y-4">
              <h3 className="font-serif text-base font-bold text-charcoal">
                Diagnostic Radiology & Imaging
              </h3>

              {patient.radiologyOrders.length === 0 ? (
                <div className="p-8 text-center text-charcoal-muted bg-paper-warm border border-dashed border-paper-border">
                  No imaging studies requested for this patient.
                </div>
              ) : (
                <div className="space-y-3">
                  {patient.radiologyOrders.map((ro) => (
                    <div
                      key={ro.id}
                      className="border border-paper-border p-4 bg-white space-y-2.5"
                    >
                      <div className="flex items-center justify-between border-b border-paper-border pb-2">
                        <span className="font-serif text-sm font-bold text-charcoal">
                          {ro.studyType}
                        </span>
                        <span
                          className={`font-mono text-[10px] uppercase px-2 py-0.5 border ${
                            ro.status === "completed"
                              ? "bg-brand-light text-brand border-brand-border font-semibold"
                              : "bg-amber-light text-amber-alert border-amber-border"
                          }`}
                        >
                          {ro.status}
                        </span>
                      </div>

                      <div className="text-xs text-charcoal-muted">
                        Ordered by: <strong>{ro.doctorName}</strong> &bull; Indication: {ro.indication}
                      </div>

                      {ro.status === "completed" ? (
                        <div className="p-3 bg-paper-warm border border-paper-border space-y-2">
                          <div>
                            <span className="text-[10px] font-mono uppercase text-charcoal-muted block">
                              Report Findings:
                            </span>
                            <p className="font-sans text-charcoal text-xs whitespace-pre-line mt-0.5">
                              {ro.findingsReport}
                            </p>
                          </div>
                          <div>
                            <span className="text-[10px] font-mono uppercase text-charcoal-muted block font-bold">
                              Impression:
                            </span>
                            <p className="font-serif font-bold text-charcoal text-xs mt-0.5">
                              {ro.impression}
                            </p>
                          </div>
                          <div className="text-[10px] font-mono text-charcoal-subtle pt-1 border-t border-paper-border">
                            Radiographer: <strong>{ro.radiographerName}</strong>
                          </div>
                        </div>
                      ) : (
                        <p className="text-charcoal-muted italic text-[11px]">
                          Pending scan acquisition in Radiology.
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* 6. MEDICATIONS & INJECTIONS */}
          {activeTab === "meds" && (
            <div className="space-y-4">
              <h3 className="font-serif text-base font-bold text-charcoal">
                Medications & Injections Administration Record
              </h3>

              {patient.medications.length === 0 ? (
                <div className="p-8 text-center text-charcoal-muted bg-paper-warm border border-dashed border-paper-border">
                  No medications or injections prescribed for this patient.
                </div>
              ) : (
                <div className="space-y-3">
                  {patient.medications.map((m) => (
                    <div
                      key={m.id}
                      className="border border-paper-border p-4 bg-white space-y-2.5"
                    >
                      <div className="flex items-center justify-between border-b border-paper-border pb-2">
                        <div>
                          <span className="font-serif text-sm font-bold text-charcoal">
                            {m.drugName} ({m.dosage})
                          </span>
                          <span className="font-mono text-xs px-1.5 py-0.2 bg-paper border border-paper-border ml-2 text-charcoal">
                            Route: {m.route}
                          </span>
                        </div>
                        <span
                          className={`font-mono text-[10px] uppercase px-2 py-0.5 border ${
                            m.status === "administered"
                              ? "bg-brand-light text-brand border-brand-border font-bold"
                              : "bg-terracotta-light text-terracotta border-terracotta-border font-semibold"
                          }`}
                        >
                          {m.status === "administered" ? "Administered" : "Awaiting Injection"}
                        </span>
                      </div>

                      <div className="text-xs text-charcoal-muted">
                        Prescribed by: <strong>{m.doctorName}</strong> &bull; Frequency: {m.frequency}
                      </div>

                      {m.instructions && (
                        <p className="text-charcoal-muted text-[11px] italic">
                          Instructions: {m.instructions}
                        </p>
                      )}

                      {m.status === "administered" && (
                        <div className="p-3 bg-paper-warm border border-paper-border space-y-1">
                          <div className="flex items-center justify-between text-xs">
                            <span className="font-mono text-[10px] uppercase text-brand font-bold">
                              Nursing Administration Verified
                            </span>
                            <span className="font-mono text-[10px] text-charcoal-subtle">
                              {new Date(m.timestampAdministered || "").toLocaleString()}
                            </span>
                          </div>
                          <div className="text-xs text-charcoal">
                            Site: <strong>{m.injectionSite}</strong> &bull; Administered by Nurse: <strong>{m.nurseName}</strong>
                          </div>
                          {m.nurseNotes && (
                            <div className="text-[11px] text-charcoal-muted pt-1 border-t border-paper-border">
                              Progress Note: {m.nurseNotes}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-3 bg-paper border-t border-paper-border flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-1.5 text-xs border border-brand bg-brand text-paper hover:bg-brand-hover"
          >
            Close Docket
          </button>
        </div>
      </div>

      {transferModalOpen && (
        <TransferModal
          patient={patient}
          onClose={() => setTransferModalOpen(false)}
        />
      )}
    </div>
  );
}
