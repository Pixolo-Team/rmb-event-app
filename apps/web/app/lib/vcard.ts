export type VCardContact = {
  name: string;
  phone: string;
  email?: string | null;
  company?: string | null;
  note?: string | null;
};

function escapeValue(value: string): string {
  return value.replace(/\\/g, "\\\\").replace(/\r?\n/g, "\\n").replace(/,/g, "\\,").replace(/;/g, "\\;");
}

export function createVCard(contact: VCardContact): string {
  const lines = [
    "BEGIN:VCARD",
    "VERSION:3.0",
    `FN:${escapeValue(contact.name)}`,
    `N:;${escapeValue(contact.name)};;;`,
    `TEL;TYPE=CELL:${escapeValue(contact.phone)}`,
  ];
  if (contact.email) lines.push(`EMAIL;TYPE=INTERNET:${escapeValue(contact.email)}`);
  if (contact.company) lines.push(`ORG:${escapeValue(contact.company)}`);
  if (contact.note) lines.push(`NOTE:${escapeValue(contact.note)}`);
  lines.push("END:VCARD");
  return `${lines.join("\r\n")}\r\n`;
}

export function vCardFileName(name: string): string {
  const safe = name.trim().replace(/[^a-z0-9]+/gi, "-").replace(/^-|-$/g, "").toLowerCase();
  return `${safe || "evento-contact"}.vcf`;
}
