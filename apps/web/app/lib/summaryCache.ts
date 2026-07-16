export type SummaryConnection = { id: string; name: string; phone: string; email: string; businessName: string | null; tableNumber: string | null; metAt: string; note: string };
export type EventSummary = { attendeeName: string; event: { name: string; startAt: string | null; endAt: string | null }; peopleMet: number; cardsCollected: number; rank: number; totalRanked: number; topConnections: SummaryConnection[]; generatedAt: string };
const KEY = "evento:summary:v1";
export const summaryCache = { get(): EventSummary | null { try { const value = localStorage.getItem(KEY); return value ? JSON.parse(value) as EventSummary : null; } catch { return null; } }, set(value: EventSummary) { try { localStorage.setItem(KEY, JSON.stringify(value)); } catch { /* best effort */ } } };
