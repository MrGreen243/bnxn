export function formatNaira(amount: number, opts: { compact?: boolean; sign?: boolean } = {}): string {
  const { compact = true, sign = false } = opts;
  const abs = Math.abs(amount);
  let body: string;
  if (compact && abs >= 1_000_000_000_000) body = `${trim(abs / 1_000_000_000_000)}T`;
  else if (compact && abs >= 1_000_000_000) body = `${trim(abs / 1_000_000_000)}B`;
  else if (compact && abs >= 1_000_000) body = `${trim(abs / 1_000_000)}M`;
  else if (compact && abs >= 100_000) body = `${trim(abs / 1_000)}K`;
  else body = Math.round(abs).toLocaleString("en-NG");
  const prefix = amount < 0 ? "-" : sign && amount > 0 ? "+" : "";
  return `${prefix}₦${body}`;
}

function trim(n: number): string {
  if (n >= 100) return n.toFixed(0);
  if (n >= 10) return n.toFixed(1).replace(/\.0$/, "");
  return n.toFixed(2).replace(/\.?0+$/, "");
}

export function formatNairaFull(amount: number): string {
  return `${amount < 0 ? "-" : ""}₦${Math.round(Math.abs(amount)).toLocaleString("en-NG")}`;
}

export function formatDuration(ms: number): string {
  if (ms <= 0) return "0s";
  const s = Math.floor(ms / 1000);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m ${sec}s`;
  return `${sec}s`;
}

export function formatDurationLong(ms: number): string {
  const s = Math.floor(ms / 1000);
  const d = Math.floor(s / 86400);
  const h = Math.floor((s % 86400) / 3600);
  const m = Math.floor((s % 3600) / 60);
  const parts: string[] = [];
  if (d) parts.push(`${d}d`);
  if (h) parts.push(`${h}h`);
  if (m || parts.length === 0) parts.push(`${m}m`);
  return parts.join(" ");
}

export function formatPct(v: number, digits = 0): string {
  return `${(v * 100).toFixed(digits)}%`;
}

export function formatNumber(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1).replace(/\.0$/, "")}M`;
  if (n >= 10_000) return `${(n / 1_000).toFixed(1).replace(/\.0$/, "")}K`;
  return Math.round(n).toLocaleString("en-NG");
}

export function formatTime(ts: number): string {
  if (!ts) return "never";
  const d = new Date(ts);
  return d.toLocaleString(undefined, { hour: "2-digit", minute: "2-digit", day: "2-digit", month: "short" });
}

export function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v));
}
