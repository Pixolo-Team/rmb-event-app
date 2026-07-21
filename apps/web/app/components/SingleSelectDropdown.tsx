"use client";

import { useState } from "react";

export function ChevronDownIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="m6 9 6 6 6-6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

// Native <select> popups are positioned and sized by the OS/browser, ignoring
// our layout entirely — on some platforms that lets the options panel spill
// past the app's frame. This draws the same list ourselves so it's confined
// like every other dropdown in the app.
export function SingleSelectDropdown({
  label,
  options,
  value,
  onChange,
  placeholder,
  id,
}: {
  label: string;
  options: readonly string[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  id?: string;
}) {
  const [open, setOpen] = useState(false);

  function choose(next: string) {
    onChange(next);
    setOpen(false);
  }

  return (
    <div className="field multiselect">
      <label htmlFor={id}>{label}</label>
      <button
        id={id}
        type="button"
        className={`multiselect-trigger${!value ? " placeholder" : ""}`}
        onClick={() => setOpen((o) => !o)}
      >
        <span>{value || placeholder || `Select ${label.toLowerCase()}`}</span>
        <span className={`multiselect-caret${open ? " open" : ""}`}>
          <ChevronDownIcon />
        </span>
      </button>
      {open && (
        <>
          <div className="multiselect-backdrop" onClick={() => setOpen(false)} />
          <div className="multiselect-panel">
            {options.map((opt) => (
              <button
                key={opt}
                type="button"
                className={`select-dropdown-option${opt === value ? " active" : ""}`}
                onClick={() => choose(opt)}
              >
                {opt}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
