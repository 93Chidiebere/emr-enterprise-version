"use client";

import React, { useEffect, useId, useMemo, useRef, useState } from "react";
import { Icd10Code } from "@/types/emr";
import { Search, X } from "lucide-react";

type Dataset = { codes: [string, string][]; cats: Record<string, string> };

// The full WHO ICD-10 list lives in /public/icd10.json and is only downloaded
// the first time a doctor opens an ICD-10 field.
let datasetPromise: Promise<Dataset> | null = null;
function loadDataset(): Promise<Dataset> {
  if (!datasetPromise) {
    datasetPromise = fetch("/icd10.json")
      .then((r) => {
        if (!r.ok) throw new Error("Could not load ICD-10 list");
        return r.json() as Promise<Dataset>;
      })
      .catch((err) => {
        datasetPromise = null; // allow a retry
        throw err;
      });
  }
  return datasetPromise;
}

interface Icd10PickerProps {
  label: string;
  value: Icd10Code | null;
  onChange: (value: Icd10Code | null) => void;
  required?: boolean;
  error?: string;
  hint?: string;
}

const MAX_RESULTS = 40;

export function Icd10Picker({ label, value, onChange, required, error, hint }: Icd10PickerProps) {
  const uid = useId();
  const labelId = `${uid}-label`;
  const listId = `${uid}-list`;
  const errorId = `${uid}-error`;

  const [data, setData] = useState<Dataset | null>(null);
  const [loadFailed, setLoadFailed] = useState(false);
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);

  const ensureLoaded = () => {
    if (data) return;
    loadDataset()
      .then((d) => {
        setData(d);
        setLoadFailed(false);
      })
      .catch(() => setLoadFailed(true));
  };

  // Pre-compute lowercase descriptions once the data arrives
  const index = useMemo(
    () => (data ? data.codes.map(([code, desc]) => ({ code, desc, lower: desc.toLowerCase() })) : []),
    [data]
  );

  const results = useMemo(() => {
    const q = query.trim();
    if (q.length < 2 || index.length === 0) return [];
    const looksLikeCode = /^[a-z]\d/i.test(q);
    let found: typeof index;
    if (looksLikeCode) {
      const up = q.toUpperCase();
      found = index.filter((c) => c.code.startsWith(up));
    } else {
      const tokens = q.toLowerCase().split(/\s+/).filter(Boolean);
      found = index.filter((c) => tokens.every((t) => c.lower.includes(t) || c.code.toLowerCase() === t));
      const first = tokens[0];
      // Descriptions that start with the search word come first
      found = [...found.filter((c) => c.lower.startsWith(first)), ...found.filter((c) => !c.lower.startsWith(first))];
    }
    return found.slice(0, MAX_RESULTS);
  }, [query, index]);

  useEffect(() => {
    setActive(0);
  }, [query]);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (e: MouseEvent | TouchEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("touchstart", onPointerDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("touchstart", onPointerDown);
    };
  }, [open]);

  const choose = (code: string, description: string) => {
    onChange({ code, description });
    setQuery("");
    setOpen(false);
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setOpen(true);
      setActive((a) => Math.min(a + 1, Math.max(results.length - 1, 0)));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((a) => Math.max(a - 1, 0));
    } else if (e.key === "Enter") {
      if (open && results[active]) {
        e.preventDefault(); // don't submit the consultation form
        choose(results[active].code, results[active].desc);
      }
    } else if (e.key === "Escape") {
      if (open) {
        e.preventDefault();
        e.stopPropagation();
        setOpen(false);
      }
    }
  };

  const activeOptionId = open && results[active] ? `${uid}-opt-${active}` : undefined;
  const showList = open && query.trim().length >= 2;

  return (
    <div ref={wrapperRef} className="relative">
      <span id={labelId} className="block font-mono text-[10px] uppercase text-charcoal-muted mb-1 font-semibold">
        {label}
        {required && <span aria-hidden="true"> *</span>}
      </span>

      {value ? (
        <div
          className="flex items-start justify-between gap-2 p-2 bg-brand-light border border-brand-border"
          role="group"
          aria-labelledby={labelId}
        >
          <div className="min-w-0">
            <span className="font-mono font-bold text-brand text-sm mr-2">{value.code}</span>
            <span className="text-xs text-charcoal">{value.description}</span>
          </div>
          <button
            type="button"
            onClick={() => {
              onChange(null);
              setTimeout(() => inputRef.current?.focus(), 0);
            }}
            aria-label={`Clear ICD-10 code ${value.code} for ${label}`}
            className="shrink-0 p-1.5 text-charcoal-muted hover:text-terracotta"
          >
            <X aria-hidden="true" className="w-3.5 h-3.5" />
          </button>
        </div>
      ) : (
        <>
          <div className="relative">
            <Search aria-hidden="true" className="w-3.5 h-3.5 text-charcoal-muted absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              ref={inputRef}
              type="text"
              role="combobox"
              aria-labelledby={labelId}
              aria-expanded={showList}
              aria-controls={listId}
              aria-autocomplete="list"
              aria-activedescendant={activeOptionId}
              aria-describedby={error ? errorId : undefined}
              aria-invalid={error ? true : undefined}
              autoComplete="off"
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setOpen(true);
                ensureLoaded();
              }}
              onFocus={ensureLoaded}
              onKeyDown={onKeyDown}
              placeholder="Search: B50 or malaria"
              className="w-full p-2 pl-8 bg-paper-warm border border-paper-border focus:border-brand text-charcoal"
            />
          </div>

          {showList && (
            <ul
              id={listId}
              role="listbox"
              aria-label={`${label} suggestions`}
              className="absolute left-0 right-0 mt-1 max-h-64 overflow-y-auto bg-white border border-brand shadow-sm z-40 divide-y divide-paper-border"
            >
              {loadFailed && (
                <li className="p-3 text-xs text-terracotta" role="presentation">
                  Could not load the ICD-10 list. Check your connection and try typing again.
                </li>
              )}
              {!loadFailed && !data && (
                <li className="p-3 text-xs text-charcoal-muted" role="presentation">
                  Loading ICD-10 list...
                </li>
              )}
              {data && results.length === 0 && (
                <li className="p-3 text-xs text-charcoal-muted" role="presentation">
                  No matching ICD-10 code. Try a different word or the start of a code.
                </li>
              )}
              {results.map((r, i) => {
                const category = data?.cats[r.code.slice(0, 3)];
                return (
                  <li
                    key={r.code}
                    id={`${uid}-opt-${i}`}
                    role="option"
                    aria-selected={i === active}
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => choose(r.code, r.desc)}
                    onMouseEnter={() => setActive(i)}
                    className={`px-3 py-2.5 cursor-pointer text-xs ${i === active ? "bg-brand-light" : "bg-white"}`}
                  >
                    <span className="font-mono font-bold text-brand mr-2">{r.code}</span>
                    <span className="text-charcoal">{r.desc}</span>
                    {category && category !== r.desc && (
                      <span className="block text-[10px] text-charcoal-muted mt-0.5">
                        Category {r.code.slice(0, 3)}: {category}
                      </span>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </>
      )}

      {hint && !error && <p className="mt-1 text-[10px] text-charcoal-muted">{hint}</p>}
      {error && (
        <p id={errorId} role="alert" className="mt-1 text-[11px] text-terracotta font-semibold">
          {error}
        </p>
      )}
    </div>
  );
}
