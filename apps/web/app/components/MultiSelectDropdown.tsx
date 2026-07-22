"use client";

import { useState } from "react";
import { ChevronDownIcon } from "./SingleSelectDropdown";

// Searchable multi-select rendered as a confined dropdown (shared by onboarding
// and the profile editor). Uses the .multiselect-* styles in globals.css.
export function MultiSelectDropdown({
  label,
  options,
  selected,
  onToggle,
  disabled = false,
  placeholder,
}: {
  label: string;
  options: readonly string[];
  selected: string[];
  onToggle: (value: string) => void;
  disabled?: boolean;
  placeholder?: string;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const visibleOptions = options.filter((option) => option.toLowerCase().includes(query.trim().toLowerCase()));

  return (
    <div className="field multiselect">
      <label>{label}</label>
      <button
        type="button"
        className={`multiselect-trigger${selected.length === 0 ? " placeholder" : ""}`}
        onClick={() => setOpen((o) => !o)}
        disabled={disabled}
      >
        <span>{selected.length === 0 ? (placeholder ?? `Select ${label.toLowerCase()}`) : selected.join(", ")}</span>
        <span className={`multiselect-caret${open ? " open" : ""}`}>
          <ChevronDownIcon />
        </span>
      </button>
      {open && (
        <>
          <div className="multiselect-backdrop" onClick={() => setOpen(false)} />
          <div className="multiselect-panel">
            <input
              className="multiselect-search"
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder={`Search ${label.toLowerCase()}`}
              aria-label={`Search ${label.toLowerCase()}`}
              autoFocus
            />
            {visibleOptions.map((opt) => (
              <label key={opt} className="multiselect-option">
                <input type="checkbox" checked={selected.includes(opt)} onChange={() => onToggle(opt)} />
                {opt}
              </label>
            ))}
            {visibleOptions.length === 0 && <div className="multiselect-empty">No options found</div>}
            <button type="button" className="multiselect-done" onClick={() => { setOpen(false); setQuery(""); }}>
              Done
            </button>
          </div>
        </>
      )}
    </div>
  );
}
