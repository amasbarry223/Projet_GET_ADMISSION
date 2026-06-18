"use client";

import React, { createContext, useContext, useMemo, useState, useEffect } from "react";

export type Role = "candidat" | "conseiller" | "financier" | "admin" | "super-admin";

export type DemoUser = {
  id: string;
  nom: string;
  prenom: string;
  email: string;
  role: Role;
  initiales: string;
};

export const DEMO_USERS: Record<Role, DemoUser> = {
  candidat: {
    id: "u-cand-1",
    nom: "Diallo",
    prenom: "Fatou",
    email: "fatou.diallo@demo.getadm",
    role: "candidat",
    initiales: "FD",
  },
  conseiller: {
    id: "u-cons-1",
    nom: "Diallo",
    prenom: "Aïssatou",
    email: "a.diallo@getadm.com",
    role: "conseiller",
    initiales: "AD",
  },
  financier: {
    id: "u-fin-1",
    nom: "Kouassi",
    prenom: "Marc",
    email: "m.kouassi@getadm.com",
    role: "financier",
    initiales: "MK",
  },
  admin: {
    id: "u-adm-1",
    nom: "Bensaid",
    prenom: "Yasmine",
    email: "y.bensaid@getadm.com",
    role: "admin",
    initiales: "YB",
  },
  "super-admin": {
    id: "u-sadm-1",
    nom: "Touré",
    prenom: "Ousmane",
    email: "o.toure@getadm.com",
    role: "super-admin",
    initiales: "OT",
  },
};

type AuthState = {
  user: DemoUser | null;
  isAuthenticated: boolean;
  signIn: (role: Role) => void;
  signOut: () => void;
};

const AuthContext = createContext<AuthState | undefined>(undefined);

const STORAGE_KEY = "getadm.demo.role";

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<DemoUser | null>(null);

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(STORAGE_KEY) as Role | null;
      if (stored && DEMO_USERS[stored]) {
        // Intentional: restore demo session from localStorage after hydration.
        // Server renders null; client reads storage here to avoid hydration mismatch.
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setUser(DEMO_USERS[stored]);
      }
    } catch {
      // ignore
    }
  }, []);

  const signIn = (role: Role) => {
    const u = DEMO_USERS[role];
    setUser(u);
    try {
      window.localStorage.setItem(STORAGE_KEY, role);
    } catch {
      // ignore
    }
  };

  const signOut = () => {
    setUser(null);
    try {
      window.localStorage.removeItem(STORAGE_KEY);
    } catch {
      // ignore
    }
  };

  const value = useMemo<AuthState>(
    () => ({ user, isAuthenticated: !!user, signIn, signOut }),
    [user]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}

export function useHydratedRole(): Role | null {
  const { user } = useAuth();
  return user?.role ?? null;
}
