export type Connection = {
  id: string;
  name: string;
  phone: string;
  businessName: string | null;
  businessCategory: string | null;
  bio: string | null;
  tableNumber: string | null;
  photoUrl: string | null;
  metAt: string;
  note: string;
};

export type ConnectionsResponse = { connections: Connection[] };

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
