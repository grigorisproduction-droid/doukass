export function normalizePhone(input: string): string {
  if (!input) return "";
  // Keep digits only (supports Greek phones)
  const digits = input.replace(/\D+/g, "");
  // Limit to 15 just in case (international), but Greek typically 10
  return digits.slice(0, 15);
}

export function formatPhone(digits: string): string {
  const d = normalizePhone(digits);

  // Greek mobile: 69XX XXX XXX (10 digits)
  if (d.length === 10 && d.startsWith("69")) {
    return `${d.slice(0, 4)} ${d.slice(4, 7)} ${d.slice(7)}`;
  }

  // Greek landline: 2XXX XXX XXX (10 digits)
  if (d.length === 10 && d.startsWith("2")) {
    return `${d.slice(0, 4)} ${d.slice(4, 7)} ${d.slice(7)}`;
  }

  // Generic grouping for other lengths
  if (d.length <= 3) return d;
  if (d.length <= 6) return `${d.slice(0, 3)} ${d.slice(3)}`;
  if (d.length <= 9) return `${d.slice(0, 3)} ${d.slice(3, 6)} ${d.slice(6)}`;
  return `${d.slice(0, 3)} ${d.slice(3, 6)} ${d.slice(6, 10)}${d.length > 10 ? " " + d.slice(10) : ""}`;
}

export function phoneMatches(phoneDigits: string, query: string): boolean {
  const p = normalizePhone(phoneDigits);
  const q = normalizePhone(query);
  if (!q) return false;
  return p.includes(q);
}
