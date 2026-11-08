"use client";

import React, { useEffect, useId, useRef, useState } from "react";
import { useEMR } from "@/context/EMRContext";
import { useAuth } from "@/context/AuthContext";
import { HOSPITAL_ROLES, RoleId } from "@/types/emr";
import { canSwitchRole, canUseMasterView } from "@/lib/role-access";
import { useDialogA11y } from "@/hooks/useDialogA11y";
import { RenameAccountModal } from "@/components/auth/RenameAccountModal";
import {
  UserCheck,
  RotateCcw,
  Plus,
  Clock,
  ChevronDown,
  ShieldAlert,
  LogOut,
  User,
  Lock,
  BarChart3,
  Pencil,
  Sparkles,
  ShieldCheck,
  GraduationCap,
} from "lucide-react";

interface NavbarProps {
  onOpenIntake: () => void;
}

/* ------------------------------------------------------------------ */
/* Role menu (only rendered for instructors / directors)               */
/* ------------------------------------------------------------------ */
function RoleMenu({
  activeRole,
  onSelect,
  roles,
}: {
  activeRole: RoleId;
  onSelect: (id: RoleId) => void;
  roles: typeof HOSPITAL_ROLES;
}) {
  const [open, setOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const itemRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const menuId = useId();

  const current = HOSPITAL_ROLES.find((r) => r.id === activeRole) || HOSPITAL_ROLES[0];

  const closeAndReturnFocus = () => {
    setOpen(false);
    buttonRef.current?.focus();
  };

  useEffect(() => {
    if (!open) return;

    const activeIndex = Math.max(
      0,
      roles.findIndex((r) => r.id === activeRole)
    );
    itemRefs.current[activeIndex]?.focus();

    const handlePointerDown = (e: MouseEvent | TouchEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("touchstart", handlePointerDown);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("touchstart", handlePointerDown);
    };
  }, [open, activeRole]);

  const handleMenuKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    const items = itemRefs.current.filter(Boolean) as HTMLButtonElement[];
    if (items.length === 0) return;
    const index = items.indexOf(document.activeElement as HTMLButtonElement);

    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        items[(index + 1) % items.length].focus();
        break;
      case "ArrowUp":
        e.preventDefault();
        items[(index - 1 + items.length) % items.length].focus();
        break;
      case "Home":
        e.preventDefault();
        items[0].focus();
        break;
      case "End":
        e.preventDefault();
        items[items.length - 1].focus();
        break;
      case "Escape":
        e.preventDefault();
        closeAndReturnFocus();
        break;
      case "Tab":
        setOpen(false);
        break;
    }
  };

  return (
    <div className="relative" ref={wrapperRef}>
      <button
        ref={buttonRef}
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={open ? menuId : undefined}
        onClick={() => setOpen((v) => !v)}
        onKeyDown={(e) => {
          if (e.key === "ArrowDown" && !open) {
            e.preventDefault();
            setOpen(true);
          }
        }}
        className="flex items-center gap-2 px-3 py-1.5 min-h-[44px] sm:min-h-0 bg-[#0F325E] border border-paper-border text-white hover:border-brand transition-colors font-medium text-xs rounded-[2px]"
      >
        <span className="font-mono px-1 bg-brand text-navy-dark font-bold text-[10px]">
          {current.badge}
        </span>
        <span className="font-sans text-xs sm:text-sm font-bold text-left">{current.title}</span>
        <ChevronDown
          aria-hidden="true"
          className={`w-3.5 h-3.5 text-slate-300 ml-1 transition-transform ${
            open ? "rotate-180" : ""
          }`}
        />
      </button>

      {open && (
        <div
          id={menuId}
          role="menu"
          aria-label="Select simulated department post"
          onKeyDown={handleMenuKeyDown}
          className="absolute left-0 mt-1 w-[min(20rem,calc(100vw-2rem))] max-h-[70dvh] overflow-y-auto bg-white border border-brand shadow-2xl z-50 divide-y divide-slate-100 rounded-[2px]"
        >
          <div
            aria-hidden="true"
            className="px-3 py-2 bg-[#0B2545] text-[11px] text-amber-300 uppercase font-mono tracking-wider font-bold"
          >
            Switch Active Workstation Station:
          </div>
          {roles.map((r, i) => {
            const selected = activeRole === r.id;
            return (
              <button
                key={r.id}
                ref={(el) => {
                  itemRefs.current[i] = el;
                }}
                type="button"
                role="menuitemradio"
                aria-checked={selected}
                tabIndex={-1}
                onClick={() => {
                  onSelect(r.id);
                  closeAndReturnFocus();
                }}
                className={`w-full text-left px-3 py-2.5 hover:bg-amber-50 focus:bg-amber-50 transition-colors flex items-start gap-2.5 ${
                  selected ? "bg-amber-50/90 font-bold" : ""
                }`}
              >
                <span className="font-mono px-1.5 py-0.5 bg-[#0B2545] text-amber-300 text-[10px] mt-0.5 font-bold">
                  {r.badge}
                </span>
                <span className="flex-1 min-w-0">
                  <span className="font-sans text-xs font-bold text-navy-dark flex flex-wrap items-center justify-between gap-x-2">
                    <span>{r.title}</span>
                    <span className="text-[10px] font-sans text-slate-500 font-normal">
                      {r.cadre}
                    </span>
                  </span>
                  <span className="block text-[11px] text-slate-600 mt-0.5 line-clamp-2">
                    {r.description}
                  </span>
                </span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Admin Session Reset dialog                                          */
/* ------------------------------------------------------------------ */
function ResetConfirmDialog({
  onCancel,
  onResetZero,
  onSeedDemo,
  live,
}: {
  onCancel: () => void;
  onResetZero: (sessionName?: string) => void | Promise<void>;
  onSeedDemo?: () => void | Promise<void>;
  live: boolean;
}) {
  const dialogRef = useDialogA11y<HTMLDivElement>(onCancel);
  const [newSessionName, setNewSessionName] = useState("");
  const sessionInputId = useId();
  const titleId = useId();
  const descId = useId();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-navy-dark/75 backdrop-blur-[2px] p-4">
      <div
        ref={dialogRef}
        role="alertdialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={descId}
        tabIndex={-1}
        className="bg-white border-2 border-brand max-w-lg w-full max-h-[90dvh] overflow-y-auto p-5 sm:p-6 space-y-4 outline-none shadow-2xl rounded-[2px]"
      >
        <div className="flex items-center gap-2 text-red-600">
          <ShieldAlert aria-hidden="true" className="w-5 h-5 shrink-0" />
          <h2 id={titleId} className="font-sans text-base sm:text-lg font-bold text-navy-dark">
            {live ? "Start a New Class Session" : "Classroom Session Management & Reset"}
          </h2>
        </div>
        <p id={descId} className="text-xs text-slate-600 leading-relaxed">
          {live
            ? "This starts a new class session without clearing patient queues. Patients still waiting at a station remain visible to students in the matching station, and all records, movements, notes, results, medications, and edits remain saved. Historical reports are available under All sessions. New patients receive a new session number sequence."
            : "Reset the practice simulation back to initial sample cases or clean the local cache."}
        </p>

        {live && (
          <div>
            <label htmlFor={sessionInputId} className="block text-[11px] font-bold text-slate-700 mb-1">
              Name for the new session (optional)
            </label>
            <input
              id={sessionInputId}
              type="text"
              value={newSessionName}
              onChange={(e) => setNewSessionName(e.target.value)}
              maxLength={80}
              placeholder="e.g. Health Data Management, Week 3"
              className="w-full p-2 border border-slate-300 focus:border-brand text-slate-900 text-xs outline-none"
            />
          </div>
        )}

        {!live && (
        <div className="p-3 bg-amber-50 border border-amber-200 text-[11px] text-amber-900 space-y-1">
          <p className="font-bold">Reset Options:</p>
          <ul className="list-disc list-inside space-y-0.5 text-slate-700">
            <li><strong>Reset Registry to 0:</strong> Wipes all patient admissions, vitals, doctor notes, and lab logs so the next student group starts completely fresh.</li>
            <li><strong>Restore 5 Demo Cases:</strong> Populates the standard patient scenarios for guided classroom lectures.</li>
          </ul>
        </div>
        )}

        <div className="flex flex-col sm:flex-row sm:justify-end gap-2 pt-3 border-t border-slate-200">
          <button
            type="button"
            autoFocus
            onClick={onCancel}
            className="px-3 py-2 text-xs border border-slate-300 text-slate-700 hover:bg-slate-100 font-medium"
          >
            Cancel
          </button>
          {onSeedDemo && (
            <button
              type="button"
              onClick={onSeedDemo}
              className="px-3.5 py-2 text-xs bg-navy text-white hover:bg-navy-dark font-medium border border-navy-border flex items-center justify-center gap-1.5"
            >
              <Sparkles className="w-3.5 h-3.5 text-brand" />
              <span>Restore 5 Demo Cases</span>
            </button>
          )}
          <button
            type="button"
            onClick={() => onResetZero(newSessionName)}
            className={`px-4 py-2 text-xs text-white font-bold flex items-center justify-center gap-1.5 ${
              live ? "bg-navy hover:bg-navy-dark" : "bg-red-600 hover:bg-red-700"
            }`}
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>{live ? "Start New Session (keeps all data)" : "Reset Registry to 0 (Clean Fresh Class)"}</span>
          </button>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Navbar Component                                                    */
/* ------------------------------------------------------------------ */
export function Navbar({ onOpenIntake }: NavbarProps) {
  const {
    activeRole,
    setActiveRole,
    activeStaffName,
    setActiveStaffName,
    resetToDemoCases,
    patients,
    isLive,
    sessionName,
  } = useEMR();

  const { currentUser, logout, isDemoMode, exitDemoMode } = useAuth();

  const [resetConfirmOpen, setResetConfirmOpen] = useState(false);
  const [renameOpen, setRenameOpen] = useState(false);
  const signOffId = useId();

  const roleSwitchAllowed = canSwitchRole(currentUser);
  const currentRoleMeta = HOSPITAL_ROLES.find((r) => r.id === activeRole) || HOSPITAL_ROLES[0];
  // Teachers in Master View see every patient; everyone else only sees the patients at their own station
  const selectableRoles = HOSPITAL_ROLES.filter((r) => r.id !== "director" || canUseMasterView(currentUser));
  const isMasterView = activeRole === "director";
  const activeCount = patients.filter(
    (p) => p.status === "Active" && (isMasterView || p.currentDepartment === currentRoleMeta.department)
  ).length;
  const isTeacherOrAdmin = currentUser?.isAdmin || currentUser?.assignedRole === "director";

  return (
    <>
      <header className="bg-[#0B2545] border-b border-[#1E4E79] text-white md:sticky md:top-0 md:z-30 shadow-md">
        {/* Topmast Institution Bar */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 flex flex-col gap-3 md:flex-row md:items-center md:justify-between border-b border-[#1E4E79]/70">
          <div className="flex items-center gap-3 min-w-0">
            <img
              src="/trinity-logo.png"
              alt="Trinity University"
              className="h-9 sm:h-12 w-auto object-contain shrink-0 rounded-[2px] bg-white p-0.5 shadow-sm"
            />
            <div className="min-w-0">
              <h1 className="font-sans text-base sm:text-xl font-bold tracking-tight text-white leading-tight">
                Trinity University Hospital EHR
              </h1>
              <p className="text-[10px] sm:text-[11px] text-amber-300 font-medium tracking-wide">
                Clinical & Hospital Data Flow Simulation
              </p>
            </div>
          </div>

          {/* Global Classroom Status & Controls */}
          <div className="flex flex-wrap items-center gap-2 sm:gap-3">
            {/* Live vs Demo Indicator */}
            <div
              role="status"
              className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-slate-300 md:border-r border-[#1E4E79] md:pr-3"
            >
              <Clock aria-hidden="true" className="hidden sm:block w-3.5 h-3.5 text-brand" />
              <span
                className={`font-mono px-1.5 py-0.5 text-[10px] uppercase font-bold inline-block max-w-[11rem] sm:max-w-[18rem] truncate align-bottom ${
                  isLive
                    ? "bg-brand text-navy-dark"
                    : "bg-white/10 text-amber-300 border border-white/20"
                }`}
              >
                {isLive ? (sessionName ? `Live: ${sessionName}` : "Live Class Session") : "Demo Preview"}
              </span>
              <span className="font-mono text-white text-xs">
                {isMasterView ? "Active Cases" : "At your station"}: <strong className="text-amber-300">{activeCount}</strong>
              </span>
            </div>

            {/* Signed-in User Identity Badge */}
            {currentUser && (
              <div className="flex items-center gap-2 pl-2.5 pr-1.5 py-1 bg-[#071B33] border border-[#1E4E79] text-xs text-white">
                {currentUser.isAdmin ? (
                  <ShieldCheck aria-hidden="true" className="w-3.5 h-3.5 text-brand shrink-0" />
                ) : (
                  <User aria-hidden="true" className="w-3.5 h-3.5 text-brand shrink-0" />
                )}
                <div className="text-left font-sans min-w-0">
                  <span className="font-bold text-white text-xs block leading-tight truncate max-w-[7rem] sm:max-w-[13rem]">
                    {currentUser.fullName}
                  </span>
                  <span className="text-[10px] text-amber-300 font-mono">
                    {currentUser.isAdmin ? "TEACHER / ADMIN" : HOSPITAL_ROLES.find((r) => r.id === currentUser.assignedRole)?.badge}
                  </span>
                </div>
                {!currentUser.isAdmin && (
                  <button
                    type="button"
                    onClick={() => setRenameOpen(true)}
                    aria-label="Change my name"
                    title="Change my name"
                    className="ml-1 text-slate-400 hover:text-amber-300 transition-colors p-1.5"
                  >
                    <Pencil aria-hidden="true" className="w-3.5 h-3.5" />
                  </button>
                )}
                <button
                  type="button"
                  onClick={logout}
                  aria-label={`Sign out ${currentUser.fullName}`}
                  title="Sign out to home page"
                  className="ml-1 text-slate-400 hover:text-red-400 transition-colors p-1.5"
                >
                  <LogOut aria-hidden="true" className="w-3.5 h-3.5" />
                </button>
              </div>
            )}

            {/* Demo Mode Exit Button */}
            {isDemoMode && !currentUser && (
              <button
                type="button"
                onClick={exitDemoMode}
                className="flex items-center gap-1.5 px-2.5 py-1 text-xs bg-white/10 hover:bg-white/20 text-white border border-white/20 font-mono transition-colors"
                title="Exit demo mode and go to sign-in"
              >
                <LogOut className="w-3 h-3 text-amber-300" />
                <span>Exit Demo & Sign In</span>
              </button>
            )}

            {/* Admin Reset Button (Visible to Instructors or Demo View) */}
            {(isTeacherOrAdmin || isDemoMode) && (
              <button
                type="button"
                onClick={() => setResetConfirmOpen(true)}
                title={isLive ? "Start a new class session (keeps all earlier data)" : "Restore demo data"}
                className="flex items-center gap-1.5 px-2.5 py-2 sm:px-3 sm:py-1.5 text-xs text-white bg-[#0F325E] hover:bg-[#15437C] border border-[#1E4E79] hover:border-brand transition-colors"
              >
                <RotateCcw aria-hidden="true" className="w-3.5 h-3.5 text-brand" />
                <span className="hidden sm:inline">{isLive ? "New Session" : "Reset Session"}</span>
                <span className="sm:hidden">{isLive ? "New" : "Reset"}</span>
              </button>
            )}

            {/* Reports (teachers only; the server also checks the teacher login) */}
            {isLive && isTeacherOrAdmin && (
              <a
                href="/reports"
                className="flex items-center gap-1.5 px-2.5 py-2 sm:px-3 sm:py-1.5 text-xs text-white bg-[#0F325E] hover:bg-[#15437C] border border-[#1E4E79] hover:border-brand transition-colors"
              >
                <BarChart3 aria-hidden="true" className="w-3.5 h-3.5 text-brand" />
                <span>Reports</span>
              </a>
            )}

            {/* Enroll New Patient Button (Front Desk, teachers and demo visitors only) */}
            {(!currentUser || currentUser.isAdmin || activeRole === "receptionist") && (
            <button
              type="button"
              onClick={onOpenIntake}
              className="flex items-center gap-1.5 px-3 py-2 sm:px-3.5 sm:py-1.5 text-xs font-bold text-navy-dark bg-brand hover:bg-brand-hover transition-colors shadow-sm"
            >
              <Plus aria-hidden="true" className="w-3.5 h-3.5 text-navy-dark stroke-[3]" />
              <span className="sm:hidden">Enroll</span>
              <span className="hidden sm:inline">Enroll New Patient</span>
            </button>
            )}
          </div>
        </div>

        {/* Role Selection & Identity Banner */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-2 sm:py-2.5 flex flex-col gap-2 sm:gap-3 md:flex-row md:items-center md:justify-between text-xs bg-[#071B33]">
          <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3">
            <span className={`text-slate-300 font-sans uppercase tracking-wider text-[11px] items-center gap-1 ${roleSwitchAllowed ? "flex" : "hidden sm:flex"}`}>
              <UserCheck aria-hidden="true" className="w-3.5 h-3.5 text-brand" />
              {roleSwitchAllowed ? "Active Classroom Role:" : "Your Station (fixed for this session):"}
            </span>

            {roleSwitchAllowed ? (
              <RoleMenu activeRole={activeRole} onSelect={setActiveRole} roles={selectableRoles} />
            ) : (
              <div
                title="Your station is fixed for this class session. Your teacher can start a new session to let you change."
                className="flex items-center gap-2 px-3 py-1.5 bg-[#0F325E] border border-paper-border text-white text-xs w-fit max-w-full"
              >
                <Lock aria-hidden="true" className="w-3.5 h-3.5 text-amber-300 shrink-0" />
                <span className="font-mono px-1 bg-brand text-navy-dark font-bold text-[10px]">
                  {currentRoleMeta.badge}
                </span>
                <span className="font-sans text-xs sm:text-sm font-bold">{currentRoleMeta.title}</span>
                <span className="sm:hidden text-[10px] text-amber-300 font-mono">· fixed</span>
              </div>
            )}
          </div>

          {/* Staff Sign-off Identity Field (on phones a signed-in user just sees a one-line note) */}
          {currentUser && (
            <p className="sm:hidden text-[11px] text-slate-300">
              Signing off as <strong className="text-white">{activeStaffName}</strong>
            </p>
          )}
          <div className={`flex-col sm:flex-row sm:items-center gap-1 sm:gap-2 ${currentUser ? "hidden sm:flex" : "flex"}`}>
            <label htmlFor={signOffId} className="text-slate-300 text-[11px]">
              Signing off as:
            </label>
            <input
              id={signOffId}
              type="text"
              value={activeStaffName}
              readOnly={!!currentUser}
              onChange={(e) => setActiveStaffName(e.target.value)}
              title={
                currentUser
                  ? "Locked to your signed-in account"
                  : "Type student name or ID for clinical log entries"
              }
              className="px-2.5 py-1 text-xs bg-[#0F325E] border border-paper-border focus:border-brand text-white w-full sm:w-64 font-sans read-only:bg-[#071B33] read-only:text-slate-300"
              placeholder="Staff Name / ID"
            />
          </div>
        </div>
      </header>

      {renameOpen && <RenameAccountModal onClose={() => setRenameOpen(false)} />}

      {resetConfirmOpen && (
        <ResetConfirmDialog
          live={isLive}
          onCancel={() => setResetConfirmOpen(false)}
          onResetZero={async (name) => {
            await resetToDemoCases(name);
            setResetConfirmOpen(false);
          }}
          onSeedDemo={
            !isLive
              ? async () => {
                  await resetToDemoCases();
                  setResetConfirmOpen(false);
                }
              : undefined
          }
        />
      )}
    </>
  );
}
