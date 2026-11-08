"use client";

import React, { useRef, useState, useEffect } from "react";
import { useAuth, DEFAULT_ADMIN_TEACHER_ACCOUNTS } from "@/context/AuthContext";
import { RoleId, HOSPITAL_ROLES } from "@/types/emr";
import {
  LogIn,
  UserPlus,
  ShieldCheck,
  Sparkles,
  ArrowRight,
  ShieldAlert,
  KeyRound,
  GraduationCap,
  Users,
} from "lucide-react";

export function HeroLanding() {
  const { login, signup, loginTeacher, enterDemoMode, authNotice } = useAuth();

  const [activeTab, setActiveTab] = useState<"signin" | "signup" | "teacher">("signin");

  // Sign In State
  const [loginIdentifier, setLoginIdentifier] = useState("");
  const [loginPassword, setLoginPassword] = useState("");

  // Sign Up State
  const [signupFullName, setSignupFullName] = useState("");
  const [signupEmail, setSignupEmail] = useState("");
  const [signupRole, setSignupRole] = useState<RoleId>("triage_nurse");
  const [signupPassword, setSignupPassword] = useState("");

    // Teacher / Admin sign-in state (kept separate so these boxes always start empty)
  const [selectedTeacher, setSelectedTeacher] = useState("");
  const [teacherEmail, setTeacherEmail] = useState("");
  const [teacherPassword, setTeacherPassword] = useState("");
  const teacherPasswordRef = useRef<HTMLInputElement>(null);

  const [errorMessage, setErrorMessage] = useState("");
  const [loading, setLoading] = useState(false);

  // e.g. "Your sign-in has expired" after the server ended the session
  useEffect(() => {
    if (authNotice) setErrorMessage(authNotice);
  }, [authNotice]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage("");
    setLoading(true);

    const res = await login(loginIdentifier, loginPassword);
    setLoading(false);
    if (!res.success) {
      setErrorMessage(res.error || "Authentication failed.");
    }
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage("");
    setLoading(true);

    const res = await signup(signupFullName, signupRole, signupPassword, signupEmail);
    setLoading(false);
    if (!res.success) {
      setErrorMessage(res.error || "Registration failed.");
    }
  };


    // A teacher picks their name, then types their own password (nothing is auto-filled)
  const handleSelectTeacher = (fullName: string) => {
    setSelectedTeacher(fullName);
    setTeacherPassword("");
    setErrorMessage("");
    setTimeout(() => teacherPasswordRef.current?.focus(), 0);
  };

  const handleTeacherLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage("");

    // Work out which teacher profile this is (by picked name, or by typed name / email)
    const typed = (selectedTeacher || teacherEmail).trim().toLowerCase();
    const profile = DEFAULT_ADMIN_TEACHER_ACCOUNTS.find(
      (t) => t.fullName.toLowerCase() === typed || (t.email && t.email.toLowerCase() === typed)
    );
    if (!profile) {
      setErrorMessage("No teacher profile found for that name or email. Pick your name from the list.");
      return;
    }

    setLoading(true);
    // The server checks the password and starts the teacher session
    const res = await loginTeacher(profile.fullName, teacherPassword);
    setLoading(false);
    if (!res.success) {
      setErrorMessage(res.error || "Authentication failed.");
      setTeacherPassword("");
    }
  };

  return (
    <div className="relative min-h-screen flex flex-col justify-between bg-navy-dark text-white overflow-x-hidden selection:bg-brand selection:text-navy-dark">
      {/* Background Campus Photo with Deep Blue Academic Overlay */}
      <div
        className="fixed inset-0 z-0 bg-cover bg-center opacity-30 mix-blend-luminosity scale-105 pointer-events-none"
        style={{ backgroundImage: "url('/trinity-campus.png')" }}
      />
      <div className="fixed inset-0 z-0 bg-gradient-to-b from-[#071B33]/92 via-[#0B2545]/90 to-[#051426]/98 pointer-events-none" />

      {/* Topmast Banner */}
      <header className="relative z-10 border-b border-paper-border/60 bg-[#071B33]/80 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3.5 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <img
              src="/trinity-logo.png"
              alt="Trinity University"
              className="h-11 sm:h-12 w-auto object-contain rounded-[2px] shadow-sm bg-white/95 p-0.5"
            />
            <div className="min-w-0">
              <p className="font-sans text-sm sm:text-base font-bold text-white tracking-wide">
                Trinity University
              </p>
              <p className="text-[11px] sm:text-xs text-amber-300 font-medium">
                Faculty of Nursing & Health Sciences<span className="hidden sm:inline"> &bull; Yaba, Lagos</span>
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={enterDemoMode}
            className="inline-flex items-center gap-2 px-3.5 py-1.5 bg-brand hover:bg-brand-hover text-navy-dark font-bold text-xs uppercase tracking-wider transition-colors shadow-sm"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Preview Demo Cases</span>
            <span className="sm:hidden">Demo</span>
          </button>
        </div>
      </header>

      {/* Main Hero Container */}
      <main className="relative z-10 max-w-5xl mx-auto px-4 sm:px-6 py-8 sm:py-12 flex-1 flex flex-col justify-center items-center">
        {/* Sign In & Sign Up Central Card */}
        <div className="w-full max-w-xl bg-white text-charcoal border-2 border-brand shadow-2xl overflow-hidden rounded-[2px]">
          {/* Card Tabs */}
          <div className="grid grid-cols-3 bg-[#0B2545] border-b border-paper-border text-xs font-mono">
            <button
              type="button"
              onClick={() => {
                setActiveTab("signin");
                setErrorMessage("");
              }}
              className={`py-3 px-2 text-center transition-all flex items-center justify-center gap-1.5 ${
                activeTab === "signin"
                  ? "bg-white text-navy-dark font-bold border-t-2 border-brand shadow"
                  : "text-slate-300 hover:text-white hover:bg-white/5"
              }`}
            >
              <LogIn className="w-3.5 h-3.5 text-brand" />
              <span>Student Sign In</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setActiveTab("signup");
                setErrorMessage("");
              }}
              className={`py-3 px-2 text-center transition-all flex items-center justify-center gap-1.5 ${
                activeTab === "signup"
                  ? "bg-white text-navy-dark font-bold border-t-2 border-brand shadow"
                  : "text-slate-300 hover:text-white hover:bg-white/5"
              }`}
            >
              <UserPlus className="w-3.5 h-3.5 text-brand" />
              <span>Student Register</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setActiveTab("teacher");
                setErrorMessage("");
              }}
              className={`py-3 px-2 text-center transition-all flex items-center justify-center gap-1.5 ${
                activeTab === "teacher"
                  ? "bg-white text-navy-dark font-bold border-t-2 border-brand shadow"
                  : "text-slate-300 hover:text-white hover:bg-white/5"
              }`}
            >
              <ShieldCheck className="w-3.5 h-3.5 text-brand" />
              <span>Teachers / Admin</span>
            </button>
          </div>

          <div className="p-5 sm:p-7 space-y-5 bg-[#FAFCFF]">
            {/* Error message alert */}
            {errorMessage && (
              <div
                role="alert"
                className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2 rounded-[2px]"
              >
                <ShieldAlert className="w-4 h-4 shrink-0" />
                <span>{errorMessage}</span>
              </div>
            )}

            {/* TAB 1: STUDENT / STAFF SIGN IN */}
            {activeTab === "signin" && (
              <form onSubmit={handleLogin} className="space-y-4 text-xs">
                <div className="space-y-3">
                  <div>
                    <label className="block font-mono text-[10px] uppercase text-charcoal-muted mb-1 font-bold">
                      Full Name *
                    </label>
                    <input
                      required
                      type="text"
                      value={loginIdentifier}
                      onChange={(e) => setLoginIdentifier(e.target.value)}
                      placeholder="e.g. Adaeze Nwafor"
                      className="w-full p-2.5 bg-white border border-slate-300 focus:border-brand focus:ring-1 focus:ring-brand text-charcoal font-sans text-xs outline-none"
                    />
                  </div>

                  <div>
                    <label className="block font-mono text-[10px] uppercase text-charcoal-muted mb-1 font-bold">
                      Password *
                    </label>
                    <input
                      required
                      type="password"
                      autoComplete="current-password"
                      value={loginPassword}
                      onChange={(e) => setLoginPassword(e.target.value)}
                      placeholder="Your password"
                      className="w-full p-2.5 bg-white border border-slate-300 focus:border-brand focus:ring-1 focus:ring-brand text-charcoal font-sans text-xs outline-none"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3 bg-brand hover:bg-brand-hover text-navy-dark font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-colors shadow-sm"
                >
                  <LogIn className="w-4 h-4" />
                  <span>{loading ? "Authenticating..." : "Sign In to Hospital Workstation"}</span>
                </button>
              </form>
            )}

            {/* TAB 2: STUDENT REGISTRATION */}
            {activeTab === "signup" && (
              <form onSubmit={handleSignup} className="space-y-4 text-xs">
                <div className="space-y-3">
                  <div>
                    <label className="block font-mono text-[10px] uppercase text-charcoal-muted mb-1 font-bold">
                      Full Student Name *
                    </label>
                    <input
                      required
                      type="text"
                      value={signupFullName}
                      onChange={(e) => setSignupFullName(e.target.value)}
                      placeholder="e.g. Adaeze Nwafor"
                      className="w-full p-2.5 bg-white border border-slate-300 focus:border-brand focus:ring-1 focus:ring-brand text-charcoal font-sans text-xs outline-none"
                    />
                  </div>

                  <div>
                    <label className="block font-mono text-[10px] uppercase text-charcoal-muted mb-1 font-bold">
                      Email Address *
                    </label>
                    <input
                      required
                      type="email"
                      autoComplete="email"
                      value={signupEmail}
                      onChange={(e) => setSignupEmail(e.target.value)}
                      placeholder="you@example.com"
                      className="w-full p-2.5 bg-white border border-slate-300 focus:border-brand focus:ring-1 focus:ring-brand text-charcoal font-sans text-xs outline-none"
                    />
                  </div>

                  <div>
                    <label className="block font-mono text-[10px] uppercase text-charcoal-muted mb-1 font-bold">
                      Starting Station *
                    </label>
                    <select
                      value={signupRole}
                      onChange={(e) => setSignupRole(e.target.value as RoleId)}
                      className="w-full p-2.5 bg-white border border-slate-300 focus:border-brand focus:ring-1 focus:ring-brand text-charcoal font-sans text-xs outline-none"
                    >
                      {HOSPITAL_ROLES.filter((r) => r.id !== "director").map((r) => (
                        <option key={r.id} value={r.id}>
                          {r.title} ({r.badge})
                        </option>
                      ))}
                    </select>
                    <p className="mt-1 text-[11px] text-slate-500">This is only your suggested starting station. At the start of each class session you confirm the station you will act as; it stays fixed until your teacher starts a new session.</p>
                  </div>

                  <div>
                    <label className="block font-mono text-[10px] uppercase text-charcoal-muted mb-1 font-bold">
                      Create Password * (at least 6 characters)
                    </label>
                    <input
                      required
                      minLength={6}
                      type="password"
                      autoComplete="new-password"
                      value={signupPassword}
                      onChange={(e) => setSignupPassword(e.target.value)}
                      placeholder="Choose a password you will remember"
                      className="w-full p-2.5 bg-white border border-slate-300 focus:border-brand focus:ring-1 focus:ring-brand text-charcoal font-sans text-xs outline-none"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3 bg-brand hover:bg-brand-hover text-navy-dark font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-colors shadow-sm"
                >
                  <UserPlus className="w-4 h-4" />
                  <span>{loading ? "Registering..." : "Register & Enter Station"}</span>
                </button>
              </form>
            )}

                        {/* TAB 3: TEACHERS / ADMIN PORTAL */}
            {activeTab === "teacher" && (
              <div className="space-y-4 text-xs">
                <div className="p-3 bg-amber-50 border border-amber-200 text-amber-900 text-xs flex items-start gap-2.5 rounded-[2px]">
                  <GraduationCap className="w-4 h-4 text-brand-dark shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold">Faculty Instructors & Clinical Supervisors:</span>
                    <p className="text-[11px] text-amber-800 mt-0.5">
                      Teacher accounts hold full master authority to monitor all stations, reset classroom drills to zero, and inspect live student logs.
                    </p>
                  </div>
                </div>

                {/* Pick your name (no emails or passwords are shown) */}
                <div className="space-y-2">
                  <span className="font-mono text-[10px] uppercase tracking-wider text-charcoal-muted block">
                    Select your name:
                  </span>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 max-h-44 overflow-y-auto pr-1">
                    {DEFAULT_ADMIN_TEACHER_ACCOUNTS.map((adm) => {
                      const isSelected = selectedTeacher === adm.fullName;
                      return (
                        <button
                          key={adm.id}
                          type="button"
                          aria-pressed={isSelected}
                          onClick={() => handleSelectTeacher(adm.fullName)}
                          className={`p-2.5 text-left border text-xs font-bold text-navy-dark truncate transition-colors ${
                            isSelected
                              ? "border-brand bg-amber-50"
                              : "border-slate-200 hover:border-brand bg-white hover:bg-amber-50"
                          }`}
                        >
                          {adm.fullName}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <form onSubmit={handleTeacherLogin} className="space-y-3">
                  {selectedTeacher ? (
                    <div className="flex items-center justify-between gap-2 p-2.5 bg-slate-50 border border-slate-200">
                      <span className="text-charcoal">
                        Signing in as <strong>{selectedTeacher}</strong>
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedTeacher("");
                          setTeacherPassword("");
                          setErrorMessage("");
                        }}
                        className="underline text-[11px] text-charcoal-muted hover:text-charcoal shrink-0"
                      >
                        Change
                      </button>
                    </div>
                  ) : (
                    <div>
                      <label
                        htmlFor="teacher-email"
                        className="block font-mono text-[10px] uppercase text-charcoal-muted mb-1 font-bold"
                      >
                        Or enter your teacher email address *
                      </label>
                      <input
                        id="teacher-email"
                        required
                        type="email"
                        autoComplete="off"
                        value={teacherEmail}
                        onChange={(e) => setTeacherEmail(e.target.value)}
                        placeholder="Enter your teacher email address"
                        className="w-full p-2.5 bg-white border border-slate-300 focus:border-brand focus:ring-1 focus:ring-brand text-charcoal font-sans text-xs outline-none"
                      />
                    </div>
                  )}

                  <div>
                    <label
                      htmlFor="teacher-password"
                      className="block font-mono text-[10px] uppercase text-charcoal-muted mb-1 font-bold"
                    >
                      Admin Password *
                    </label>
                    <input
                      id="teacher-password"
                      ref={teacherPasswordRef}
                      required
                      type="password"
                      autoComplete="current-password"
                      value={teacherPassword}
                      onChange={(e) => setTeacherPassword(e.target.value)}
                      placeholder="Enter your password"
                      className="w-full p-2.5 bg-white border border-slate-300 focus:border-brand focus:ring-1 focus:ring-brand text-charcoal font-sans text-xs outline-none"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full py-2.5 bg-[#0B2545] hover:bg-[#071B33] text-amber-300 font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-colors border border-brand"
                  >
                    <ShieldCheck className="w-4 h-4 text-brand" />
                    <span>{loading ? "Signing in..." : "Sign In as Teacher / Admin"}</span>
                  </button>
                </form>
              </div>
            )}
          </div>
        </div>

        {/* Product Name Boldly Written Below Sign-In and Sign-Up */}
        <div className="text-center space-y-3 mt-8 sm:mt-10 max-w-3xl mx-auto">
          <h1 className="font-sans text-2xl sm:text-4xl md:text-5xl font-black text-white tracking-tight uppercase leading-tight drop-shadow-md">
            Trinity University Hospital EHR
          </h1>
          <p className="text-xs sm:text-sm md:text-base text-amber-300 font-semibold tracking-wide uppercase">
            Clinical Data Flow & Patient Journey System
          </p>
          <p className="text-xs sm:text-sm text-slate-300 max-w-2xl mx-auto leading-relaxed">
            Learn how medical records flow seamlessly across Reception, Nurse Triage, Physician Consultation, Laboratory Diagnostics, Radiology, and Inpatient/Treatment Nursing.
          </p>

          {/* Quick Demo Mode CTA */}
          <div className="pt-3">
            <button
              type="button"
              onClick={enterDemoMode}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-white/10 hover:bg-white/20 text-white border border-white/25 hover:border-amber-400 text-xs sm:text-sm font-semibold transition-all rounded-[2px] shadow-sm backdrop-blur-sm"
            >
              <Sparkles className="w-4 h-4 text-amber-300" />
              <span>Explore Demo Simulation (4 Sample Patients)</span>
              <ArrowRight className="w-4 h-4 text-amber-300" />
            </button>
          </div>

          {/* Clinical Pipeline Flow Diagram */}
          <div className="pt-4 flex flex-wrap items-center justify-center gap-1.5 text-[11px] font-mono text-slate-300">
            <span className="px-2 py-1 bg-[#0B2545] border border-paper-border text-amber-300">
              Reception
            </span>
            <span>&rarr;</span>
            <span className="px-2 py-1 bg-[#0B2545] border border-paper-border text-white">
              Triage
            </span>
            <span>&rarr;</span>
            <span className="px-2 py-1 bg-[#0B2545] border border-paper-border text-white">
              Doctor
            </span>
            <span>&rarr;</span>
            <span className="px-2 py-1 bg-[#0B2545] border border-paper-border text-white">
              Lab & Radiology
            </span>
            <span>&rarr;</span>
            <span className="px-2 py-1 bg-[#0B2545] border border-paper-border text-white">
              Treatment
            </span>
            <span>&rarr;</span>
            <span className="px-2 py-1 bg-[#0B2545] border border-paper-border text-amber-300">
              Discharge
            </span>
          </div>
        </div>
      </main>

      {/* Hero Footer */}
      <footer className="relative z-10 border-t border-paper-border/50 bg-[#051426]/90 py-4 text-center text-xs text-slate-400">
        <div className="max-w-7xl mx-auto px-4 flex flex-wrap items-center justify-between gap-2 text-[11px]">
          <p>
            &copy; {new Date().getFullYear()} Trinity University &bull; City Campus: Off Alara Street (Near Queen&apos;s College), Yaba, Lagos.
          </p>
          <p className="font-mono text-amber-300">
            Faculty of Nursing & Health Sciences EMR Directorate
          </p>
        </div>
      </footer>
    </div>
  );
}
