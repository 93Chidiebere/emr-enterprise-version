"use client";

import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { UserAccount, RoleId } from "@/types/emr";

/**
 * Teacher / admin PROFILES shown on the "Select your name" list.
 * These hold no passwords: teachers type the password that the administrator set in
 * Vercel (TEACHER_PASSWORD), and the server checks it. Student accounts live in the database.
 */
export const DEFAULT_ADMIN_TEACHER_ACCOUNTS: UserAccount[] = [
  {
    id: "adm-001",
    fullName: "Chidiebere (Super Admin)",
    email: "vchidiebere.vc@gmail.com",
    assignedRole: "director",
    isAdmin: true,
    isSuperAdmin: true,
    createdAt: "2026-10-20T00:00:00Z",
  },
  {
    id: "adm-002",
    fullName: "Chidiebere",
    email: "vincent.chidiebere@outlook.com",
    assignedRole: "director",
    isAdmin: true,
    createdAt: "2026-10-20T00:00:00Z",
  },
  {
    id: "adm-003",
    fullName: "Rita",
    email: "ritaeze53@gmail.com",
    assignedRole: "director",
    isAdmin: true,
    createdAt: "2026-10-20T00:00:00Z",
  },
  {
    id: "adm-004",
    fullName: "Salamah",
    email: "salamahalawiye@gmail.com",
    assignedRole: "director",
    isAdmin: true,
    createdAt: "2026-10-20T00:00:00Z",
  },
  {
    id: "adm-005",
    fullName: "Favour",
    email: "faladefavour@gmail.com",
    assignedRole: "director",
    isAdmin: true,
    createdAt: "2026-10-20T00:00:00Z",
  },
  {
    id: "adm-006",
    fullName: "Sunita",
    email: "nytaedu@gmail.com",
    assignedRole: "director",
    isAdmin: true,
    createdAt: "2026-10-20T00:00:00Z",
  },
  {
    id: "adm-007",
    fullName: "Fiyin",
    email: "anifowosefiyin@gmail.com",
    assignedRole: "director",
    isAdmin: true,
    createdAt: "2026-10-20T00:00:00Z",
  },
  {
    id: "adm-008",
    fullName: "Nancy",
    email: "nanchelotty@gmail.com",
    assignedRole: "director",
    isAdmin: true,
    createdAt: "2026-10-20T00:00:00Z",
  },
];

type Result = { success: boolean; error?: string };

interface AuthContextType {
  currentUser: UserAccount | null;
  authModalOpen: boolean;
  authMode: "signin" | "signup";
  authReady: boolean;
  isDemoMode: boolean;
  /** shown on the sign-in screen, e.g. after a session expires */
  authNotice: string;
  /** server warnings for the signed-in user, e.g. "teacher_password_weak" */
  authWarnings: string[];
  setAuthModalOpen: (open: boolean) => void;
  setAuthMode: (mode: "signin" | "signup") => void;
  enterDemoMode: () => void;
  exitDemoMode: () => void;
  /** Student sign-in (checked by the server). */
  login: (name: string, password: string) => Promise<Result>;
  /** Student registration (account is created in the database). */
  signup: (fullName: string, role: RoleId, password: string, email: string) => Promise<Result>;
  updateEmail: (email: string) => Promise<Result>;
  /** Teacher / admin sign-in (password checked by the server). */
  loginTeacher: (name: string, password: string) => Promise<Result>;
  logout: () => void;
  /** A student changes their own name (confirmed with their password). */
  renameAccount: (newName: string, password: string) => Promise<Result>;
  /** Called when the server says the sign-in has expired or the account was removed. */
  expireSession: (message?: string) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface ServerUser {
  id: string;
  fullName: string;
  assignedRole: string;
  isAdmin?: boolean;
  createdAt?: string;
  email?: string | null;
}

function toAccount(u: ServerUser): UserAccount {
  // teachers: add the profile details (email / super-admin flag) from the list above
  const profile = u.isAdmin
    ? DEFAULT_ADMIN_TEACHER_ACCOUNTS.find((t) => t.fullName.toLowerCase() === u.fullName.toLowerCase())
    : undefined;
  return {
    id: u.id,
    fullName: u.fullName,
    assignedRole: u.assignedRole as RoleId,
    isAdmin: !!u.isAdmin,
    isSuperAdmin: profile?.isSuperAdmin,
    email: u.isAdmin ? profile?.email : u.email || undefined,
    createdAt: u.createdAt || "",
  };
}

async function postJson(url: string, body: unknown) {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const json = await res.json().catch(() => ({}));
  return { res, json };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [currentUser, setCurrentUser] = useState<UserAccount | null>(null);
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [authMode, setAuthMode] = useState<"signin" | "signup">("signin");
  const [authReady, setAuthReady] = useState(false);
  const [isDemoMode, setIsDemoMode] = useState(false);
  const [authNotice, setAuthNotice] = useState("");
  const [authWarnings, setAuthWarnings] = useState<string[]>([]);

  // Ask the server who is signed in (the sign-in is kept in a secure cookie, not in this browser's storage)
  useEffect(() => {
    // Older versions kept accounts, with passwords, in the browser. Remove those leftovers.
    try {
      localStorage.removeItem("trinity_emr_users");
      localStorage.removeItem("trinity_emr_active_session");
    } catch {
      // ignore
    }

    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/auth/me", { cache: "no-store" });
        const json = await res.json().catch(() => ({}));
        if (!cancelled && json?.user) {
          setCurrentUser(toAccount(json.user));
          setAuthWarnings(Array.isArray(json.warnings) ? json.warnings : []);
        }
      } catch {
        // offline: stay signed out
      }
      if (!cancelled) setAuthReady(true);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const finishLogin = (user: ServerUser, warnings: string[] = []) => {
    setCurrentUser(toAccount(user));
    setAuthWarnings(warnings);
    setAuthNotice("");
    setIsDemoMode(false);
    setAuthModalOpen(false);
  };

  const login = async (name: string, password: string): Promise<Result> => {
    if (!name.trim()) return { success: false, error: "Please enter your full name." };
    if (!password) return { success: false, error: "Please enter your password." };
    try {
      const { res, json } = await postJson("/api/auth/student/login", { name, password });
      if (res.ok && json?.user) {
        finishLogin(json.user);
        return { success: true };
      }
      return { success: false, error: json?.message || "Sign-in failed. Please try again." };
    } catch {
      return { success: false, error: "Could not reach the server. Check your internet connection." };
    }
  };

  const signup = async (fullName: string, role: RoleId, password: string, email: string): Promise<Result> => {
    if (!fullName.trim()) return { success: false, error: "Full Name is required for registration." };
    try {
      const { res, json } = await postJson("/api/auth/student/register", { name: fullName, role, password, email });
      if (res.ok && json?.user) {
        finishLogin(json.user);
        return { success: true };
      }
      return { success: false, error: json?.message || "Registration failed. Please try again." };
    } catch {
      return { success: false, error: "Could not reach the server. Check your internet connection." };
    }
  };

  const updateEmail = async (email: string): Promise<Result> => {
    try {
      const res = await fetch("/api/auth/student/email", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const json = await res.json().catch(() => ({}));
      if (res.ok && json?.email) {
        setCurrentUser((prev) => (prev ? { ...prev, email: json.email } : prev));
        return { success: true };
      }
      return { success: false, error: json?.message || "Email could not be saved. Please try again." };
    } catch {
      return { success: false, error: "Could not reach the server. Check your internet connection." };
    }
  };

  const loginTeacher = async (name: string, password: string): Promise<Result> => {
    try {
      const { res, json } = await postJson("/api/auth/teacher", { name, password });
      if (res.ok && json?.user) {
        finishLogin(json.user, Array.isArray(json.warnings) ? json.warnings : []);
        return { success: true };
      }
      if (res.status === 401) return { success: false, error: "Incorrect password. Please verify your credentials." };
      return { success: false, error: json?.message || "Teacher sign-in failed. Please try again." };
    } catch {
      return { success: false, error: "Could not reach the server. Check your internet connection." };
    }
  };

  const renameAccount = async (newName: string, password: string): Promise<Result> => {
    try {
      const res = await fetch("/api/auth/student/name", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newName, password }),
      });
      const json = await res.json().catch(() => ({}));
      if (res.ok && json?.user) {
        setCurrentUser((prev) => (prev ? { ...prev, fullName: json.user.fullName } : prev));
        return { success: true };
      }
      return { success: false, error: json?.message || "Your name could not be changed. Please try again." };
    } catch {
      return { success: false, error: "Could not reach the server. Check your internet connection." };
    }
  };

  const enterDemoMode = () => {
    setIsDemoMode(true);
    setCurrentUser(null);
  };

  const exitDemoMode = () => {
    setIsDemoMode(false);
    setCurrentUser(null);
  };

  const logout = () => {
    fetch("/api/auth/logout", { method: "POST" }).catch(() => {});
    setCurrentUser(null);
    setAuthWarnings([]);
    setIsDemoMode(false);
  };

  const expireSession = (message = "Your sign-in has expired. Please sign in again.") => {
    fetch("/api/auth/logout", { method: "POST" }).catch(() => {});
    setCurrentUser(null);
    setAuthWarnings([]);
    setIsDemoMode(false);
    setAuthNotice(message);
  };

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        authModalOpen,
        authMode,
        authReady,
        isDemoMode,
        authNotice,
        authWarnings,
        setAuthModalOpen,
        setAuthMode,
        enterDemoMode,
        exitDemoMode,
        login,
        signup,
        updateEmail,
        loginTeacher,
        logout,
        renameAccount,
        expireSession,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
