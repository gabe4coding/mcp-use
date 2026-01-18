export function escapeString(value: string): string {
  return value
    .replace(/\\/g, "\\\\")
    .replace(/"/g, '\\"')
    .replace(/'/g, "\\'")
    .replace(/\n/g, "\\n")
    .replace(/\r/g, "\\r")
    .replace(/\t/g, "\\t")
    .replace(/\$/g, "\\$")
    .replace(/`/g, "\\`");
}

export function truncate(value: string, maxLength: number): string {
  if (maxLength <= 0) return "";
  if (maxLength < 3) return value.slice(0, Math.max(0, maxLength));
  if (value.length <= maxLength) return value;
  return `${value.slice(0, Math.max(0, maxLength - 3))}...`;
}
