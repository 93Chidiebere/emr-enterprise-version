"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function RegisterInstitutionPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [hospitalName, setHospitalName] = useState("");
  const [department, setDepartment] = useState("");
  const [location, setLocation] = useState("");
  const [ownerName, setOwnerName] = useState("");
  const [ownerEmail, setOwnerEmail] = useState("");
  const [ownerPassword, setOwnerPassword] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const onName = (value: string) => { setName(value); setSlug(value.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 40)); };
  const submit = async (event: React.FormEvent) => {
    event.preventDefault(); setBusy(true); setMessage("");
    try {
      const response = await fetch("/api/tenants", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name, slug, hospitalName, department, location, ownerName, ownerEmail, ownerPassword }) });
      const data = await response.json();
      if (!response.ok) { setMessage(data.message || "We could not create your institution. Please review the details."); setBusy(false); return; }
      router.push(`/${encodeURIComponent(data.slug)}`); router.refresh();
    } catch { setMessage("Could not reach the server. Check your connection and try again."); setBusy(false); }
  };
  return <main className="min-h-screen bg-slate-950 px-5 py-10 text-white sm:py-16"><div className="mx-auto max-w-2xl"><Link href="/" className="text-sm text-sky-300 hover:text-sky-200">← Clinical Training Platform</Link><div className="mt-8 rounded-2xl border border-white/10 bg-white/[.04] p-6 sm:p-9"><p className="text-xs font-semibold uppercase tracking-[.18em] text-sky-300">Institution setup</p><h1 className="mt-3 text-3xl font-bold">Create your workspace</h1><p className="mt-2 text-slate-400">Set up your institution and its first owner account.</p>{message && <p role="alert" className="mt-5 rounded-lg border border-rose-400/30 bg-rose-400/10 p-3 text-sm text-rose-200">{message}</p>}<form onSubmit={submit} className="mt-7 space-y-6">
    <fieldset className="grid gap-4 sm:grid-cols-2"><legend className="mb-3 text-sm font-semibold">Institution details</legend><label className="text-sm">Institution name<input required minLength={3} value={name} onChange={e=>onName(e.target.value)} className="mt-1.5 w-full rounded-lg border border-white/15 bg-slate-950 px-3 py-3 text-base" placeholder="Example University"/></label><label className="text-sm">Workspace address<div className="mt-1.5 flex items-center rounded-lg border border-white/15 bg-slate-950 px-3"><span className="text-slate-500">/</span><input required minLength={3} maxLength={40} pattern="[a-z0-9]+(?:-[a-z0-9]+)*" value={slug} onChange={e=>setSlug(e.target.value)} className="w-full bg-transparent px-2 py-3 text-base outline-none" placeholder="example-university"/></div></label><label className="text-sm sm:col-span-2">Training hospital name<input value={hospitalName} onChange={e=>setHospitalName(e.target.value)} className="mt-1.5 w-full rounded-lg border border-white/15 bg-slate-950 px-3 py-3 text-base" placeholder={name ? `${name} Training Hospital` : "Optional"}/></label><label className="text-sm">Faculty or department<input value={department} onChange={e=>setDepartment(e.target.value)} className="mt-1.5 w-full rounded-lg border border-white/15 bg-slate-950 px-3 py-3 text-base" placeholder="School of Nursing"/></label><label className="text-sm">Location<input value={location} onChange={e=>setLocation(e.target.value)} className="mt-1.5 w-full rounded-lg border border-white/15 bg-slate-950 px-3 py-3 text-base" placeholder="City, country"/></label></fieldset>
    <fieldset className="grid gap-4 sm:grid-cols-2"><legend className="mb-3 text-sm font-semibold">Workspace owner</legend><label className="text-sm">Full name<input required minLength={2} value={ownerName} onChange={e=>setOwnerName(e.target.value)} autoComplete="name" className="mt-1.5 w-full rounded-lg border border-white/15 bg-slate-950 px-3 py-3 text-base"/></label><label className="text-sm">Work email<input required type="email" value={ownerEmail} onChange={e=>setOwnerEmail(e.target.value)} autoComplete="email" className="mt-1.5 w-full rounded-lg border border-white/15 bg-slate-950 px-3 py-3 text-base"/></label><label className="text-sm sm:col-span-2">Password <span className="text-slate-500">(at least 8 characters)</span><input required minLength={8} type="password" value={ownerPassword} onChange={e=>setOwnerPassword(e.target.value)} autoComplete="new-password" className="mt-1.5 w-full rounded-lg border border-white/15 bg-slate-950 px-3 py-3 text-base"/></label></fieldset>
    <p className="text-xs leading-5 text-slate-500">Use this workspace for simulated teaching scenarios only. Do not enter real patient information.</p><button disabled={busy} className="w-full rounded-lg bg-sky-300 px-5 py-3.5 font-semibold text-slate-950 hover:bg-sky-200 disabled:opacity-60">{busy ? "Creating workspace…" : "Create institution workspace"}</button></form></div></div></main>;
}
