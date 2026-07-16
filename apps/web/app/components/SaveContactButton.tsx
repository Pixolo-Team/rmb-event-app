"use client";

import { createVCard, type VCardContact, vCardFileName } from "../lib/vcard";

export function SaveContactButton({ contact, className = "" }: { contact: VCardContact; className?: string }) {
  function save() {
    const blob = new Blob([createVCard(contact)], { type: "text/vcard;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = vCardFileName(contact.name);
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  return <button className={`save-contact-button ${className}`.trim()} type="button" onClick={save}><ContactIcon /> Save to phone contacts</button>;
}

function ContactIcon() {
  return <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="9" cy="8" r="3" /><path d="M3.5 19c.5-3.6 2.3-5.4 5.5-5.4s5 1.8 5.5 5.4M18 7v6M15 10h6" /></svg>;
}
