"use client";

import { useState } from "react";

export function ChevronDownIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="m6 9 6 6 6-6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

type SingleSelectOption = string | { value: string; label: string };

function normalizeOption(option: SingleSelectOption) {
  return typeof option === "string" ? { value: option, label: option } : option;
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
  options: readonly SingleSelectOption[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  id?: string;
}) {
  const [open, setOpen] = useState(false);
  const normalizedOptions = options.map(normalizeOption);
  const selectedLabel = normalizedOptions.find((option) => option.value === value)?.label ?? "";

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
        <span>{selectedLabel || placeholder || `Select ${label.toLowerCase()}`}</span>
        <span className={`multiselect-caret${open ? " open" : ""}`}>
          <ChevronDownIcon />
        </span>
      </button>
      {open && (
        <>
          <div className="multiselect-backdrop" onClick={() => setOpen(false)} />
          <div className="multiselect-panel">
            {normalizedOptions.map((opt) => (
              <button
                key={`${label}-${opt.value || "__empty__"}`}
                type="button"
                className={`select-dropdown-option${opt.value === value ? " active" : ""}`}
                onClick={() => choose(opt.value)}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
