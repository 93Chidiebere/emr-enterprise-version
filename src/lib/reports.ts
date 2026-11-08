import { DEPARTMENTS_METADATA, type Department, type Patient } from "@/types/emr";

export interface ReportSummary {
  totals: {
    patients: number;
    active: number;
    discharged: number;
    vitals: number;
    consultations: number;
    labOrders: number;
    labCompleted: number;
    imagingOrders: number;
    imagingCompleted: number;
    medications: number;
    medicationsAdministered: number;
  };
  byStation: Array<{ dept: Department; name: string; count: number }>;
  avgMinutesAtStation: Array<{ dept: Department; name: string; avgMinutes: number; visits: number }>;
  avgMinutesToDischarge: number | null;
  topDiagnoses: Array<{ code: string; description: string; count: number }>;
  uncodedConsultations: number;
  demographics: {
    gender: Array<{ label: string; count: number }>;
    payment: Array<{ label: string; count: number }>;
    ageGroups: Array<{ label: string; count: number }>;
  };
  activity: Array<{
    name: string;
    patientsRegistered: number;
    vitalsRecorded: number;
    consultations: number;
    labResults: number;
    imagingReports: number;
    medicationsGiven: number;
    patientsRouted: number;
  }>;
}

const DEPTS = Object.keys(DEPARTMENTS_METADATA) as Department[];
const ms = (iso?: string) => (iso ? new Date(iso).getTime() : NaN);

function countBy<T>(items: T[], key: (t: T) => string): Array<{ label: string; count: number }> {
  const m = new Map<string, number>();
  for (const it of items) {
    const k = key(it) || "Not recorded";
    m.set(k, (m.get(k) || 0) + 1);
  }
  return Array.from(m.entries())
    .map(([label, count]) => ({ label, count }))
    .sort((a, b) => b.count - a.count);
}

export function buildSummary(patients: Patient[], resolveName?: (key: string) => string | undefined): ReportSummary {
  const totals = {
    patients: patients.length,
    active: patients.filter((p) => p.status === "Active").length,
    discharged: patients.filter((p) => p.status === "Discharged").length,
    vitals: 0,
    consultations: 0,
    labOrders: 0,
    labCompleted: 0,
    imagingOrders: 0,
    imagingCompleted: 0,
    medications: 0,
    medicationsAdministered: 0,
  };

  const stationTime = new Map<Department, { total: number; visits: number }>();
  const dischargeMinutes: number[] = [];
  const dxCounts = new Map<string, { code: string; description: string; count: number }>();
  let uncoded = 0;
  const activity = new Map<string, ReportSummary["activity"][number]>();
  const person = (raw: string | undefined) => {
    // "Ada Obi (REC)" and "Ada Obi (TRG)" are the same student at different stations
    const base = (raw || "").trim().replace(/\s*\([A-Za-z]{2,5}\)\s*$/, "");
    if (!base) return null;
    // a student who was renamed is counted once, under the current name
    const name = resolveName?.(base.replace(/\s+/g, " ").toLowerCase()) ?? base;
    if (!activity.has(name)) {
      activity.set(name, {
        name, patientsRegistered: 0, vitalsRecorded: 0, consultations: 0, labResults: 0,
        imagingReports: 0, medicationsGiven: 0, patientsRouted: 0,
      });
    }
    return activity.get(name)!;
  };

  for (const p of patients) {
    totals.vitals += p.vitalsHistory?.length || 0;
    totals.consultations += p.doctorNotes?.length || 0;
    totals.labOrders += p.labOrders?.length || 0;
    totals.labCompleted += (p.labOrders || []).filter((o) => o.status === "completed").length;
    totals.imagingOrders += p.radiologyOrders?.length || 0;
    totals.imagingCompleted += (p.radiologyOrders || []).filter((o) => o.status === "completed").length;
    totals.medications += p.medications?.length || 0;
    totals.medicationsAdministered += (p.medications || []).filter((m) => m.status === "administered").length;

    // Time spent at each station (completed stays only)
    const events = [...(p.routingHistory || [])].sort((a, b) => ms(a.timestamp) - ms(b.timestamp));
    for (let i = 0; i < events.length - 1; i++) {
      const minutes = (ms(events[i + 1].timestamp) - ms(events[i].timestamp)) / 60000;
      if (!Number.isFinite(minutes) || minutes < 0) continue;
      const dept = events[i].toDepartment;
      const cur = stationTime.get(dept) || { total: 0, visits: 0 };
      cur.total += minutes;
      cur.visits += 1;
      stationTime.set(dept, cur);
    }
    const discharge = events.find((e) => e.toDepartment === "DISCHARGED");
    if (discharge) {
      const mins = (ms(discharge.timestamp) - ms(p.registeredAt)) / 60000;
      if (Number.isFinite(mins) && mins >= 0) dischargeMinutes.push(mins);
    }

    // Diagnosis coding: use the latest consultation (definitive code if there is one)
    const notes = [...(p.doctorNotes || [])].sort((a, b) => ms(b.timestamp) - ms(a.timestamp));
    if (notes.length) {
      const latest = notes[0];
      const coded = latest.definitiveIcd10 || latest.provisionalIcd10;
      if (coded) {
        const cur = dxCounts.get(coded.code) || { code: coded.code, description: coded.description, count: 0 };
        cur.count += 1;
        dxCounts.set(coded.code, cur);
      } else {
        uncoded += 1;
      }
    }

    // Who did what
    const reg = person(p.registeredBy);
    if (reg) reg.patientsRegistered += 1;
    for (const v of p.vitalsHistory || []) {
      const a = person(v.takenBy);
      if (a) a.vitalsRecorded += 1;
    }
    for (const n of p.doctorNotes || []) {
      const a = person(n.doctorName);
      if (a) a.consultations += 1;
    }
    for (const o of p.labOrders || []) {
      if (o.status === "completed") {
        const a = person(o.scientistName);
        if (a) a.labResults += 1;
      }
    }
    for (const o of p.radiologyOrders || []) {
      if (o.status === "completed") {
        const a = person(o.radiographerName);
        if (a) a.imagingReports += 1;
      }
    }
    for (const m of p.medications || []) {
      if (m.status === "administered") {
        const a = person(m.nurseName);
        if (a) a.medicationsGiven += 1;
      }
    }
    for (const e of p.routingHistory || []) {
      const a = person(e.authorizedBy);
      if (a) a.patientsRouted += 1;
    }
  }

  const ageBand = (age: number) =>
    age < 5 ? "Under 5" : age < 18 ? "5 to 17" : age < 40 ? "18 to 39" : age < 60 ? "40 to 59" : "60 and above";
  const bandOrder = ["Under 5", "5 to 17", "18 to 39", "40 to 59", "60 and above"];

  return {
    totals,
    byStation: DEPTS.map((dept) => ({
      dept,
      name: DEPARTMENTS_METADATA[dept].shortName,
      count: patients.filter((p) => p.currentDepartment === dept).length,
    })),
    avgMinutesAtStation: DEPTS.filter((d) => stationTime.has(d)).map((dept) => {
      const t = stationTime.get(dept)!;
      return {
        dept,
        name: DEPARTMENTS_METADATA[dept].shortName,
        avgMinutes: Math.round((t.total / t.visits) * 10) / 10,
        visits: t.visits,
      };
    }),
    avgMinutesToDischarge: dischargeMinutes.length
      ? Math.round((dischargeMinutes.reduce((a, b) => a + b, 0) / dischargeMinutes.length) * 10) / 10
      : null,
    topDiagnoses: Array.from(dxCounts.values()).sort((a, b) => b.count - a.count).slice(0, 15),
    uncodedConsultations: uncoded,
    demographics: {
      gender: countBy(patients, (p) => p.gender),
      payment: countBy(patients, (p) => p.paymentType),
      ageGroups: bandOrder
        .map((label) => ({ label, count: patients.filter((p) => ageBand(Number(p.age) || 0) === label).length }))
        .filter((g) => g.count > 0),
    },
    activity: Array.from(activity.values()).sort(
      (a, b) =>
        b.patientsRegistered + b.vitalsRecorded + b.consultations + b.labResults + b.imagingReports + b.medicationsGiven -
        (a.patientsRegistered + a.vitalsRecorded + a.consultations + a.labResults + a.imagingReports + a.medicationsGiven)
    ),
  };
}
