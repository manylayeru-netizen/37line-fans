export function toIsoString(
  value: Date | string | null | undefined,
): string | undefined {
  if (value == null) return undefined;
  if (value instanceof Date) return value.toISOString();
  return new Date(value).toISOString();
}

export function toIsoStringRequired(
  value: Date | string,
): string {
  if (value instanceof Date) return value.toISOString();
  return new Date(value).toISOString();
}

export function toDateString(
  value: Date | string | null | undefined,
): string | undefined {
  if (value == null) return undefined;
  const d = value instanceof Date ? value : new Date(value);
  return d.toISOString().split('T')[0];
}

export function toDateStringRequired(
  value: Date | string,
): string {
  const d = value instanceof Date ? value : new Date(value);
  return d.toISOString().split('T')[0];
}

export function getTime(
  value: Date | string,
): number {
  if (value instanceof Date) return value.getTime();
  return new Date(value).getTime();
}
