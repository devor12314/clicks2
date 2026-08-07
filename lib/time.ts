export function formatDateTime(
  value: number | string | Date | null | undefined,
) {
  if (value === null || value === undefined || value === "") return "—";

  // Postgres bigint timestamps can arrive as numeric strings at runtime.
  // Passing a string such as "1786089920000" directly to Date creates an
  // invalid date, so normalize it before formatting.
  const normalized =
    typeof value === "string" && /^\d+$/.test(value) ? Number(value) : value;
  const date = normalized instanceof Date ? normalized : new Date(normalized);
  if (!Number.isFinite(date.getTime())) return "—";

  return (
    new Intl.DateTimeFormat("en-US", {
      dateStyle: "medium",
      timeStyle: "short",
      timeZone: "UTC",
    }).format(date) + " UTC"
  );
}
