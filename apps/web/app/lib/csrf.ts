export function getCsrfToken(): string | null {
  if (typeof document === 'undefined') return null;
  const match = document.cookie.match(/evento_csrf=([^;]+)/);
  return match ? decodeURIComponent(match[1]) : null;
}

export function withCsrfHeaders(init: RequestInit = {}): RequestInit {
  const token = getCsrfToken();
  const headers = new Headers(init.headers);
  if (token) headers.set('X-CSRF-Token', token);
  return { ...init, headers };
}
