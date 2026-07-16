"use client";

import Dexie, { Table } from "dexie";
import { useCallback, useEffect, useState } from "react";

// PF4 — Offline Sync Engine. A small IndexedDB (via Dexie) write queue: writes
// that can't reach the server (offline, mid-session network drop) are stored
// locally and replayed once connectivity returns. All endpoints this is used
// against (checkin/*) are idempotent, so replaying is always safe.

export type QueueKind = "checkin-geolocation" | "checkin-manual" | "checkin-qr-scan";

export interface QueuedWrite {
  id?: number;
  kind: QueueKind;
  url: string;
  body: string;
  createdAt: number;
}

interface KvRow {
  key: string;
  value: unknown;
}

class OfflineDB extends Dexie {
  queue!: Table<QueuedWrite, number>;
  kv!: Table<KvRow, string>;

  constructor() {
    super("evento-offline");
    this.version(1).stores({
      queue: "++id, kind, createdAt",
      kv: "key",
    });
  }
}

const db = new OfflineDB();

export async function enqueueWrite(kind: QueueKind, url: string, body: unknown): Promise<void> {
  await db.queue.add({ kind, url, body: JSON.stringify(body), createdAt: Date.now() });
}

export async function pendingCount(): Promise<number> {
  return db.queue.count();
}

/**
 * Replays queued writes in order. A write that gets any HTTP response (success
 * or rejection) is considered resolved and removed — the queue is only for
 * "couldn't reach the server," not for retrying business-logic failures. A
 * thrown fetch (still offline) stops the flush; the rest stay queued.
 */
export async function flushQueue(onSynced?: (kind: QueueKind, response: unknown) => void): Promise<void> {
  const items = await db.queue.orderBy("createdAt").toArray();
  for (const item of items) {
    let res: Response;
    try {
      res = await fetch(item.url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: item.body,
      });
    } catch {
      break; // still offline — stop, keep the rest queued for next time
    }
    await db.queue.delete(item.id!);
    if (res.ok && onSynced) {
      onSynced(item.kind, await res.json().catch(() => null));
    }
  }
}

export async function cacheVenueConfig(config: { venueLat: number | null; venueLng: number | null; checkinRadiusM: number }): Promise<void> {
  await db.kv.put({ key: "venueConfig", value: config });
}

export async function getCachedVenueConfig(): Promise<
  { venueLat: number | null; venueLng: number | null; checkinRadiusM: number } | null
> {
  const row = await db.kv.get("venueConfig");
  return (row?.value as { venueLat: number | null; venueLng: number | null; checkinRadiusM: number }) ?? null;
}

const FLUSH_INTERVAL_MS = 15000;

/** Tracks online/offline state and keeps the queue draining whenever connectivity is up. */
export function useOfflineSync(onSynced?: (kind: QueueKind, response: unknown) => void) {
  const [pending, setPending] = useState(0);
  const [online, setOnline] = useState(true);

  const refreshPending = useCallback(() => {
    pendingCount().then(setPending);
  }, []);

  useEffect(() => {
    setOnline(navigator.onLine);
    refreshPending();

    function flushAndRefresh() {
      flushQueue(onSynced).then(refreshPending);
    }

    function handleOnline() {
      setOnline(true);
      flushAndRefresh();
    }
    function handleOffline() {
      setOnline(false);
    }

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    if (navigator.onLine) flushAndRefresh();

    const interval = setInterval(() => {
      if (navigator.onLine) flushAndRefresh();
    }, FLUSH_INTERVAL_MS);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
      clearInterval(interval);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refreshPending]);

  return { pending, online, refreshPending };
}
