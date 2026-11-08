"use client";

import React, { useState } from "react";
import { useEMR } from "@/context/EMRContext";
import { Patient, Department } from "@/types/emr";
import { Activity, AlertTriangle, Check, ArrowRightLeft } from "lucide-react";

interface TriageWorkstationProps {
  onOpenDossier: (patient: Patient) => void;
  onOpenTransfer: (patient: Patient) => void;
}

export function TriageWorkstation({
  onOpenDossier,
  onOpenTransfer,
}: TriageWorkstationProps) {
  const { patients, recordVitals, activeStaffName } = useEMR();
  const triageQueue = patients.filter((p) => p.currentDepartment === "TRIAGE" && p.status === "Active");

  const [selectedPatientId, setSelectedPatientId] = useState<string>(
    triageQueue[0]?.id || ""
  );

  // Vitals State (starts blank so nothing is carried over from the previous patient)
  const [systolic, setSystolic] = useState("");
  const [diastolic, setDiastolic] = useState("");
  const [pulse, setPulse] = useState("");
  const [temp, setTemp] = useState("");
  const [respRate, setRespRate] = useState("");
  const [spO2, setSpO2] = useState("");
  const [weight, setWeight] = useState("");
  const [height, setHeight] = useState("");
  const [urgency, setUrgency] = useState<"routine" | "urgent" | "emergency">("routine");
  const [chiefComplaint, setChiefComplaint] = useState("");
  const [triageNotes, setTriageNotes] = useState("");
  const [nextStation, setNextStation] = useState<Department>("CONSULTATION");
  const [routingReason, setRoutingReason] = useState(
    "Vital signs logged; patient directed to Physician Consultation queue."
  );
  const [submitting, setSubmitting] = useState(false);

  // Compute BMI
  const weightNum = parseFloat(weight) || 0;
  const heightNum = parseFloat(height) || 0;
  const heightM = heightNum / 100;
  const bmiComputed = heightM > 0 && weightNum > 0 ? (weightNum / (heightM * heightM)).toFixed(1) : "--";
  const bmiVal = parseFloat(bmiComputed) || 0;

  // Only patients still waiting in Triage can be assessed. As soon as a patient is
  // routed on, they disappear from this screen instead of staying on the form.
  const selectedPatient = triageQueue.find((p) => p.id === selectedPatientId);

  const resetForm = () => {
    setSystolic("");
    setDiastolic("");
    setPulse("");
    setTemp("");
    setRespRate("");
    setSpO2("");
    setWeight("");
    setHeight("");
    setUrgency("routine");
    setChiefComplaint("");
    setTriageNotes("");
    setNextStation("CONSULTATION");
    setRoutingReason("Vital signs logged; patient directed to Physician Consultation queue.");
  };

  // If the selected patient leaves the queue (routed from here or from another station),
  // clear the form and select nobody so the next patient is chosen deliberately.
  React.useEffect(() => {
    if (selectedPatientId && !triageQueue.some((p) => p.id === selectedPatientId)) {
      setSelectedPatientId("");
      resetForm();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [triageQueue.map((p) => p.id).join("|"), selectedPatientId]);

  const selectPatient = (id: string) => {
    if (id !== selectedPatientId) resetForm();
    setSelectedPatientId(id);
  };

  const handleRecordVitals = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPatient) return;

    setSubmitting(true);
    await recordVitals(
      selectedPatient.id,
      {
        bloodPressureSystolic: Number(systolic),
        bloodPressureDiastolic: Number(diastolic),
        pulseRate: Number(pulse),
        temperature: Number(temp),
        respiratoryRate: Number(respRate),
        spO2: Number(spO2),
        weightKg: Number(weight),
        heightCm: Number(height),
        bmi: bmiVal,
        urgency,
        chiefComplaint: chiefComplaint || "General malaise / clinical evaluation",
        triageNotes,
      },
      nextStation,
      routingReason
    );
    setSubmitting(false);

    // Triage is complete: clear the form and select nobody so the next patient is chosen deliberately
    resetForm();
    setSelectedPatientId("");
  };

  return (
    <div className="space-y-6">
      {/* Station Title Banner */}
      <div className="bg-white border border-paper-border p-4 sm:p-5 flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <Activity className="w-5 h-5 text-brand" />
            <h2 className="font-serif text-lg sm:text-xl font-bold text-charcoal">
              Nurse Triage & Vital Signs Station
            </h2>
          </div>
          <p className="hidden sm:block text-xs text-charcoal-muted mt-0.5">
            Measure physiological parameters, calculate BMI, classify clinical urgency, and route to destination.
          </p>
        </div>
        <div className="font-mono text-xs px-2.5 py-1 bg-paper-warm border border-paper-border text-charcoal">
          Triage Queue: <strong>{triageQueue.length}</strong> patient(s) waiting
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Triage Waiting Queue */}
        <div className="lg:col-span-4 space-y-3">
          <div className="flex items-center justify-between border-b border-paper-border pb-1">
            <span className="font-mono text-[11px] uppercase tracking-wider text-amber-300 font-bold">
              Waiting in Triage Queue ({triageQueue.length})
            </span>
          </div>

          {triageQueue.length === 0 ? (
            <div className="p-8 text-center text-charcoal-muted bg-white border border-paper-border text-xs">
              No patients currently waiting at Triage. All patients have had vitals taken or were routed elsewhere.
            </div>
          ) : (
            <div className="space-y-2">
              {triageQueue.map((pat) => {
                const isSelected = pat.id === selectedPatientId;
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

                    <p className="text-charcoal-muted text-[11px] mt-1 line-clamp-1">
                      Billing: {pat.paymentType}
                    </p>

                    <div className="mt-2.5 pt-2 border-t border-paper-border/60 flex items-center justify-between">
                      <span className="text-[10px] font-mono text-charcoal-subtle">
                        Arrived: {new Date(pat.registeredAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                      </span>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onOpenDossier(pat);
                        }}
                        className="text-[10px] font-mono underline text-charcoal hover:text-brand"
                      >
                        View Chart &rarr;
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Right Column: Active Vitals Recording Form */}
        <div className="lg:col-span-8">
          {selectedPatient ? (
            <div className="bg-white border border-paper-border p-5 sm:p-6 space-y-5">
              <div className="flex flex-wrap items-center justify-between border-b border-paper-border pb-3 gap-2">
                <div>
                  <span className="font-mono text-[10px] uppercase text-brand font-bold block">
                    Now Assessing Patient:
                  </span>
                  <h3 className="font-serif text-lg font-bold text-charcoal">
                    {selectedPatient.fullName}
                  </h3>
                  <div className="text-xs text-charcoal-muted font-mono flex items-center gap-2">
                    <span>{selectedPatient.hospitalNumber}</span>
                    <span>&bull;</span>
                    <span>{selectedPatient.age} years ({selectedPatient.gender})</span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => onOpenTransfer(selectedPatient)}
                    className="px-2.5 py-1 text-xs border border-paper-border hover:border-brand bg-paper flex items-center gap-1"
                  >
                    <ArrowRightLeft className="w-3.5 h-3.5 text-brand" />
                    <span>Skip to Another Station</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => onOpenDossier(selectedPatient)}
                    className="px-2.5 py-1 text-xs border border-paper-border hover:border-brand bg-paper"
                  >
                    Full Chart
                  </button>
                </div>
              </div>

              <form onSubmit={handleRecordVitals} className="space-y-4 text-xs">
                {/* Vitals Form Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {/* Blood Pressure */}
                  <div className="col-span-2 p-3 bg-paper-warm border border-paper-border space-y-1.5">
                    <label className="block font-mono text-[10px] uppercase text-charcoal font-semibold">
                      Blood Pressure (mmHg) *
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        required
                        type="number"
                        placeholder="Sys (120)"
                        value={systolic}
                        onChange={(e) => setSystolic(e.target.value)}
                        className="w-full p-2 bg-white border border-paper-border focus:border-brand text-charcoal text-center font-mono font-bold text-sm"
                      />
                      <span className="font-serif text-lg text-charcoal-muted">/</span>
                      <input
                        required
                        type="number"
                        placeholder="Dia (80)"
                        value={diastolic}
                        onChange={(e) => setDiastolic(e.target.value)}
                        className="w-full p-2 bg-white border border-paper-border focus:border-brand text-charcoal text-center font-mono font-bold text-sm"
                      />
                    </div>
                    {Number(systolic) >= 160 || Number(diastolic) >= 100 ? (
                      <span className="text-[10px] text-terracotta font-mono font-bold flex items-center gap-1">
                        <AlertTriangle className="w-3 h-3" /> Hypertensive Threshold
                      </span>
                    ) : null}
                  </div>

                  {/* Pulse */}
                  <div className="p-3 bg-paper-warm border border-paper-border space-y-1.5">
                    <label className="block font-mono text-[10px] uppercase text-charcoal font-semibold">
                      Pulse Rate (bpm) *
                    </label>
                    <input
                      required
                      type="number"
                      value={pulse}
                      onChange={(e) => setPulse(e.target.value)}
                      className="w-full p-2 bg-white border border-paper-border focus:border-brand text-charcoal text-center font-mono font-bold text-sm"
                    />
                    <span className="text-[10px] text-charcoal-subtle block text-center">Norm: 60-100</span>
                  </div>

                  {/* Temperature */}
                  <div className="p-3 bg-paper-warm border border-paper-border space-y-1.5">
                    <label className="block font-mono text-[10px] uppercase text-charcoal font-semibold">
                      Temperature (&deg;C) *
                    </label>
                    <input
                      required
                      type="number"
                      step="0.1"
                      value={temp}
                      onChange={(e) => setTemp(e.target.value)}
                      className="w-full p-2 bg-white border border-paper-border focus:border-brand text-charcoal text-center font-mono font-bold text-sm"
                    />
                    <span className={`text-[10px] block text-center font-mono ${Number(temp) >= 38.0 ? "text-terracotta font-bold" : "text-charcoal-subtle"}`}>
                      {Number(temp) >= 38.0 ? "Pyrexia / Fever" : "Norm: 36.5-37.5"}
                    </span>
                  </div>

                  {/* SpO2 */}
                  <div className="p-3 bg-paper-warm border border-paper-border space-y-1.5">
                    <label className="block font-mono text-[10px] uppercase text-charcoal font-semibold">
                      SpO2 Oxygen (%) *
                    </label>
                    <input
                      required
                      type="number"
                      value={spO2}
                      onChange={(e) => setSpO2(e.target.value)}
                      className="w-full p-2 bg-white border border-paper-border focus:border-brand text-charcoal text-center font-mono font-bold text-sm"
                    />
                    <span className={`text-[10px] block text-center font-mono ${Number(spO2) < 95 ? "text-terracotta font-bold" : "text-charcoal-subtle"}`}>
                      {Number(spO2) < 95 ? "Hypoxia Alert" : "Norm: 95-100%"}
                    </span>
                  </div>

                  {/* Resp Rate */}
                  <div className="p-3 bg-paper-warm border border-paper-border space-y-1.5">
                    <label className="block font-mono text-[10px] uppercase text-charcoal font-semibold">
                      Resp Rate (cpm)
                    </label>
                    <input
                        required
                      type="number"
                      value={respRate}
                      onChange={(e) => setRespRate(e.target.value)}
                      className="w-full p-2 bg-white border border-paper-border focus:border-brand text-charcoal text-center font-mono text-sm"
                    />
                    <span className="text-[10px] text-charcoal-subtle block text-center">Norm: 12-20</span>
                  </div>

                  {/* Weight & Height -> BMI */}
                  <div className="col-span-2 p-3 bg-paper-warm border border-paper-border space-y-1.5">
                    <div className="flex items-center justify-between">
                      <label className="block font-mono text-[10px] uppercase text-charcoal font-semibold">
                        Anthropometry (Weight & Height)
                      </label>
                      <span className="font-mono text-xs text-brand font-bold">
                        Calculated BMI: {bmiComputed}
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <input
                        required
                        type="number"
                        placeholder="Weight (kg)"
                        value={weight}
                        onChange={(e) => setWeight(e.target.value)}
                        className="w-full p-2 bg-white border border-paper-border text-center font-mono text-sm"
                      />
                      <input
                        required
                        type="number"
                        placeholder="Height (cm)"
                        value={height}
                        onChange={(e) => setHeight(e.target.value)}
                        className="w-full p-2 bg-white border border-paper-border text-center font-mono text-sm"
                      />
                    </div>
                  </div>
                </div>

                {/* Urgency Classification */}
                <div className="space-y-1.5">
                  <label className="block font-mono text-[10px] uppercase text-charcoal font-semibold">
                    Clinical Triage Priority Acuity *
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { id: "routine", label: "Routine (Green)", desc: "Stable outpatient" },
                      { id: "urgent", label: "Urgent (Yellow)", desc: "High fever / severe pain" },
                      { id: "emergency", label: "Emergency (Red)", desc: "Impending collapse / severe vitals" },
                    ].map((u) => (
                      <button
                        key={u.id}
                        type="button"
                        onClick={() => setUrgency(u.id as any)}
                        className={`p-2.5 text-left border transition-colors ${
                          urgency === u.id
                            ? u.id === "emergency"
                              ? "bg-terracotta text-paper border-terracotta font-bold"
                              : u.id === "urgent"
                              ? "bg-amber-light text-amber-alert border-amber-border font-bold"
                              : "bg-brand text-paper border-brand font-bold"
                            : "bg-white border-paper-border text-charcoal hover:bg-paper-warm"
                        }`}
                      >
                        <span className="font-serif text-xs block">{u.label}</span>
                        <span className="text-[10px] opacity-80 mt-0.5 block">{u.desc}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Chief Complaint */}
                <div className="space-y-1">
                  <label className="block font-mono text-[10px] uppercase text-charcoal font-semibold">
                    Patient Chief Complaint *
                  </label>
                  <textarea
                    required
                    rows={2}
                    value={chiefComplaint}
                    onChange={(e) => setChiefComplaint(e.target.value)}
                    placeholder="e.g. Complains of sudden onset headache, chills and nausea since yesterday night..."
                    className="w-full p-2.5 bg-paper-warm border border-paper-border focus:border-brand text-charcoal font-sans"
                  />
                </div>

                {/* Flexible Next Routing Post-Triage */}
                <div className="p-3.5 bg-paper border border-paper-border space-y-2">
                  <label className="block font-mono text-[10px] uppercase text-charcoal font-semibold">
                    Flexible Routing After Vitals:
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {[
                      { dept: "CONSULTATION" as Department, name: "Doctor Consultation (Standard)" },
                      { dept: "TREATMENT" as Department, name: "Pharmacy (Stat Medication)" },
                      { dept: "WARD" as Department, name: "Inpatient Ward" },
                      { dept: "LABORATORY" as Department, name: "Direct to Lab (MLS)" },
                    ].map((d) => (
                      <button
                        key={d.dept}
                        type="button"
                        onClick={() => {
                          setNextStation(d.dept);
                          if (d.dept === "TREATMENT") {
                            setRoutingReason("Patient presenting in severe acute distress; routed straight to Pharmacy for stat medication.");
                          } else if (d.dept === "WARD") {
                            setRoutingReason("Direct admission to Inpatient Ward authorized from Triage.");
                          } else {
                            setRoutingReason("Vital signs captured; routed to Physician Consultation queue.");
                          }
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
                    className="w-full p-2 bg-white border border-paper-border text-xs text-charcoal"
                    placeholder="Routing note..."
                  />
                </div>

                {/* Submit Button */}
                <div className="flex justify-end pt-2 border-t border-paper-border">
                  <button
                    type="submit"
                    disabled={submitting}
                    className="px-6 py-2.5 bg-brand hover:bg-brand-hover text-paper text-xs font-semibold flex items-center gap-2 border border-brand transition-colors"
                  >
                    <Check className="w-4 h-4" />
                    <span>{submitting ? "Logging Vitals..." : "Save Vitals & Route Patient"}</span>
                  </button>
                </div>
              </form>
            </div>
          ) : (
            <div className="p-12 text-center text-charcoal-muted bg-white border border-paper-border text-xs">
              Select a patient from the queue to record their vitals.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
