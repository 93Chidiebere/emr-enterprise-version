import type { Patient } from "@/types/emr";

/** "Ada Obi (REC)" and "ada  obi" are the same person. Used on the server AND in the browser. */
export const actorKey = (name?: string): string =>
  (name || "").trim().replace(/\s*\([A-Za-z]{2,5}\)\s*$/, "").replace(/\s+/g, " ").toLowerCase();

/** Everybody whose name is written on this patient's record (registered, measured, ordered, treated, routed). */
export function collectActorKeys(p: Patient): string[] {
  const names: Array<string | undefined> = [p.registeredBy];
  for (const v of p.vitalsHistory || []) names.push(v.takenBy);
  for (const n of p.doctorNotes || []) names.push(n.doctorName);
  for (const o of p.labOrders || []) names.push(o.doctorName, o.scientistName);
  for (const o of p.radiologyOrders || []) names.push(o.doctorName, o.radiographerName);
  for (const m of p.medications || []) names.push(m.doctorName, m.nurseName);
  for (const r of p.routingHistory || []) names.push(r.authorizedBy);
  return Array.from(new Set(names.map(actorKey).filter(Boolean)));
}

export const handledBy = (p: Patient, personName: string): boolean => collectActorKeys(p).includes(actorKey(personName));

/**
 * Replaces every place the given people are named on a patient record with a new name,
 * keeping the "(STATION)" tag (e.g. "Ada Ubi (REC)" becomes "Ada Obi (REC)").
 * Changes the record in place and returns true if anything was changed.
 */
export function renameActorInPatient(p: Patient, fromKeys: string[], newName: string): boolean {
  const keys = new Set(fromKeys);
  let changed = false;
  const fix = (value: string): string => {
    if (!value || !keys.has(actorKey(value))) return value;
    const tag = value.match(/\s*\(([A-Za-z]{2,5})\)\s*$/);
    const next = tag ? `${newName} (${tag[1]})` : newName;
    if (next !== value) changed = true;
    return next;
  };

  p.registeredBy = fix(p.registeredBy);
  for (const v of p.vitalsHistory || []) v.takenBy = fix(v.takenBy);
  for (const n of p.doctorNotes || []) n.doctorName = fix(n.doctorName);
  for (const o of p.labOrders || []) {
    o.doctorName = fix(o.doctorName);
    if (o.scientistName) o.scientistName = fix(o.scientistName);
  }
  for (const o of p.radiologyOrders || []) {
    o.doctorName = fix(o.doctorName);
    if (o.radiographerName) o.radiographerName = fix(o.radiographerName);
  }
  for (const m of p.medications || []) {
    m.doctorName = fix(m.doctorName);
    if (m.nurseName) m.nurseName = fix(m.nurseName);
  }
  for (const r of p.routingHistory || []) r.authorizedBy = fix(r.authorizedBy);
  return changed;
}
