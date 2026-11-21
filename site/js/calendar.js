export const BIRTHDAY_TIME_ZONE = "Europe/Zagreb";

const formatter = new Intl.DateTimeFormat("en-GB", {
  timeZone: BIRTHDAY_TIME_ZONE, year: "numeric", month: "2-digit", day: "2-digit",
});

export function birthdayDay(now = new Date()) {
  const parts = Object.fromEntries(formatter.formatToParts(now).map(({ type, value }) => [type, value]));
  return {
    iso: `${parts.year}-${parts.month}-${parts.day}`,
    slot: `${parts.month}-${parts.day}`,
  };
}
