export interface DirectoryAttendee {
  id: string;
  name: string;
  businessName: string | null;
  businessCategory: string | null;
  city: string | null;
  photoUrl: string | null;
  tableNumber: string | null;
  chapterName: string | null;
  checkedIn: boolean;
}

export interface DirectoryFacets {
  businessCategories: string[];
  companies: string[];
  chapters: string[];
  cities: string[];
  hasAttendeesWithoutChapter: boolean;
}

export interface DirectoryResponse {
  attendees: DirectoryAttendee[];
  facets: DirectoryFacets;
}

export interface AttendeeProfile extends DirectoryAttendee {
  email: string;
  phone: string;
  lookingFor: string[];
  offering: string[];
  goals: string[];
  bio: string | null;
}

const DIRECTORY_KEY = "evento-directory-v1";
const PROFILE_PREFIX = "evento-directory-profile-v1:";

function read<T>(key: string): T | null {
  try {
    const value = localStorage.getItem(key);
    return value ? (JSON.parse(value) as T) : null;
  } catch {
    return null;
  }
}

function write(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Storage may be full or unavailable; the live response remains usable.
  }
}

export const directoryCache = {
  get: () => read<DirectoryResponse>(DIRECTORY_KEY),
  set: (value: DirectoryResponse) => write(DIRECTORY_KEY, value),
  getProfile: (id: string) => read<AttendeeProfile>(`${PROFILE_PREFIX}${id}`),
  setProfile: (id: string, value: AttendeeProfile) => write(`${PROFILE_PREFIX}${id}`, value),
};
