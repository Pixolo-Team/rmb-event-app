// Shared contact rows for the profile screens (F2.5 attendee profile + F4.1 own
// profile). Renders phone/email as clean, tappable rows with an icon badge and a
// label/value stack — replacing the raw underlined <a> links.

function formatPhone(raw: string): string {
  const digits = raw.replace(/[^\d+]/g, "");
  const india = digits.match(/^\+91(\d{10})$/);
  if (india) return `+91 ${india[1].slice(0, 5)} ${india[1].slice(5)}`;
  return raw;
}

export function ContactRows({
  phone,
  email,
  tableNumber,
}: {
  phone: string;
  email: string;
  tableNumber?: string | null;
}) {
  return (
    <div className="contact-rows">
      <a className="contact-row" href={`tel:${phone.replace(/\s/g, "")}`}>
        <span className="contact-row-icon"><PhoneIcon /></span>
        <span className="contact-row-body">
          <span className="contact-row-label">Phone</span>
          <span className="contact-row-value">{formatPhone(phone)}</span>
        </span>
      </a>
      <a className="contact-row" href={`mailto:${email}`}>
        <span className="contact-row-icon"><MailIcon /></span>
        <span className="contact-row-body">
          <span className="contact-row-label">Email</span>
          <span className="contact-row-value">{email}</span>
        </span>
      </a>
      {tableNumber && (
        <div className="contact-row contact-row-static">
          <span className="contact-row-icon"><TableIcon /></span>
          <span className="contact-row-body">
            <span className="contact-row-label">Table</span>
            <span className="contact-row-value">{tableNumber}</span>
          </span>
        </div>
      )}
    </div>
  );
}

function PhoneIcon() {
  return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 5c0 8.3 6.7 15 15 15a2 2 0 0 0 2-2v-2.5a1 1 0 0 0-.8-1l-3-.6a1 1 0 0 0-1 .4l-.8 1.1a11.5 11.5 0 0 1-5-5l1.1-.8a1 1 0 0 0 .4-1l-.6-3a1 1 0 0 0-1-.8H6a2 2 0 0 0-2 2Z" /></svg>;
}
function MailIcon() {
  return <svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="5" width="18" height="14" rx="2" /><path d="m4 7 8 6 8-6" /></svg>;
}
function TableIcon() {
  return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 6h16M4 6v12h16V6M9 6v12M4 12h16" /></svg>;
}
