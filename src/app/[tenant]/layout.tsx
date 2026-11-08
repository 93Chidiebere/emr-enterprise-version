import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTenantBySlug } from "@/lib/tenants";
import { buildThemeVars } from "@/lib/colors";
import { TenantProvider } from "@/context/TenantContext";
import { AuthProvider } from "@/context/AuthContext";
import { EMRProvider } from "@/context/EMRContext";
import { FormA11yEnhancer } from "@/components/shared/FormA11yEnhancer";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: { tenant: string } }): Promise<Metadata> {
  const tenant = await getTenantBySlug(params.tenant);
  if (!tenant || tenant.status !== "active") return { title: "Institution unavailable" };
  const asset = tenant.hasLogo ? `/api/tenants/${tenant.slug}/asset/logo?v=${tenant.brandVersion}` : undefined;
  return { title: tenant.hospitalName, description: tenant.tagline, ...(asset ? { icons: { icon: asset } } : {}) };
}

export default async function TenantLayout({ children, params }: { children: React.ReactNode; params: { tenant: string } }) {
  const tenant = await getTenantBySlug(params.tenant);
  if (!tenant) notFound();
  if (tenant.status === "suspended") return <main className="min-h-screen grid place-items-center p-6"><div className="max-w-lg rounded-xl bg-white p-8 text-center shadow"><h1 className="text-2xl font-bold">{tenant.name} is temporarily unavailable</h1><p className="mt-3 text-slate-600">Please contact your institution administrator for help.</p></div></main>;
  const theme = buildThemeVars(tenant.primaryColor, tenant.accentColor) as React.CSSProperties;
  return <TenantProvider tenant={tenant}><div style={theme} className="min-h-screen"><AuthProvider><EMRProvider>{children}</EMRProvider><FormA11yEnhancer /></AuthProvider></div></TenantProvider>;
}
