"use client";

import { createContext, useContext, type ReactNode } from "react";
import type { Tenant } from "@/lib/tenants";

const TenantContext = createContext<Tenant | null>(null);

export function TenantProvider({ tenant, children }: { tenant: Tenant; children: ReactNode }) {
  return <TenantContext.Provider value={tenant}>{children}</TenantContext.Provider>;
}

export function useTenant() {
  const tenant = useContext(TenantContext);
  if (!tenant) throw new Error("useTenant must be used inside a tenant page");
  return tenant;
}

export function useTenantSlug() { return useTenant().slug; }
