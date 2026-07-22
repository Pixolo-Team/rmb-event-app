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
  interactive = true,
  showChevron = false,
}: {
  phone: string;
  email: string;
  tableNumber?: string | null;
  interactive?: boolean;
  showChevron?: boolean;
}) {
  return (
    <div className="contact-rows">
      {interactive ? (
        <a className="contact-row" href={`tel:${phone.replace(/\s/g, "")}`}>
          <span className="contact-row-icon"><PhoneIcon /></span>
          <span className="contact-row-body">
            <span className="contact-row-label">Phone</span>
            <span className="contact-row-value">{formatPhone(phone)}</span>
          </span>
          {showChevron ? <span className="contact-row-chevron" aria-hidden="true"><ChevronIcon /></span> : null}
        </a>
      ) : (
        <div className="contact-row contact-row-static">
          <span className="contact-row-icon"><PhoneIcon /></span>
          <span className="contact-row-body">
            <span className="contact-row-label">Phone</span>
            <span className="contact-row-value">{formatPhone(phone)}</span>
          </span>
        </div>
      )}
      {interactive ? (
        <a className="contact-row" href={`mailto:${email}`}>
          <span className="contact-row-icon"><MailIcon /></span>
          <span className="contact-row-body">
            <span className="contact-row-label">Email</span>
            <span className="contact-row-value">{email}</span>
          </span>
          {showChevron ? <span className="contact-row-chevron" aria-hidden="true"><ChevronIcon /></span> : null}
        </a>
      ) : (
        <div className="contact-row contact-row-static">
          <span className="contact-row-icon"><MailIcon /></span>
          <span className="contact-row-body">
            <span className="contact-row-label">Email</span>
            <span className="contact-row-value">{email}</span>
          </span>
        </div>
      )}
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
  return <svg viewBox="0 0 24 24" aria-hidden="true"><path opacity="0.1" d="M3 6.5C3 14.5081 9.49187 21 17.5 21C18.166 21 18.8216 20.9551 19.4637 20.8682C20.3747 20.7448 21 19.9292 21 19.01V16.4415C21 15.5807 20.4491 14.8164 19.6325 14.5442L16.4841 13.4947C15.6836 13.2279 14.8252 13.699 14.6206 14.5177C14.3475 15.6102 12.987 15.987 12.1907 15.1907L8.80926 11.8093C8.01301 11.013 8.38984 9.65254 9.48229 9.37943C10.301 9.17476 10.7721 8.31644 10.5053 7.51586L9.45585 4.36754C9.18362 3.55086 8.41934 3 7.55848 3H4.99004C4.0708 3 3.25518 3.62533 3.13185 4.53627C3.0449 5.17845 3 5.83398 3 6.5Z" fill="currentColor" /><path d="M3 6.5C3 14.5081 9.49187 21 17.5 21C18.166 21 18.8216 20.9551 19.4637 20.8682C20.3747 20.7448 21 19.9292 21 19.01V16.4415C21 15.5807 20.4491 14.8164 19.6325 14.5442L16.4841 13.4947C15.6836 13.2279 14.8252 13.699 14.6206 14.5177C14.3475 15.6102 12.987 15.987 12.1907 15.1907L8.80926 11.8093C8.01301 11.013 8.38984 9.65254 9.48229 9.37943C10.301 9.17476 10.7721 8.31644 10.5053 7.51586L9.45585 4.36754C9.18362 3.55086 8.41934 3 7.55848 3H4.99004C4.0708 3 3.25518 3.62533 3.13185 4.53627C3.0449 5.17845 3 5.83398 3 6.5Z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" /></svg>;
}
function MailIcon() {
  return <svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="5" width="18" height="14" rx="2" /><path d="m4 7 8 6 8-6" /></svg>;
}
function TableIcon() {
  return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 6h16M4 6v12h16V6M9 6v12M4 12h16" /></svg>;
}
function ChevronIcon() {
  return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m9 6 6 6-6 6" /></svg>;
}
