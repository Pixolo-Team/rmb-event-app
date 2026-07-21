export type Connection = {
  id: string;
  name: string;
  phone: string;
  email: string;
  businessName: string | null;
  businessCategory: string | null;
  bio: string | null;
  tableNumber: string | null;
  photoUrl: string | null;
  linkedInUrl: string | null;
  websiteUrl?: string | null;
  met: boolean;
  metAt: string;
  note: string;
};

export type BookmarkConnection = Omit<Connection, "metAt" | "note"> & { bookmarkedAt: string; bookmarked: true; chapterName: string | null; city: string | null };
export type ConnectionsResponse = { connections: Connection[]; bookmarks: BookmarkConnection[] };

const KEY = "evento:connections:v1";

export const connectionsCache = {
  get(): ConnectionsResponse | null {
    try {
      const value = localStorage.getItem(KEY);
      return value ? JSON.parse(value) as ConnectionsResponse : null;
    } catch { return null; }
  },
  set(value: ConnectionsResponse) {
    try { localStorage.setItem(KEY, JSON.stringify(value)); } catch { /* storage may be unavailable */ }
  },
};
