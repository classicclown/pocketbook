export const SCRIPT_URL = import.meta.env.DEV
  ? "/google-script"
  : import.meta.env.VITE_SCRIPT_URL;

export const useMock = !SCRIPT_URL;

export async function fetchSheet(sheetName) {
  const res = await fetch(`${SCRIPT_URL}?sheet=${sheetName}`);
  if (!res.ok) throw new Error(`Failed to fetch ${sheetName}: ${res.status}`);
  return res.json();
}

// Deliberately no Content-Type header: the browser sends text/plain, which
// avoids the CORS preflight Apps Script can't answer. The script JSON.parses
// the raw body.
export async function postAction(payload) {
  const res = await fetch(SCRIPT_URL, {
    method: "POST",
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error(`Save failed: ${res.status}`);
  const data = await res.json();
  if (!data.ok) throw new Error(data.error || "Save failed");
  return data;
}
