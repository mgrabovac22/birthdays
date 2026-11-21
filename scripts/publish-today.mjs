import { randomBytes } from "node:crypto";
import { readFile, rename, rm, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { birthdayDay } from "../site/js/calendar.js";

const slots = Array.from({ length: 100 }, (_, i) => `BIRTHDAY_${String(i + 1).padStart(2, "0")}`);
const calendarSlots = new Set(Array.from({ length: 366 }, (_, i) =>
  new Date(Date.UTC(2000, 0, i + 1)).toISOString().slice(5, 10),
));

export function readBirthdaySecrets(environment) {
  const records = [];
  for (const slot of slots) {
    const raw = environment[slot];
    if (!raw?.trim()) continue;
    let record;
    try {
      record = JSON.parse(raw);
    } catch {
      throw new Error(`${slot} mora sadržavati jedan JSON objekt.`);
    }
    const { name, date, message } = record ?? {};
    if (typeof name !== "string" || !name.trim() || typeof message !== "string" || !message.trim()) {
      throw new Error(`${slot}: upiši polja name, date i message.`);
    }
    if (!calendarSlots.has(date)) throw new Error(`${slot}: date mora biti valjan datum u formatu MM-DD.`);
    // Copy only the public card fields, including when older secrets still have a secretKey.
    records.push({ name, date, message });
  }
  return records;
}

export function todayPayload(records, now = new Date()) {
  const day = birthdayDay(now);
  return {
    date: day.iso,
    cards: records.filter((record) => record.date === day.slot).map(({ name, message }) => ({ name, message })),
  };
}

async function main() {
  const args = process.argv.slice(2);
  const outIndex = args.indexOf("--out");
  const out = args[outIndex + 1];
  if (outIndex === -1 || !out || out.startsWith("--")) throw new Error("Koristi --out za lokaciju datoteke.");
  const forceSample = args.includes("--sample");
  let records = forceSample ? [] : readBirthdaySecrets(process.env);
  for (const slot of slots) delete process.env[slot];
  const now = new Date();
  const sample = forceSample || (!records.length && args.includes("--sample-if-missing"));
  if (sample) {
    const fixture = JSON.parse(await readFile(new URL("../fixtures/birthdays.test.json", import.meta.url), "utf8"));
    const { iso, slot } = birthdayDay(now);
    const index = (new Date(`${iso}T12:00:00Z`).getUTCDay() + 1) % fixture.length;
    records = [{ ...fixture[index], date: slot }];
  }
  const output = resolve(out);
  const temporary = `${output}.${randomBytes(6).toString("hex")}.tmp`;
  try {
    await writeFile(temporary, `${JSON.stringify(todayPayload(records, now))}\n`, { flag: "wx" });
    await rename(temporary, output);
  } finally {
    await rm(temporary, { force: true });
  }
  console.log(sample ? "Testna čestitka spremna." : "Današnja datoteka spremna.");
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  main().catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  });
}
