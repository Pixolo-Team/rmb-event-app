type IconProps = { size?: number };

export function BookmarkIcon({ filled = false, size = 18 }: IconProps & { filled?: boolean }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <path
        d="M6.5 3.5A1.5 1.5 0 0 1 8 2h8a1.5 1.5 0 0 1 1.5 1.5V21l-6.5-3.75L4.5 21V5A1.5 1.5 0 0 1 6 3.5h.5Z"
        fill={filled ? "currentColor" : "none"}
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function PhoneIcon({ size = 18 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <path
        d="M6.6 10.8c1.2 2.4 3.2 4.4 5.6 5.6l1.9-1.9c.3-.3.7-.4 1-.2 1 .4 2.1.6 3.2.6.6 0 1 .4 1 1V19c0 .6-.4 1-1 1C9.6 20 4 14.4 4 7.7c0-.6.4-1 1-1h3.1c.6 0 1 .4 1 1 0 1.1.2 2.2.6 3.2.1.3 0 .7-.2 1L6.6 10.8Z"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function LinkedInIcon({ size = 18 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <path d="M4.98 3.5A2.5 2.5 0 1 0 5 8.5a2.5 2.5 0 0 0-.02-5ZM3 9.5h4v11H3v-11Zm6 0h3.8v1.5h.05c.53-.95 1.83-1.95 3.77-1.95C20.3 9.05 21 11 21 14.1v6.4h-4v-5.7c0-1.36-.02-3.1-1.9-3.1-1.9 0-2.2 1.48-2.2 3v5.8H9v-11Z" />
    </svg>
  );
}

export function WebsiteIcon({ size = 18 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <circle cx="12" cy="12" r="8" stroke="currentColor" strokeWidth="1.6" />
      <path d="M4 12h16M12 4a13 13 0 0 1 0 16M12 4a13 13 0 0 0 0 16" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}

export function ShareIcon({ size = 18 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <circle cx="18" cy="5" r="2.6" stroke="currentColor" strokeWidth="1.6" />
      <circle cx="6" cy="12" r="2.6" stroke="currentColor" strokeWidth="1.6" />
      <circle cx="18" cy="19" r="2.6" stroke="currentColor" strokeWidth="1.6" />
      <path d="m8.3 10.8 7.4-4.3M8.3 13.2l7.4 4.3" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}

export function CheckIcon({ size = 16 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <path d="m5 12.5 4.5 4.5L19 7" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function ThumbUpIcon({ filled = false, size = 18 }: IconProps & { filled?: boolean }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <path
        d="M7 10v10H4a1 1 0 0 1-1-1v-8a1 1 0 0 1 1-1h3Zm0 0 4.2-6.3a1 1 0 0 1 1.5-.2l.5.5a2 2 0 0 1 .5 1.9L13 9h5.2a2 2 0 0 1 2 2.4l-1.3 6.5a2 2 0 0 1-2 1.6H7"
        fill={filled ? "currentColor" : "none"}
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function CommentIcon({ size = 18 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <path
        d="M4 5.5A1.5 1.5 0 0 1 5.5 4h13A1.5 1.5 0 0 1 20 5.5v9a1.5 1.5 0 0 1-1.5 1.5H9l-4 3.5V16H5.5A1.5 1.5 0 0 1 4 14.5v-9Z"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function HomeIcon({ size = 22, active = false }: IconProps & { active?: boolean }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <path
        d="M4 10.5 12 4l8 6.5V20a1 1 0 0 1-1 1h-4v-6h-6v6H5a1 1 0 0 1-1-1v-9.5Z"
        fill={active ? "currentColor" : "none"}
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function PeopleIcon({ size = 22, active = false }: IconProps & { active?: boolean }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill={active ? "currentColor" : "none"} xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <circle cx="9" cy="8" r="3.2" stroke="currentColor" strokeWidth="1.6" />
      <path d="M3.5 19.5a5.5 5.5 0 0 1 11 0" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      <path d="M16 5.2a3 3 0 0 1 0 5.6M17.5 19.5a5.2 5.2 0 0 0-2.3-4.3" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}

export function AddPostIcon({ size = 22 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <path
        d="M12 5v14M5 12h14"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function BookmarkTabIcon({ size = 22, active = false }: IconProps & { active?: boolean }) {
  return <BookmarkIcon size={size} filled={active} />;
}

export function ProfileIcon({ size = 22, active = false }: IconProps & { active?: boolean }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill={active ? "currentColor" : "none"} xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <circle cx="12" cy="8" r="3.4" stroke="currentColor" strokeWidth="1.6" />
      <path d="M5 20a7 7 0 0 1 14 0" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}

export function ScanIcon({ size = 18 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <path d="M4 8V5.5A1.5 1.5 0 0 1 5.5 4H8M16 4h2.5A1.5 1.5 0 0 1 20 5.5V8M20 16v2.5a1.5 1.5 0 0 1-1.5 1.5H16M8 20H5.5A1.5 1.5 0 0 1 4 18.5V16" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      <path d="M4 12h16" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}
