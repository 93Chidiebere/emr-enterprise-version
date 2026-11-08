"use client";

import React from "react";
import { useEMR } from "@/context/EMRContext";
import { useAuth } from "@/context/AuthContext";
import { DEPARTMENTS_METADATA, HOSPITAL_ROLES, Patient } from "@/types/emr";
import { handledBy } from "@/lib/actors";
import { Eye, Pencil } from "lucide-react";

interface Props {
  onOpenChart: (p: Patient) => void;
  onEditDetails: (p: Patient) => void;
}

/**
 * Every station can look back at the patients it personally worked on, wherever they are now.
 * The charts are read-only here; only the Front Desk can correct a patient's personal details.
 */
export function MyPatientsPanel({ onOpenChart, onEditDetails }: Props) {
  const { patients, activeRole } = useEMR();
  const { currentUser } = useAuth();
  if (!currentUser) return null;

  const myDept = HOSPITAL_ROLES.find((r) => r.id === activeRole)?.department;
  const canEdit = activeRole === "receptionist";

  // patients I worked on that are no longer in my own queue
  const mine = patients
    .filter((p) => handledBy(p, currentUser.fullName) && p.currentDepartment !== myDept)
    .sort((a, b) => new Date(b.lastUpdated).getTime() - new Date(a.lastUpdated).getTime());

  return (
    <section aria-labelledby="my-patients-title" className="mt-8 bg-white border border-paper-border">
      <div className="p-4 border-b border-paper-border">
        <h2 id="my-patients-title" className="font-sans text-base font-bold text-navy-dark">
          Patients I worked on ({mine.length})
        </h2>
        <p className="text-xs text-slate-600 mt-0.5">
          Look back at patients you treated, even after they moved to another station.
          {canEdit ? " You can correct their personal details, for example to add a missing phone number." : " These records are read-only."}
        </p>
      </div>

      {mine.length === 0 ? (
        <p className="p-4 text-sm text-slate-500">No patients yet. Patients you work on will be listed here after they move on.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="responsive-table w-full text-left text-xs border-collapse">
            <caption className="sr-only">Patients this person has worked on</caption>
            <thead>
              <tr className="bg-paper-warm font-mono uppercase text-[10px] text-slate-600">
                <th scope="col" className="p-3">Record no.</th>
                <th scope="col" className="p-3">Patient</th>
                <th scope="col" className="p-3">Now at</th>
                <th scope="col" className="p-3">Status</th>
                <th scope="col" className="p-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-paper-border">
              {mine.map((p) => (
                <tr key={p.id}>
                  <td data-label="Record no." className="p-3 font-mono font-bold">{p.hospitalNumber}</td>
                  <td data-label="Patient" className="p-3">
                    <div className="font-bold text-sm text-navy-dark">{p.fullName}</div>
                    <div className="text-slate-500">
                      {p.age}y, {p.gender}
                      {p.phoneNumber ? ` · ${p.phoneNumber}` : " · no phone number"}
                    </div>
                  </td>
                  <td data-label="Now at" className="p-3">{DEPARTMENTS_METADATA[p.currentDepartment]?.shortName ?? p.currentDepartment}</td>
                  <td data-label="Status" className="p-3">{p.status}</td>
                  <td data-label="Actions" className="p-3 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => onOpenChart(p)}
                        aria-label={`View chart for ${p.fullName} (read-only)`}
                        className="px-2.5 py-2 md:py-1 text-xs border border-paper-border hover:border-brand bg-white flex items-center gap-1"
                      >
                        <Eye aria-hidden="true" className="w-3 h-3" /> View chart
                      </button>
                      {canEdit && (
                        <button
                          type="button"
                          onClick={() => onEditDetails(p)}
                          aria-label={`Edit details for ${p.fullName}`}
                          className="px-2.5 py-2 md:py-1 text-xs bg-brand hover:bg-brand-hover text-navy-dark font-bold flex items-center gap-1"
                        >
                          <Pencil aria-hidden="true" className="w-3 h-3" /> Edit details
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
