"use client";

import React, { useState } from "react";
import { useEMR } from "@/context/EMRContext";
import { Patient, DEPARTMENTS_METADATA } from "@/types/emr";
import { FileText, UserPlus, ArrowRightLeft, Search, Clock } from "lucide-react";

interface ReceptionWorkstationProps {
  onOpenIntake: () => void;
  onOpenDossier: (patient: Patient) => void;
  onOpenTransfer: (patient: Patient) => void;
  onEditDetails?: (patient: Patient) => void;
}

export function ReceptionWorkstation({
  onOpenIntake,
  onOpenDossier,
  onOpenTransfer,
  onEditDetails,
}: ReceptionWorkstationProps) {
  const { patients } = useEMR();
  const [searchTerm, setSearchTerm] = useState("");

  // The Front Desk sees patients waiting at the Front Desk. Its returning-patient search can
  // only find patients who have already been discharged, never patients at another station.
  const receptionPatients = patients.filter(
    (p) =>
      p.currentDepartment === "RECEPTION" ||
      (searchTerm &&
        p.currentDepartment === "DISCHARGED" &&
        (p.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
          p.hospitalNumber.toLowerCase().includes(searchTerm.toLowerCase())))
  );

  return (
    <div className="space-y-6">
      {/* Station Title */}
      <div className="bg-white border border-paper-border p-4 sm:p-5 flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-brand" />
            <h2 className="font-serif text-lg sm:text-xl font-bold text-charcoal">
              Front Desk & Medical Records Station
            </h2>
          </div>
          <p className="hidden sm:block text-xs text-charcoal-muted mt-0.5">
            Register new patient charts, issue Trinity University Hospital EHR numbers, and route returning patients directly to any station.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={onOpenIntake}
            className="px-4 py-2 bg-brand hover:bg-brand-hover text-paper text-xs font-semibold flex items-center gap-1.5 border border-brand transition-colors"
          >
            <UserPlus className="w-3.5 h-3.5" />
            <span>Enroll New Patient Chart</span>
          </button>
        </div>
      </div>

      {/* Returning Patient Search Bar */}
      <div className="bg-white border border-paper-border p-4 flex flex-wrap items-center justify-between gap-3">
        <div className="relative w-full sm:flex-1 sm:max-w-md">
          <Search className="w-4 h-4 text-charcoal-muted absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Find a returning patient by name or ID"
            className="w-full pl-9 pr-3 py-2 text-xs bg-paper-warm border border-paper-border focus:border-brand text-charcoal font-sans"
          />
        </div>

        <div className="text-xs text-charcoal-muted font-mono">
          Showing <strong>{receptionPatients.length}</strong> patient docket(s)
        </div>
      </div>

      {/* Patient Dockets Table */}
      <div className="bg-white border border-paper-border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="responsive-table w-full text-left text-xs border-collapse">
            <caption className="sr-only">Patient dockets currently at the Front Desk</caption>
            <thead>
              <tr className="bg-paper-warm border-b border-paper-border text-charcoal font-mono uppercase tracking-wider text-[10px]">
                <th scope="col" className="p-3.5">Hospital Record No.</th>
                <th scope="col" className="p-3.5">Patient Name & Demographics</th>
                <th scope="col" className="p-3.5">Current Location</th>
                <th scope="col" className="p-3.5">Billing Scheme</th>
                <th scope="col" className="p-3.5">Last Hospital Event</th>
                <th scope="col" className="p-3.5 text-right">Station Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-paper-border">
              {receptionPatients.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-charcoal-muted">
                    No patients currently at Front Desk. Use the button above to enroll a new intake or search the hospital registry.
                  </td>
                </tr>
              ) : (
                receptionPatients.map((pat) => {
                  const deptMeta = DEPARTMENTS_METADATA[pat.currentDepartment];
                  const lastRoute = pat.routingHistory[pat.routingHistory.length - 1];

                  return (
                    <tr
                      key={pat.id}
                      className="hover:bg-paper/40 transition-colors cursor-pointer"
                      onClick={() => onOpenDossier(pat)}
                    >
                      <td data-label="Record No." className="p-3.5 font-mono font-bold text-charcoal">
                        {pat.hospitalNumber}
                      </td>

                      <td data-label="Patient" className="p-3.5">
                        <div className="font-serif font-bold text-charcoal text-sm">
                          {pat.fullName}
                        </div>
                        <div className="text-[11px] text-charcoal-muted">
                          {pat.age} yrs &bull; {pat.gender} &bull; {pat.phoneNumber || "No phone"}
                        </div>
                      </td>

                      <td data-label="Location" className="p-3.5">
                        <span className="font-mono text-xs px-2 py-0.5 bg-paper-warm border border-paper-border text-charcoal font-medium">
                          {deptMeta.shortName}
                        </span>
                      </td>

                      <td data-label="Billing" className="p-3.5 text-charcoal-muted font-sans">
                        {pat.paymentType}
                      </td>

                      <td data-label="Last Event" className="p-3.5 max-w-xs">
                        <p className="text-[11px] text-charcoal line-clamp-1">
                          {lastRoute?.reason || "Intake enrolled at Front Desk."}
                        </p>
                        <span className="text-[10px] text-charcoal-subtle font-mono">
                          {new Date(pat.lastUpdated).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                        </span>
                      </td>

                      <td data-label="Actions" className="p-3.5 text-right">
                        <div
                          className="flex items-center justify-end gap-2"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <button
                            type="button"
                            onClick={() => onOpenTransfer(pat)}
                            aria-label={`Route or move ${pat.fullName}`}
                            className="px-2.5 py-2 md:py-1 text-xs bg-brand hover:bg-brand-hover text-paper flex items-center gap-1 font-mono"
                          >
                            <ArrowRightLeft className="w-3 h-3 text-brand-light" />
                            <span>Route / Move</span>
                          </button>

                          {onEditDetails && (
                            <button
                              type="button"
                              onClick={() => onEditDetails(pat)}
                              aria-label={`Edit details for ${pat.fullName}`}
                              className="px-2.5 py-2 md:py-1 text-xs border border-brand text-brand hover:bg-amber-50 bg-white font-mono"
                            >
                              Edit details
                            </button>
                          )}

                          <button
                            type="button"
                            onClick={() => onOpenDossier(pat)}
                            aria-label={`Open chart for ${pat.fullName}`}
                            className="px-2.5 py-2 md:py-1 text-xs border border-paper-border hover:border-brand bg-white font-mono"
                          >
                            Chart
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
