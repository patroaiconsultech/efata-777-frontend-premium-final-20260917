const timeFormatter = new Intl.DateTimeFormat(undefined, {
  hour: "2-digit",
  minute: "2-digit",
});

const shortDateFormatter = new Intl.DateTimeFormat(undefined, {
  day: "2-digit",
  month: "short",
});

const fullDateFormatter = new Intl.DateTimeFormat(undefined, {
  dateStyle: "medium",
  timeStyle: "short",
});

function parseTimestamp(value: string): Date | null {
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function dayKey(date: Date): string {
  return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
}

export function formatMessageTimestamp(value: string): string {
  const date = parseTimestamp(value);
  return date ? timeFormatter.format(date) : "Horário indisponível";
}

export function formatConversationTimestamp(
  value: string,
  now = new Date(),
): string {
  const date = parseTimestamp(value);
  if (!date) return "Data indisponível";

  if (dayKey(date) === dayKey(now)) {
    return `Hoje · ${timeFormatter.format(date)}`;
  }

  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  if (dayKey(date) === dayKey(yesterday)) {
    return `Ontem · ${timeFormatter.format(date)}`;
  }

  const datePart = shortDateFormatter.format(date).replace(".", "");
  return `${datePart} · ${timeFormatter.format(date)}`;
}

export function formatDateTimeTitle(value: string): string {
  const date = parseTimestamp(value);
  return date ? fullDateFormatter.format(date) : "Data e hora indisponíveis";
}
