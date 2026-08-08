import { useState, useCallback } from "react";

// The home dashboard is a single ordered list of tiles, each with a size
// ("full" spans both desktop columns, "half" spans one). Built-in tiles are
// referenced by a known id; user-created tiles carry a definition in `custom`
// and use a "custom:<n>" id. Everything is device-local (localStorage) —
// consistent with the theme and colour palette.
//
// Shape: { items: [{ id, size }], custom: { [id]: definition } }
// Default is an empty dashboard (blank slate).

function load(key) {
  try {
    const saved = JSON.parse(localStorage.getItem(key));
    const items = Array.isArray(saved?.items) ? saved.items.filter(it => it && it.id) : [];
    const custom = saved?.custom && typeof saved.custom === "object" ? saved.custom : {};
    return { items, custom };
  } catch {
    return { items: [], custom: {} };
  }
}

export function useDashboard(key) {
  const [state, setState] = useState(() => load(key));

  const apply = useCallback((next) => {
    setState(next);
    localStorage.setItem(key, JSON.stringify(next));
  }, [key]);

  const has = (id) => state.items.some(it => it.id === id);

  const add = useCallback((id, size = "half") => {
    setState(prev => {
      if (prev.items.some(it => it.id === id)) return prev;
      const next = { ...prev, items: [...prev.items, { id, size }] };
      localStorage.setItem(key, JSON.stringify(next));
      return next;
    });
  }, [key]);

  const remove = useCallback((id) => {
    setState(prev => {
      const items = prev.items.filter(it => it.id !== id);
      // A removed custom tile is deleted entirely (it only exists on the board).
      const custom = { ...prev.custom };
      if (id.startsWith("custom:")) delete custom[id];
      const next = { items, custom };
      localStorage.setItem(key, JSON.stringify(next));
      return next;
    });
  }, [key]);

  // Swap a tile with its neighbour in the flat order.
  const move = useCallback((id, dir) => {
    setState(prev => {
      const items = [...prev.items];
      const i = items.findIndex(it => it.id === id);
      const j = i + dir;
      if (i < 0 || j < 0 || j >= items.length) return prev;
      [items[i], items[j]] = [items[j], items[i]];
      const next = { ...prev, items };
      localStorage.setItem(key, JSON.stringify(next));
      return next;
    });
  }, [key]);

  const setSize = useCallback((id, size) => {
    setState(prev => {
      const items = prev.items.map(it => it.id === id ? { ...it, size } : it);
      const next = { ...prev, items };
      localStorage.setItem(key, JSON.stringify(next));
      return next;
    });
  }, [key]);

  // Create or update a custom tile definition. On create it is appended to the
  // board; on update the existing tile keeps its place.
  const saveCustom = useCallback((def) => {
    setState(prev => {
      const id = def.id || `custom:${Date.now()}`;
      const custom = { ...prev.custom, [id]: { ...def, id } };
      const exists = prev.items.some(it => it.id === id);
      const items = exists ? prev.items : [...prev.items, { id, size: def.size || "half" }];
      const next = { items, custom };
      localStorage.setItem(key, JSON.stringify(next));
      return next;
    });
  }, [key]);

  const reset = useCallback(() => {
    localStorage.removeItem(key);
    setState({ items: [], custom: {} });
  }, [key]);

  return { items: state.items, custom: state.custom, has, add, remove, move, setSize, saveCustom, reset, apply };
}
