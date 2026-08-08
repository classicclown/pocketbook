import { useSyncExternalStore } from "react";

// Device-local overlay that records shared-purchase / reimbursement splits on
// top of the read-only sheet transactions. Two shapes, both keyed by the
// expense's id (see splitId):
//   { mode: "share", myShare: <ZAR you actually incurred> }
//   { mode: "links", links: [<id of each repayment income tx>] }
// The transform in utils/splits.js turns these into netted amounts. Storage is
// a single JSON blob so it stays in sync with the tags overlay pattern.
const STORE_KEY = "pb:splits";

const listeners = new Set();
let cache = null;      // parsed object cache, invalidated on write
let snapshot = "{}";   // raw string; identity drives useSyncExternalStore

function read() {
  try {
    const raw = localStorage.getItem(STORE_KEY) || "{}";
    if (raw !== snapshot || cache === null) {
      snapshot = raw;
      cache = JSON.parse(raw) || {};
    }
    return cache;
  } catch {
    cache = {};
    return cache;
  }
}

function write(next) {
  const raw = JSON.stringify(next);
  localStorage.setItem(STORE_KEY, raw);
  snapshot = raw;
  cache = next;
  listeners.forEach((l) => l());
}

// Stable id for a transaction. A split expense carries its pre-net original in
// _split.original, so the id is invariant to the netting transform.
export function splitId(tx) {
  const amt = tx._split ? tx._split.original : tx.amount;
  return `${tx.date}|${tx.vendor}|${amt}`;
}

export function getAllSplits() {
  return read();
}

export function setSplit(id, def) {
  const next = { ...read(), [id]: def };
  write(next);
}

export function removeSplit(id) {
  const next = { ...read() };
  delete next[id];
  write(next);
}

export function useSplits() {
  const raw = useSyncExternalStore(
    (cb) => { listeners.add(cb); return () => listeners.delete(cb); },
    () => { read(); return snapshot; },
    () => "{}"
  );
  // Parse from the versioned snapshot so consumers re-render on change.
  const splits = raw === snapshot ? read() : JSON.parse(raw || "{}");
  return { splits, setSplit, removeSplit };
}
