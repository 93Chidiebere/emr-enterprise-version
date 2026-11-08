"use client";

import React, { createContext, useContext, useState, useEffect, useRef, ReactNode } from "react";
import { useAuth } from "@/context/AuthContext";
import {
  Patient,
  RoleId,
  Department,
  HOSPITAL_ROLES,
  VitalsRecord,
  DoctorNote,
  LabOrder,
  RadiologyOrder,
  MedicationAdministration,
  RoutingEvent,
  PatientDetailsInput,
} from "@/types/emr";
import { INITIAL_DEMO_PATIENTS } from "@/lib/demo-data";

interface EMRContextType {
  patients: Patient[];
  loading: boolean;
  activeRole: RoleId;
  activeStaffName: string;
  selectedPatient: Patient | null;
  filterDepartment: Department | "ALL";
  searchQuery: string;
  setActiveRole: (role: RoleId) => void;
  setActiveStaffName: (name: string) => void;
  setSelectedPatient: (patient: Patient | null) => void;
  setFilterDepartment: (dept: Department | "ALL") => void;
  setSearchQuery: (query: string) => void;
  registerPatient: (data: Partial<Patient>, initialRoute?: Department, reason?: string) => Promise<Patient>;
  recordVitals: (patientId: string, vitals: Omit<VitalsRecord, "id" | "timestamp" | "takenBy">, nextDept?: Department, routingReason?: string) => Promise<void>;
  saveDoctorConsultation: (
    patientId: string,
    notes: Omit<DoctorNote, "id" | "timestamp" | "doctorName">,
    labOrders: Omit<LabOrder, "id" | "timestampOrdered" | "doctorName" | "status">[],
    radiologyOrders: Omit<RadiologyOrder, "id" | "timestampOrdered" | "doctorName" | "status">[],
    medications: Omit<MedicationAdministration, "id" | "timestampOrdered" | "doctorName" | "status">[],
    routeToDept?: Department,
    routingReason?: string
  ) => Promise<void>;
  completeLabOrder: (
    patientId: string,
    orderId: string,
    resultFindings: string,
    quantitativeValue?: string,
    referenceRange?: string,
    scientistComments?: string,
    routeToDept?: Department,
    routingReason?: string
  ) => Promise<void>;
  completeRadiologyOrder: (
    patientId: string,
    orderId: string,
    findingsReport: string,
    impression: string,
    routeToDept?: Department,
    routingReason?: string
  ) => Promise<void>;
  administerMedication: (
    patientId: string,
    medId: string,
    injectionSite?: string,
    nurseNotes?: string,
    routeToDept?: Department,
    routingReason?: string
  ) => Promise<void>;
  transferPatient: (patientId: string, targetDept: Department, reason: string) => Promise<void>;
  dischargePatient: (patientId: string, dischargeReason: string) => Promise<void>;
  resetToDemoCases: (sessionName?: string) => Promise<void>;
  /** name of the active class session (live mode only) */
  sessionName: string | null;
  /** the station a student confirmed for this class session (null for teachers and visitors) */
  sessionRole: RoleId | null;
  /** true while a signed-in student still has to confirm their station for this session */
  needsRolePick: boolean;
  chooseSessionRole: (role: RoleId) => Promise<{ success: boolean; error?: string }>;
  /** Front Desk: correct a patient's personal details (e.g. add a missing phone number) */
  updatePatientDetails: (patientId: string, details: PatientDetailsInput) => Promise<{ success: boolean; error?: string }>;
  refresh: () => Promise<void>;
  /** true when a user is signed in: records are real, shared, and start from zero */
  isLive: boolean;
  /** set when the server could not be reached / saved */
  syncError: string | null;
  /** how the server stores live records (ephemeral = not durable on this host) */
  storageInfo: { storage: string; ephemeral: boolean } | null;
}

const EMRContext = createContext<EMRContextType | undefined>(undefined);

export function EMRProvider({ children }: { children: ReactNode }) {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(true);
  const { currentUser, authReady, expireSession } = useAuth();
  const isLive = !!currentUser;
  const [syncError, setSyncError] = useState<string | null>(null);
  const [storageInfo, setStorageInfo] = useState<{ storage: string; ephemeral: boolean } | null>(null);
  const [sessionName, setSessionName] = useState<string | null>(null);
  const [sessionRole, setSessionRole] = useState<RoleId | null>(null);
  const [needsRolePick, setNeedsRolePick] = useState(false);
  // last change counter / session seen from the server (used for cheap change checks)
  const revRef = useRef<number | null>(null);
  const sessionIdRef = useRef<string | null>(null);
  // patient id -> time of our last write (so a refresh can't overwrite fresh local changes)
  const recentWrites = useRef<Map<string, number>>(new Map());
  const [activeRole, setActiveRole] = useState<RoleId>("director");
  const [activeStaffName, setActiveStaffName] = useState<string>("Clinical Supervisor");
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [filterDepartment, setFilterDepartment] = useState<Department | "ALL">("ALL");
  const [searchQuery, setSearchQuery] = useState("");

  // Sync role title to staff name if user hasn't customized
  // (skipped for signed-in accounts so their own name is never overwritten)
  useEffect(() => {
    if (currentUser) return;
    const roleMeta = HOSPITAL_ROLES.find((r) => r.id === activeRole);
    if (roleMeta) {
      if (activeRole === "receptionist") setActiveStaffName("Staff Officer M. Bello (REC)");
      else if (activeRole === "triage_nurse") setActiveStaffName("Staff Nurse R. Johnson (TRG)");
      else if (activeRole === "doctor") setActiveStaffName("Dr. K. Adeyemi, FWACP (DOC)");
      else if (activeRole === "mls") setActiveStaffName("MLS E. Chukwuma, AMLSCN (MLS)");
      else if (activeRole === "radiographer") setActiveStaffName("Radiographer S. Ojo (RAD)");
      else if (activeRole === "treatment_nurse") setActiveStaffName("Pharmacist T. Dike (PHM)");
      else setActiveStaffName("Prof. J. C. Okon, Medical Director");
    }
  }, [activeRole, currentUser]);

  // ---- Data modes ----
  // Not signed in  -> demo patients, kept only in this browser (never sent to the server).
  // Signed in      -> live class records from the server; they start at zero.
  const DEMO_KEY = "trinity_point_demo_patients";
  const LIVE_CACHE_KEY = "trinity_point_live_cache";
  const RECENT_MS = 6000;

  const fetchPatients = async (opts?: { silent?: boolean }) => {
    if (!isLive) {
      try {
        const cached = localStorage.getItem(DEMO_KEY);
        if (cached) {
          setPatients(JSON.parse(cached));
          setLoading(false);
          return;
        }
      } catch {
        // ignore parse error and use the template below
      }
      setPatients(JSON.parse(JSON.stringify(INITIAL_DEMO_PATIENTS)));
      setLoading(false);
      return;
    }

    if (!opts?.silent) setLoading(true);
    try {
      const res = await fetch("/api/patients", { cache: "no-store" });
      if (res.status === 401) {
        expireSession();
        setLoading(false);
        return;
      }
      if (res.status === 503) {
        const j = await res.json().catch(() => ({}));
        if (j?.error === "AUTH_NOT_CONFIGURED") {
          setSyncError("Sign-in is not fully set up yet. Ask the administrator to set AUTH_SECRET in Vercel.");
          setPatients([]);
          setLoading(false);
          return;
        }
        if (j?.error === "DB_NOT_CONFIGURED") {
          setSyncError("The database is not connected yet. Ask the administrator to finish the database setup.");
          setPatients([]);
          setLoading(false);
          return;
        }
      }
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        setSyncError(
          j?.message
            ? `Server problem: ${j.message}`
            : `The server returned an error (${res.status}). Open /api/health to see what is missing.`
        );
        if (!opts?.silent) {
          try {
            const cached = localStorage.getItem(LIVE_CACHE_KEY);
            setPatients(cached ? JSON.parse(cached) : []);
          } catch {
            setPatients([]);
          }
        }
        setLoading(false);
        return;
      }
      const json = await res.json();
      const server: Patient[] = Array.isArray(json.data) ? json.data : [];
      revRef.current = typeof json.rev === "number" ? json.rev : null;
      sessionIdRef.current = json.session?.id ?? null;
      setSessionName(json.session?.name ?? null);
      setSessionRole((json.myRole as RoleId) || null);
      setNeedsRolePick(!!json.needsRole);
      setStorageInfo({ storage: json.storage || "turso", ephemeral: !!json.ephemeral });
      setSyncError(null);

      const now = Date.now();
      recentWrites.current.forEach((t, id) => {
        if (now - t > RECENT_MS) recentWrites.current.delete(id);
      });
      setPatients((prev) => {
        const localById = new Map(prev.map((p) => [p.id, p]));
        const merged = server.map((sp) =>
          recentWrites.current.has(sp.id) && localById.has(sp.id) ? (localById.get(sp.id) as Patient) : sp
        );
        prev.forEach((lp) => {
          if (recentWrites.current.has(lp.id) && !server.some((sp) => sp.id === lp.id)) merged.unshift(lp);
        });
        return merged;
      });
      try {
        localStorage.setItem(LIVE_CACHE_KEY, JSON.stringify(server));
      } catch {
        // storage full or unavailable
      }
    } catch {
      setSyncError("Cannot reach the server. Showing the last saved copy; new changes may not be shared.");
      if (!opts?.silent) {
        try {
          const cached = localStorage.getItem(LIVE_CACHE_KEY);
          setPatients(cached ? JSON.parse(cached) : []);
        } catch {
          setPatients([]);
        }
      }
    }
    setLoading(false);
  };

  // Load (or reload) whenever we switch between demo and live mode
  useEffect(() => {
    if (!authReady) return;
    setSelectedPatient(null);
    setSessionRole(null);
    setNeedsRolePick(false);
    fetchPatients();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLive, authReady]);

  // While signed in, check (one tiny request) whether anything changed; reload only if it did.
  useEffect(() => {
    if (!isLive) return;
    const tick = async () => {
      if (document.visibilityState !== "visible") return;
      try {
        const res = await fetch("/api/rev", { cache: "no-store" });
        if (res.status === 401) {
          expireSession();
          return;
        }
        if (!res.ok) {
          const bad = await res.json().catch(() => ({}));
          setSyncError(
            bad?.message
              ? `Server problem: ${bad.message}`
              : `The server returned an error (${res.status}). Open /api/health to see what is missing.`
          );
          return;
        }
        const j = await res.json();
        if (j.rev !== revRef.current || j.sessionId !== sessionIdRef.current) {
          await fetchPatients({ silent: true });
        } else {
          // the earlier problem is gone: clear its notice
          setSyncError((cur) =>
            cur && (cur.startsWith("Cannot reach") || cur.startsWith("Server problem") || cur.startsWith("The server returned"))
              ? null
              : cur
          );
        }
      } catch {
        setSyncError("Cannot reach the server. Showing the last saved copy; new changes may not be shared.");
      }
    };
    const timer = setInterval(tick, 10000);
    document.addEventListener("visibilitychange", tick);
    return () => {
      clearInterval(timer);
      document.removeEventListener("visibilitychange", tick);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLive]);

  // Keep selectedPatient updated when master list updates
  useEffect(() => {
    if (selectedPatient) {
      const updated = patients.find((p) => p.id === selectedPatient.id);
      if (updated) setSelectedPatient(updated);
    }
  }, [patients]);

  const savePatientToRemote = async (updatedPatient: Patient) => {
    // Optimistic local update
    setPatients((prev) => {
      const next = prev.map((p) => (p.id === updatedPatient.id ? updatedPatient : p));
      if (!isLive) {
        try {
          localStorage.setItem(DEMO_KEY, JSON.stringify(next));
        } catch {
          // ignore
        }
      }
      return next;
    });

    if (!isLive) return; // demo mode never talks to the server

    recentWrites.current.set(updatedPatient.id, Date.now());
    try {
      const res = await fetch(`/api/patients/${updatedPatient.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updatedPatient),
      });
      if (res.status === 401) {
        expireSession();
        return;
      }
      if (res.status === 409) {
        setSyncError("This class session was closed by the teacher, so your last change was not saved.");
        return;
      }
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        setSyncError(j?.message ? `Could not save the last change: ${j.message}` : "The last change could not be saved to the server.");
        return;
      }
      recentWrites.current.set(updatedPatient.id, Date.now());
      setSyncError(null);
    } catch {
      setSyncError("The last change could not be saved to the server. Check the connection and repeat it.");
    }
  };

  const registerPatient = async (
    data: Partial<Patient>,
    initialRoute: Department = "TRIAGE",
    reason: string = "Patient enrolled at Front Desk and routed for clinical assessment."
  ): Promise<Patient> => {
    // LIVE: the server issues the next hospital number (1, 2, 3 ...) so there are no duplicates
    if (isLive) {
      const res = await fetch("/api/patients", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...data,
          currentDepartment: initialRoute,
          initialReason: reason,
          registeredBy: activeStaffName,
        }),
      });
      if (res.status === 401) {
        expireSession();
        throw new Error("Your sign-in has expired. Please sign in again.");
      }
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j?.message ? `The patient could not be saved. ${j.message}` : "The new patient could not be saved to the server.");
      }
      const json = await res.json();
      const created: Patient = json.data;
      recentWrites.current.set(created.id, Date.now());
      setPatients((prev) => [created, ...prev.filter((p) => p.id !== created.id)]);
      setSyncError(null);
      return created;
    }

    // DEMO: local only
    const nextSeq = patients.length + 101;
    const hospitalNumber = `TPH-2026-${String(nextSeq).padStart(5, "0")}`;
    const newId = `pat-${Date.now()}`;

    const newPatient: Patient = {
      id: newId,
      hospitalNumber,
      fullName: data.fullName || "Unnamed Patient",
      age: Number(data.age) || 0,
      gender: data.gender || "Other",
      dateOfBirth: data.dateOfBirth || "2000-01-01",
      phoneNumber: data.phoneNumber || "",
      address: data.address || "",
      nextOfKin: data.nextOfKin || { name: "", relation: "", phone: "" },
      paymentType: data.paymentType || "Out-of-Pocket / Cash",
      registeredAt: new Date().toISOString(),
      registeredBy: activeStaffName,
      currentDepartment: initialRoute,
      lastUpdated: new Date().toISOString(),
      status: "Active",
      vitalsHistory: [],
      doctorNotes: [],
      labOrders: [],
      radiologyOrders: [],
      medications: [],
      routingHistory: [
        {
          id: `rt-${Date.now()}`,
          timestamp: new Date().toISOString(),
          fromDepartment: "RECEPTION",
          toDepartment: initialRoute,
          authorizedBy: activeStaffName,
          reason,
        },
      ],
    };

    setPatients((prev) => {
      const next = [newPatient, ...prev];
      try {
        localStorage.setItem(DEMO_KEY, JSON.stringify(next));
      } catch {
        // ignore
      }
      return next;
    });
    return newPatient;
  };

  const recordVitals = async (
    patientId: string,
    vitals: Omit<VitalsRecord, "id" | "timestamp" | "takenBy">,
    nextDept: Department = "CONSULTATION",
    routingReason: string = "Vitals recorded; patient routed for clinical consultation."
  ) => {
    const p = patients.find((pat) => pat.id === patientId);
    if (!p) return;

    const newVitalsRecord: VitalsRecord = {
      ...vitals,
      id: `vit-${Date.now()}`,
      timestamp: new Date().toISOString(),
      takenBy: activeStaffName,
    };

    const newRouting: RoutingEvent = {
      id: `rt-${Date.now()}`,
      timestamp: new Date().toISOString(),
      fromDepartment: p.currentDepartment,
      toDepartment: nextDept,
      authorizedBy: activeStaffName,
      reason: routingReason,
    };

    const updated: Patient = {
      ...p,
      vitalsHistory: [newVitalsRecord, ...p.vitalsHistory],
      currentDepartment: nextDept,
      routingHistory: [...p.routingHistory, newRouting],
      lastUpdated: new Date().toISOString(),
    };

    await savePatientToRemote(updated);
  };

  const saveDoctorConsultation = async (
    patientId: string,
    notes: Omit<DoctorNote, "id" | "timestamp" | "doctorName">,
    newLabOrders: Omit<LabOrder, "id" | "timestampOrdered" | "doctorName" | "status">[],
    newRadiologyOrders: Omit<RadiologyOrder, "id" | "timestampOrdered" | "doctorName" | "status">[],
    newMedications: Omit<MedicationAdministration, "id" | "timestampOrdered" | "doctorName" | "status">[],
    routeToDept?: Department,
    routingReason?: string
  ) => {
    const p = patients.find((pat) => pat.id === patientId);
    if (!p) return;

    const newNote: DoctorNote = {
      ...notes,
      id: `doc-${Date.now()}`,
      timestamp: new Date().toISOString(),
      doctorName: activeStaffName,
    };

    const createdLabs: LabOrder[] = newLabOrders.map((lo, idx) => ({
      ...lo,
      id: `lab-${Date.now()}-${idx}`,
      timestampOrdered: new Date().toISOString(),
      doctorName: activeStaffName,
      status: "pending",
    }));

    const createdRads: RadiologyOrder[] = newRadiologyOrders.map((ro, idx) => ({
      ...ro,
      id: `rad-${Date.now()}-${idx}`,
      timestampOrdered: new Date().toISOString(),
      doctorName: activeStaffName,
      status: "pending",
    }));

    const createdMeds: MedicationAdministration[] = newMedications.map((m, idx) => ({
      ...m,
      id: `med-${Date.now()}-${idx}`,
      timestampOrdered: new Date().toISOString(),
      doctorName: activeStaffName,
      status: "pending",
    }));

    // Determine target department automatically if not explicitly given
    let target = routeToDept || p.currentDepartment;
    let defReason = routingReason || "Doctor consultation completed.";
    if (!routeToDept) {
      if (createdLabs.length > 0) {
        target = "LABORATORY";
        defReason = `Referred to Medical Laboratory for ${createdLabs.length} investigation(s).`;
      } else if (createdRads.length > 0) {
        target = "RADIOLOGY";
        defReason = `Referred to Diagnostic Imaging for ${createdRads.length} study(ies).`;
      } else if (createdMeds.length > 0) {
        target = "TREATMENT";
        defReason = `Referred to Pharmacy for dispensing and administration of prescribed therapy.`;
      }
    }

    const newRouting: RoutingEvent = {
      id: `rt-${Date.now()}`,
      timestamp: new Date().toISOString(),
      fromDepartment: p.currentDepartment,
      toDepartment: target,
      authorizedBy: activeStaffName,
      reason: defReason,
    };

    const updated: Patient = {
      ...p,
      doctorNotes: [newNote, ...p.doctorNotes],
      labOrders: [...p.labOrders, ...createdLabs],
      radiologyOrders: [...p.radiologyOrders, ...createdRads],
      medications: [...p.medications, ...createdMeds],
      currentDepartment: target,
      routingHistory: [...p.routingHistory, newRouting],
      lastUpdated: new Date().toISOString(),
    };

    await savePatientToRemote(updated);
  };

  const completeLabOrder = async (
    patientId: string,
    orderId: string,
    resultFindings: string,
    quantitativeValue?: string,
    referenceRange?: string,
    scientistComments?: string,
    routeToDept: Department = "CONSULTATION",
    routingReason: string = "Laboratory test finalized; specimen reports routed back to Physician."
  ) => {
    const p = patients.find((pat) => pat.id === patientId);
    if (!p) return;

    const updatedOrders = p.labOrders.map((lo) => {
      if (lo.id === orderId) {
        return {
          ...lo,
          status: "completed" as const,
          timestampCompleted: new Date().toISOString(),
          scientistName: activeStaffName,
          resultFindings,
          quantitativeValue,
          referenceRange,
          scientistComments,
        };
      }
      return lo;
    });

    const newRouting: RoutingEvent = {
      id: `rt-${Date.now()}`,
      timestamp: new Date().toISOString(),
      fromDepartment: p.currentDepartment,
      toDepartment: routeToDept,
      authorizedBy: activeStaffName,
      reason: routingReason,
    };

    const updated: Patient = {
      ...p,
      labOrders: updatedOrders,
      currentDepartment: routeToDept,
      routingHistory: [...p.routingHistory, newRouting],
      lastUpdated: new Date().toISOString(),
    };

    await savePatientToRemote(updated);
  };

  const completeRadiologyOrder = async (
    patientId: string,
    orderId: string,
    findingsReport: string,
    impression: string,
    routeToDept: Department = "CONSULTATION",
    routingReason: string = "Radiological scan evaluated; imaging findings returned to Physician."
  ) => {
    const p = patients.find((pat) => pat.id === patientId);
    if (!p) return;

    const updatedRads = p.radiologyOrders.map((ro) => {
      if (ro.id === orderId) {
        return {
          ...ro,
          status: "completed" as const,
          timestampCompleted: new Date().toISOString(),
          radiographerName: activeStaffName,
          findingsReport,
          impression,
        };
      }
      return ro;
    });

    const newRouting: RoutingEvent = {
      id: `rt-${Date.now()}`,
      timestamp: new Date().toISOString(),
      fromDepartment: p.currentDepartment,
      toDepartment: routeToDept,
      authorizedBy: activeStaffName,
      reason: routingReason,
    };

    const updated: Patient = {
      ...p,
      radiologyOrders: updatedRads,
      currentDepartment: routeToDept,
      routingHistory: [...p.routingHistory, newRouting],
      lastUpdated: new Date().toISOString(),
    };

    await savePatientToRemote(updated);
  };

  const administerMedication = async (
    patientId: string,
    medId: string,
    injectionSite: string = "Left Deltoid / IV Port",
    nurseNotes: string = "Administered as prescribed without acute adverse event.",
    routeToDept?: Department,
    routingReason?: string
  ) => {
    const p = patients.find((pat) => pat.id === patientId);
    if (!p) return;

    const updatedMeds = p.medications.map((m) => {
      if (m.id === medId) {
        return {
          ...m,
          status: "administered" as const,
          timestampAdministered: new Date().toISOString(),
          nurseName: activeStaffName,
          injectionSite,
          nurseNotes,
        };
      }
      return m;
    });

    const targetDept = routeToDept || p.currentDepartment;
    const reasonText = routingReason || "Medication administration logged by Nursing Staff.";

    const newRouting: RoutingEvent = {
      id: `rt-${Date.now()}`,
      timestamp: new Date().toISOString(),
      fromDepartment: p.currentDepartment,
      toDepartment: targetDept,
      authorizedBy: activeStaffName,
      reason: reasonText,
    };

    const updated: Patient = {
      ...p,
      medications: updatedMeds,
      currentDepartment: targetDept,
      routingHistory: [...p.routingHistory, newRouting],
      lastUpdated: new Date().toISOString(),
    };

    await savePatientToRemote(updated);
  };

  const transferPatient = async (patientId: string, targetDept: Department, reason: string) => {
    const p = patients.find((pat) => pat.id === patientId);
    if (!p) return;

    const newRouting: RoutingEvent = {
      id: `rt-${Date.now()}`,
      timestamp: new Date().toISOString(),
      fromDepartment: p.currentDepartment,
      toDepartment: targetDept,
      authorizedBy: activeStaffName,
      reason: reason || `Patient moved to ${targetDept} station.`,
    };

    const updated: Patient = {
      ...p,
      currentDepartment: targetDept,
      status: targetDept === "DISCHARGED" ? "Discharged" : "Active",
      routingHistory: [...p.routingHistory, newRouting],
      lastUpdated: new Date().toISOString(),
    };

    await savePatientToRemote(updated);
  };

  const dischargePatient = async (patientId: string, dischargeReason: string) => {
    await transferPatient(patientId, "DISCHARGED", dischargeReason || "Clinical episode concluded; discharged home.");
  };

  const chooseSessionRole = async (role: RoleId): Promise<{ success: boolean; error?: string }> => {
    try {
      const res = await fetch("/api/session-role", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role }),
      });
      if (res.status === 401) {
        expireSession();
        return { success: false, error: "Your sign-in has expired. Please sign in again." };
      }
      const j = await res.json().catch(() => ({}));
      if (!res.ok) return { success: false, error: j?.message || "Could not save your station. Please try again." };
      setSessionRole(j.role as RoleId);
      setNeedsRolePick(false);
      await fetchPatients({ silent: true });
      return { success: true };
    } catch {
      return { success: false, error: "Could not reach the server. Check your internet connection." };
    }
  };

  const updatePatientDetails = async (
    patientId: string,
    details: PatientDetailsInput
  ): Promise<{ success: boolean; error?: string }> => {
    // Visitors in demo preview: change the local copy only
    if (!isLive) {
      setPatients((prev) => {
        const next = prev.map((p) =>
          p.id === patientId
            ? {
                ...p,
                fullName: details.fullName,
                age: details.age,
                gender: details.gender,
                dateOfBirth: details.dateOfBirth,
                phoneNumber: details.phoneNumber,
                address: details.address,
                paymentType: details.paymentType as Patient["paymentType"],
                nextOfKin: details.nextOfKin,
                lastUpdated: new Date().toISOString(),
              }
            : p
        );
        try {
          localStorage.setItem(DEMO_KEY, JSON.stringify(next));
        } catch {
          // ignore
        }
        return next;
      });
      return { success: true };
    }

    try {
      const res = await fetch(`/api/patients/${encodeURIComponent(patientId)}/details`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(details),
      });
      if (res.status === 401) {
        expireSession();
        return { success: false, error: "Your sign-in has expired. Please sign in again." };
      }
      const j = await res.json().catch(() => ({}));
      if (!res.ok) return { success: false, error: j?.message || "The details could not be saved." };
      recentWrites.current.set(patientId, Date.now());
      setPatients((prev) => prev.map((p) => (p.id === patientId ? (j.data as Patient) : p)));
      return { success: true };
    } catch {
      return { success: false, error: "Could not reach the server. Check your internet connection." };
    }
  };

  const resetToDemoCases = async (newSessionName?: string) => {
    // LIVE: close the current class session (its data is kept for reports) and start a new empty one
    if (isLive) {
      setLoading(true);
      try {
        const res = await fetch("/api/sessions", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: newSessionName || "" }),
        });
        if (res.status === 401 || res.status === 503) {
          setSyncError("Only a signed-in teacher can start a new session. Sign out and sign in again as a teacher.");
          setLoading(false);
          return;
        }
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        setSyncError(null);
        await fetchPatients({ silent: true });
      } catch {
        setSyncError("A new session could not be started. Check the connection and try again.");
      }
      setLoading(false);
      return;
    }

    // DEMO: restore the sample patients (this browser only)
    const resetClone = JSON.parse(JSON.stringify(INITIAL_DEMO_PATIENTS));
    setPatients(resetClone);
    try {
      localStorage.setItem(DEMO_KEY, JSON.stringify(resetClone));
    } catch {
      // ignore
    }
  };

  return (
    <EMRContext.Provider
      value={{
        patients,
        loading,
        activeRole,
        activeStaffName,
        selectedPatient,
        filterDepartment,
        searchQuery,
        setActiveRole,
        setActiveStaffName,
        setSelectedPatient,
        setFilterDepartment,
        setSearchQuery,
        registerPatient,
        recordVitals,
        saveDoctorConsultation,
        completeLabOrder,
        completeRadiologyOrder,
        administerMedication,
        transferPatient,
        dischargePatient,
        resetToDemoCases,
        refresh: fetchPatients,
        isLive,
        syncError,
        storageInfo,
        sessionName,
        sessionRole,
        needsRolePick,
        chooseSessionRole,
        updatePatientDetails,
      }}
    >
      {children}
    </EMRContext.Provider>
  );
}

export function useEMR() {
  const context = useContext(EMRContext);
  if (!context) {
    throw new Error("useEMR must be used within an EMRProvider");
  }
  return context;
}
