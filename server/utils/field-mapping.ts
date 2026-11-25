export function serializeDecimal(val: unknown): number {
  if (typeof val === "number") return val;
  if (typeof val === "string") return parseFloat(val) || 0;
  if (val && typeof val === "object" && "toNumber" in val && typeof (val as any).toNumber === "function") {
    return (val as any).toNumber();
  }
  return 0;
}

export function sanitizeAuditPayload(data: Record<string, any>): Record<string, any> {
  const sensitiveKeys = ["password", "passwordhash", "token", "secret", "authorization"];
  const clean: Record<string, any> = {};

  for (const [key, val] of Object.entries(data)) {
    if (sensitiveKeys.some((s) => key.toLowerCase().includes(s))) {
      clean[key] = "[REDACTED]";
    } else if (val && typeof val === "object" && !Array.isArray(val) && !(val instanceof Date)) {
      clean[key] = sanitizeAuditPayload(val);
    } else {
      clean[key] = val;
    }
  }

  return clean;
}

/**
 * Safely builds a Prisma DateTime filter from startDate and endDate string parameters.
 * Covers full day boundaries (00:00:00.000 to 23:59:59.999) across both local and UTC boundaries.
 * Guarantees that selecting the same date for start and end correctly includes all events on that day.
 */
export function buildDateFilter(
  startDateStr?: string,
  endDateStr?: string
): { gte?: Date; lte?: Date } | null {
  if (!startDateStr && !endDateStr) return null;

  const filter: { gte?: Date; lte?: Date } = {};

  if (startDateStr) {
    const s = startDateStr.trim();
    if (/^\d{4}-\d{2}-\d{2}$/.test(s)) {
      const [y, m, d] = s.split("-").map(Number);
      const localStart = new Date(y, m - 1, d, 0, 0, 0, 0);
      const utcStart = new Date(Date.UTC(y, m - 1, d, 0, 0, 0, 0));
      filter.gte = new Date(Math.min(localStart.getTime(), utcStart.getTime()));
    } else {
      const d = new Date(s);
      if (!isNaN(d.getTime())) {
        d.setHours(0, 0, 0, 0);
        filter.gte = d;
      }
    }
  }

  if (endDateStr) {
    const e = endDateStr.trim();
    if (/^\d{4}-\d{2}-\d{2}$/.test(e)) {
      const [y, m, d] = e.split("-").map(Number);
      const localEnd = new Date(y, m - 1, d, 23, 59, 59, 999);
      const utcEnd = new Date(Date.UTC(y, m - 1, d, 23, 59, 59, 999));
      filter.lte = new Date(Math.max(localEnd.getTime(), utcEnd.getTime()));
    } else {
      const d = new Date(e);
      if (!isNaN(d.getTime())) {
        d.setHours(23, 59, 59, 999);
        filter.lte = d;
      }
    }
  }

  return Object.keys(filter).length > 0 ? filter : null;
}
