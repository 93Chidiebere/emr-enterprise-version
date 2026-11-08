"use client";

import React, { useState, useEffect } from "react";
import { useEMR } from "@/context/EMRContext";
import { useAuth } from "@/context/AuthContext";
import { Patient, RoleId, HOSPITAL_ROLES, DEPARTMENTS_METADATA } from "@/types/emr";
import { Navbar } from "@/components/layout/Navbar";
import { canSwitchRole, canUseMasterView } from "@/lib/role-access";
import { HospitalPipelineBar } from "@/components/pipeline/HospitalPipelineBar";
import { ReceptionWorkstation } from "@/components/workstations/ReceptionWorkstation";
import { TriageWorkstation } from "@/components/workstations/TriageWorkstation";
import { DoctorWorkstation } from "@/components/workstations/DoctorWorkstation";
import { LabWorkstation } from "@/components/workstations/LabWorkstation";
import { RadiologyWorkstation } from "@/components/workstations/RadiologyWorkstation";
import { TreatmentWorkstation } from "@/components/workstations/TreatmentWorkstation";
import { MasterDirectoryWorkstation } from "@/components/workstations/MasterDirectoryWorkstation";
import { NewPatientModal } from "@/components/intake/NewPatientModal";
import { PatientDossierModal } from "@/components/dossier/PatientDossierModal";
import { MyPatientsPanel } from "@/components/shared/MyPatientsPanel";
import { EditPatientDetailsModal } from "@/components/intake/EditPatientDetailsModal";
import { RolePickerDialog } from "@/components/auth/RolePickerDialog";
import { RequiredEmailDialog } from "@/components/auth/RequiredEmailDialog";
import { TransferModal } from "@/components/shared/TransferModal";
import { HeroLanding } from "@/components/home/HeroLanding";
import {
  FileText,
  Activity,
  Stethoscope,
  FlaskConical,
  Scan,
  Syringe,
  Layers,
  ArrowRight,
} from "lucide-react";

export default function Home() {
  const { activeRole, setActiveRole, setActiveStaffName, isLive, syncError, storageInfo, sessionRole, needsRolePick } = useEMR();
  const [dismissedNotice, setDismissedNotice] = useState<string>("");
  const { currentUser, isDemoMode, authReady, authWarnings } = useAuth();

  const [intakeOpen, setIntakeOpen] = useState(false);
  const [dossierPatient, setDossierPatient] = useState<Patient | null>(null);
  const [transferPatient, setTransferPatient] = useState<Patient | null>(null);

  const isStudent = !!currentUser && !currentUser.isAdmin;

  // Teachers start in Master View. Students act as the station they confirmed for this class
  // session (until they confirm, they sit on their registered station behind the choice screen).
  useEffect(() => {
    if (currentUser) setActiveRole(isStudent ? sessionRole ?? (currentUser.assignedRole as RoleId) : currentUser.assignedRole);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUser?.id, isStudent, sessionRole]);

  // A student can never leave the station fixed for the session
  useEffect(() => {
    if (isStudent && sessionRole && activeRole !== sessionRole) setActiveRole(sessionRole);
  }, [isStudent, sessionRole, activeRole, setActiveRole]);

  const [dossierReadOnly, setDossierReadOnly] = useState(false);
  const [editPatient, setEditPatient] = useState<Patient | null>(null);
  const openChart = (p: Patient) => {
    setDossierReadOnly(false);
    setDossierPatient(p);
  };

  // The signing name always shows the station currently being used, e.g. "Ada Obi (REC)"
  useEffect(() => {
    if (currentUser) {
      const badge = HOSPITAL_ROLES.find((r) => r.id === activeRole)?.badge;
      setActiveStaffName(badge ? `${currentUser.fullName} (${badge})` : currentUser.fullName);
    }
  }, [currentUser, activeRole, setActiveStaffName]);

  // Confirmation after enrolling (the patient moves on, so it leaves the Front Desk list)
  const [enrolledNote, setEnrolledNote] = useState("");
  useEffect(() => {
    if (!enrolledNote) return;
    const t = setTimeout(() => setEnrolledNote(""), 9000);
    return () => clearTimeout(t);
  }, [enrolledNote]);

  // Don't render until localStorage auth state has been read
  if (!authReady) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-navy-dark text-amber-300 font-mono text-sm">
        Loading Trinity University Hospital EHR session...
      </div>
    );
  }

  // If not signed in and not in demo mode, render the Grand Hero Landing Page
  if (!currentUser && !isDemoMode) {
    return <HeroLanding />;
  }

  const roleSwitchAllowed = canSwitchRole(currentUser);
  const activeRoleTitle = HOSPITAL_ROLES.find((r) => r.id === activeRole)?.title;

  return (
    <div className="min-h-screen flex flex-col bg-[#071B33] text-charcoal">
      <a href="#main-content" className="skip-link">
        Skip to main content
      </a>
      <div className="sr-only" role="status" aria-live="polite">
        {activeRoleTitle ? `Active station: ${activeRoleTitle}` : ""}
      </div>

      {/* 1. Masthead Navbar */}
      <Navbar onOpenIntake={() => setIntakeOpen(true)} />

      <RequiredEmailDialog />

      {/* Security warning for teachers */}
      {currentUser?.isAdmin && authWarnings.includes("teacher_password_weak") && (
        <div role="alert" className="bg-red-700 text-white text-xs px-4 py-2 text-center font-semibold">
          Security warning: the teacher password is the old default (or too short) and is published in the public code. Change
          TEACHER_PASSWORD in Vercel, then redeploy.
        </div>
      )}

      {/* Database connection warning if live storage has issues (can be dismissed; returns if the message changes) */}
      {isLive && (syncError || storageInfo?.ephemeral) && (syncError ?? "ephemeral") !== dismissedNotice && (
        <div
          role="alert"
          className="bg-amber-100 border-b border-amber-300 text-amber-900 text-xs px-4 py-2 flex items-center justify-center gap-3 font-bold"
        >
          <span className="text-center">
            {syncError ??
              "The shared database is not connected on this host, so records may differ between devices. Ask the administrator to connect it."}{" "}
            <a href="/api/health" target="_blank" rel="noreferrer" className="underline font-semibold">
              Check setup status
            </a>
          </span>
          <button
            type="button"
            onClick={() => setDismissedNotice(syncError ?? "ephemeral")}
            aria-label="Dismiss this notice"
            className="shrink-0 px-2 py-0.5 border border-amber-400 hover:bg-amber-200 text-amber-900 leading-none"
          >
            ×
          </button>
        </div>
      )}

      {/* 2. Live Hospital Pipeline Bar */}
      <HospitalPipelineBar />

      {/* 3. Station Switcher Strip */}
      <div className={`bg-[#0B2545] border-b border-[#1E4E79] text-white ${roleSwitchAllowed ? "" : "hidden sm:block"}`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-2 flex flex-wrap items-center justify-between gap-2 text-xs">
          <div className="flex items-center gap-2">
            <span className="font-mono text-[10px] uppercase tracking-wider text-amber-300 font-bold">
              Active Station View:
            </span>
            <span className="font-sans font-bold text-white text-sm">
              {activeRoleTitle}
            </span>
          </div>

          {/* Station Locked Notice for Students */}
          {!roleSwitchAllowed && (
            <p className="text-[11px] text-slate-300">
              Your station is fixed for this class session. Your teacher can start a new session to let you change.
            </p>
          )}

          {/* Quick Station Tab Bar (instructors and demo view only) */}
          {roleSwitchAllowed && (
            <nav
              aria-label="Hospital stations"
              className="flex w-full md:w-auto min-w-0 items-center gap-1 overflow-x-auto py-1 snap-x"
            >
              {[
                { id: "receptionist" as RoleId, label: "Front Desk", icon: FileText },
                { id: "triage_nurse" as RoleId, label: "Triage Vitals", icon: Activity },
                { id: "doctor" as RoleId, label: "Doctor Consult", icon: Stethoscope },
                { id: "mls" as RoleId, label: "MLS Lab", icon: FlaskConical },
                { id: "radiographer" as RoleId, label: "Radiology", icon: Scan },
                { id: "treatment_nurse" as RoleId, label: "Pharmacy", icon: Syringe },
                { id: "director" as RoleId, label: "Master Registry", icon: Layers },
              ]
                .filter((tab) => tab.id !== "director" || canUseMasterView(currentUser))
                .map((tab) => {
                const Icon = tab.icon;
                const isCurrent = activeRole === tab.id;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    aria-pressed={isCurrent}
                    onClick={() => setActiveRole(tab.id)}
                    className={`px-3 py-1.5 sm:px-2.5 sm:py-1 shrink-0 snap-start flex items-center gap-1.5 transition-colors font-mono text-[11px] border whitespace-nowrap rounded-[2px] ${
                      isCurrent
                        ? "bg-brand text-navy-dark border-brand font-bold shadow-sm"
                        : "bg-[#071B33] text-slate-300 border-[#1E4E79] hover:bg-[#0F325E] hover:text-white hover:border-brand"
                    }`}
                  >
                    <Icon aria-hidden="true" className={`w-3 h-3 ${isCurrent ? "text-navy-dark" : "text-amber-300"}`} />
                    <span>{tab.label}</span>
                  </button>
                );
              })}
            </nav>
          )}
        </div>
      </div>

      {/* 4. Main Workstation Area */}
      <main id="main-content" tabIndex={-1} className="outline-none flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 w-full">
        {activeRole === "receptionist" && (
          <ReceptionWorkstation
            onOpenIntake={() => setIntakeOpen(true)}
            onEditDetails={(p) => setEditPatient(p)}
            onOpenDossier={openChart}
            onOpenTransfer={(p) => setTransferPatient(p)}
          />
        )}

        {activeRole === "triage_nurse" && (
          <TriageWorkstation
            onOpenDossier={openChart}
            onOpenTransfer={(p) => setTransferPatient(p)}
          />
        )}

        {activeRole === "doctor" && (
          <DoctorWorkstation
            onOpenDossier={openChart}
            onOpenTransfer={(p) => setTransferPatient(p)}
          />
        )}

        {activeRole === "mls" && (
          <LabWorkstation
            onOpenDossier={openChart}
            onOpenTransfer={(p) => setTransferPatient(p)}
          />
        )}

        {activeRole === "radiographer" && (
          <RadiologyWorkstation
            onOpenDossier={openChart}
            onOpenTransfer={(p) => setTransferPatient(p)}
          />
        )}

        {activeRole === "treatment_nurse" && (
          <TreatmentWorkstation
            onOpenDossier={openChart}
            onOpenTransfer={(p) => setTransferPatient(p)}
          />
        )}

        {activeRole === "director" && (
          <MasterDirectoryWorkstation
            onOpenDossier={openChart}
            onOpenTransfer={(p) => setTransferPatient(p)}
          />
        )}

        {/* Look back at the patients this student worked on (read-only; Front Desk can edit details) */}
        {isLive && isStudent && sessionRole && (
          <MyPatientsPanel
            onOpenChart={(p) => {
              setDossierReadOnly(true);
              setDossierPatient(p);
            }}
            onEditDetails={(p) => setEditPatient(p)}
          />
        )}
      </main>

      {/* 5. Editorial Footer */}
      <footer className="bg-[#051426] border-t border-[#1E4E79] py-6 mt-12 text-xs text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <img
              src="/trinity-logo.png"
              alt="Trinity University"
              className="h-8 w-auto object-contain shrink-0 rounded-[2px] bg-white p-0.5"
            />
            <div>
              <p className="font-sans font-bold text-white text-sm">
                Trinity University Hospital EHR
              </p>
              <p className="text-[11px] text-amber-300 font-sans">
                Trinity University &bull; Yaba, Lagos &bull; Clinical Training & Simulation
              </p>
            </div>
          </div>

          <ol
            aria-label="Patient journey"
            className="flex flex-wrap items-center gap-x-2 gap-y-1 font-mono text-[10px] text-slate-300 uppercase"
          >
            {["Intake", "Triage", "Consultation", "MLS Lab", "Pharmacy", "Discharge"].map(
              (step, i, arr) => (
                <li key={step} className="flex items-center gap-2">
                  <span>{step}</span>
                  {i < arr.length - 1 && (
                    <ArrowRight aria-hidden="true" className="w-2.5 h-2.5 text-brand" />
                  )}
                </li>
              )
            )}
          </ol>
        </div>
      </footer>

      {/* 6. Modals */}
      {intakeOpen && (
        <NewPatientModal
          onClose={() => setIntakeOpen(false)}
          onEnrolled={(p) =>
            setEnrolledNote(
              `${p.fullName} (${p.hospitalNumber}) was enrolled and sent to ${DEPARTMENTS_METADATA[p.currentDepartment]?.shortName ?? p.currentDepartment}.`
            )
          }
        />
      )}
      {enrolledNote && (
        <div
          role="status"
          className="fixed bottom-4 left-1/2 -translate-x-1/2 z-[60] max-w-[92vw] bg-navy-dark text-amber-300 border border-brand px-4 py-3 text-sm font-semibold shadow-lg"
        >
          {enrolledNote}
        </div>
      )}

      {dossierPatient && (
        <PatientDossierModal
          patient={dossierPatient}
          readOnly={dossierReadOnly}
          onClose={() => setDossierPatient(null)}
        />
      )}

      {editPatient && <EditPatientDetailsModal patient={editPatient} onClose={() => setEditPatient(null)} />}

      {/* Students confirm their station at the start of each class session */}
      {isLive && isStudent && needsRolePick && <RolePickerDialog />}

      {transferPatient && (
        <TransferModal
          patient={transferPatient}
          onClose={() => setTransferPatient(null)}
        />
      )}
    </div>
  );
}
