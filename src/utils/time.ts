export const now = (): number => Date.now();
export const HOUR = 3_600_000;
export const MINUTE = 60_000;
export const DAY = 86_400_000;
export function dayKey(ts: number): string {
  const d = new Date(ts);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
