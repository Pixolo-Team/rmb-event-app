const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';

// The CSRF cookie belongs to the API's own origin, so document.cookie can't
// see it from here once the web app and API are cross-origin. Fetch it once
// on load instead and cache it in memory. Kicked off eagerly at module load
// so it's almost always resolved before the user triggers a mutating request.
let cachedToken: string | null = null;
let tokenPromise: Promise<string | null> | null = null;

function fetchCsrfToken(): Promise<string | null> {
  if (!tokenPromise) {
    tokenPromise = fetch(`${API_BASE_URL}/csrf`, { credentials: 'include' })
      .then((res) => (res.ok ? res.json() : null))
      .then((data: { csrfToken?: string } | null) => {
        cachedToken = data?.csrfToken ?? null;
        return cachedToken;
      })
      .catch(() => null);
  }
  return tokenPromise;
}

if (typeof window !== 'undefined') {
  fetchCsrfToken();
}

export function getCsrfToken(): string | null {
  return cachedToken;
}

export function withCsrfHeaders(init: RequestInit = {}): RequestInit {
  const headers = new Headers(init.headers);
  if (cachedToken) headers.set('X-CSRF-Token', cachedToken);
  return { ...init, headers };
}
