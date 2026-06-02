const escapeCell = (v: unknown): string => {
  const s = v == null ? "" : String(v);
  if (/[",;\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
};

export function downloadCSV(filename: string, headers: string[], rows: (string | number | null | undefined)[][]) {
  const lines = [headers.map(escapeCell).join(";"), ...rows.map((r) => r.map(escapeCell).join(";"))];
  // BOM garante UTF-8 com acentuação no Excel
  const blob = new Blob(["\uFEFF" + lines.join("\r\n")], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}