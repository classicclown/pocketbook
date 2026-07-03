import { useState, useCallback } from "react";

// Persisted two-column card ordering, editable on desktop only: ↑/↓ within a
// column, ◀/▶ across columns. Mobile just renders the flattened list (left
// column then right) in whatever order was arranged on desktop.
function loadLayout(key, defaults) {
  const known = new Set([...defaults.left, ...defaults.right]);
  try {
    const saved = JSON.parse(localStorage.getItem(key));
    const left = saved.left.filter(id => known.has(id));
    const right = saved.right.filter(id => known.has(id));
    const present = new Set([...left, ...right]);
    // cards added after the layout was saved join their default column
    defaults.left.forEach(id => { if (!present.has(id)) left.push(id); });
    defaults.right.forEach(id => { if (!present.has(id)) right.push(id); });
    return { left, right };
  } catch {
    return defaults;
  }
}

export function useCardLayout(key, defaults) {
  const [layout, setLayout] = useState(() => loadLayout(key, defaults));

  const apply = useCallback((next) => {
    setLayout(next);
    localStorage.setItem(key, JSON.stringify(next));
  }, [key]);

  const columnOf = (id) => (layout.left.includes(id) ? "left" : "right");

  // Swap with the neighbour in the same column.
  const moveVertical = (id, dir) => {
    const colName = columnOf(id);
    const col = [...layout[colName]];
    const i = col.indexOf(id);
    const j = i + dir;
    if (j < 0 || j >= col.length) return;
    [col[i], col[j]] = [col[j], col[i]];
    apply({ ...layout, [colName]: col });
  };

  // Move to the other column, keeping roughly the same height.
  const moveAcross = (id) => {
    const from = columnOf(id);
    const to = from === "left" ? "right" : "left";
    const idx = Math.min(layout[from].indexOf(id), layout[to].length);
    const fromArr = layout[from].filter(x => x !== id);
    const toArr = [...layout[to]];
    toArr.splice(idx, 0, id);
    apply({ [from]: fromArr, [to]: toArr });
  };

  const reset = () => {
    localStorage.removeItem(key);
    setLayout(defaults);
  };

  return {
    layout,
    flat: [...layout.left, ...layout.right],
    columnOf,
    moveVertical,
    moveAcross,
    reset,
  };
}
