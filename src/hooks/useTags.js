import { useSyncExternalStore } from "react";

export const DEFAULT_TAG_OPTIONS = ["Business", "Holiday", "One-off", "Irregular"];

// Reactive store over the localStorage-persisted transaction tags so every
// consumer (rows, projections) re-renders when a tag changes.
const listeners = new Set();
let version = 0;

function emit() {
  version++;
  listeners.forEach((l) => l());
}

export function txKey(tx) {
  return `tag_${tx.date}_${tx.vendor}_${tx.amount}`;
}

export function getTag(tx) {
  return localStorage.getItem(txKey(tx));
}

export function setTag(tx, tag) {
  const key = txKey(tx);
  if (tag == null) localStorage.removeItem(key);
  else localStorage.setItem(key, tag);
  emit();
}

export function clearAllTags() {
  const stale = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key && key.startsWith("tag_")) stale.push(key);
  }
  stale.forEach((k) => localStorage.removeItem(k));
  emit();
}

// Custom tag options live alongside the defaults in localStorage.
const OPTIONS_KEY = "pb:tagOptions";

export function getCustomTagOptions() {
  try {
    const list = JSON.parse(localStorage.getItem(OPTIONS_KEY));
    return Array.isArray(list) ? list : [];
  } catch {
    return [];
  }
}

export function setCustomTagOptions(list) {
  localStorage.setItem(OPTIONS_KEY, JSON.stringify(list));
  emit();
}

export function getTagOptions() {
  return [...DEFAULT_TAG_OPTIONS, ...getCustomTagOptions()];
}

export function useTags() {
  const v = useSyncExternalStore(
    (cb) => {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
    () => version
  );
  return { version: v, getTag, setTag, options: getTagOptions() };
}
