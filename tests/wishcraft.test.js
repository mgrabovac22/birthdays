import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { mkdtemp, readFile, readdir, rm, rmdir } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";
import { readBirthdaySecrets, todayPayload } from "../scripts/publish-today.mjs";
import { birthdayDay } from "../site/js/calendar.js";
import { dayTheme, traceStars } from "../site/js/themes.js";

const recipient = {
  name: "Današnji slavljenik",
  date: "11-21",
  message: "Sretan rođendan!\nČuvaj svjetlost. ✨",
};
const run = promisify(execFile);
const script = fileURLToPath(new URL("../scripts/publish-today.mjs", import.meta.url));
const testEnvironment = Object.fromEntries(Object.entries(process.env).filter(([name]) => !/^BIRTHDAY_/i.test(name)));

test("one secret per person produces a public greeting only for the selected Zagreb date", () => {
  const other = { ...recipient, name: "Sutrašnji slavljenik", date: "11-22", message: "Sutrašnja poruka" };
  const shared = { ...recipient, name: "Još jedna čestitka" };
  const records = readBirthdaySecrets({
    BIRTHDAY_01: JSON.stringify({ ...recipient, secretKey: "old-test-key", extra: "private metadata" }),
    BIRTHDAY_03: JSON.stringify(other),
    BIRTHDAY_100: JSON.stringify(shared),
    UNRELATED_SECRET: "unrelated",
  });
  const today = todayPayload(records, new Date("2026-11-21T22:59:59Z"));
  assert.deepEqual(today, {
    date: "2026-11-21",
    cards: [
      { name: recipient.name, message: recipient.message },
      { name: shared.name, message: shared.message },
    ],
  });
  assert.deepEqual(todayPayload(records, new Date("2026-11-21T23:00:00Z")), {
    date: "2026-11-22",
    cards: [{ name: other.name, message: other.message }],
  });
  assert.deepEqual(todayPayload(records, new Date("2026-11-23T00:00:00Z")).cards, []);
});

test("per-person secrets validate dates and accept leap-day cards", () => {
  assert.throws(() => readBirthdaySecrets({ BIRTHDAY_05: "{broken" }), /BIRTHDAY_05.*JSON/);
  assert.throws(() => readBirthdaySecrets({ BIRTHDAY_05: JSON.stringify({ ...recipient, date: "02-30" }) }), /MM-DD/);
  assert.throws(() => readBirthdaySecrets({ BIRTHDAY_05: JSON.stringify({ ...recipient, message: " " }) }), /message/);
  const records = readBirthdaySecrets({ BIRTHDAY_05: JSON.stringify({ ...recipient, date: "02-29" }) });
  assert.equal(todayPayload(records, new Date("2028-02-29T12:00:00Z")).cards.length, 1);
  assert.equal(todayPayload(records, new Date("2027-02-28T12:00:00Z")).cards.length, 0);
});

test("the date and scene switch at Zagreb midnight in winter and summer", () => {
  const day = new Date("2026-11-21T12:00:00Z");
  const late = new Date("2026-11-21T22:59:59Z");
  const morning = new Date("2026-11-21T23:00:00Z");
  assert.equal(birthdayDay(late).slot, "11-21");
  assert.equal(birthdayDay(morning).slot, "11-22");
  assert.equal(birthdayDay(new Date("2026-07-14T21:59:59Z")).slot, "07-14");
  assert.equal(birthdayDay(new Date("2026-07-14T22:00:00Z")).slot, "07-15");
  assert.deepEqual(dayTheme(day), dayTheme(late));
  assert.notEqual(dayTheme(late).orbit, dayTheme(morning).orbit);
  assert.notDeepEqual(traceStars(dayTheme(late).seed), traceStars(dayTheme(morning).seed));
});

test("test builds publish a single fictional greeting and production only exports today's matches", async (t) => {
  const directory = await mkdtemp(join(tmpdir(), "wishcraft-today-"));
  const output = join(directory, "today.json");
  t.after(async () => {
    await rm(output, { force: true });
    await rmdir(directory);
  });
  const { slot, iso } = birthdayDay();
  const nonMatchingSlot = slot === "11-22" ? "11-23" : "11-22";
  const env = {
    ...testEnvironment,
    BIRTHDAY_02: JSON.stringify({ ...recipient, date: slot, secretKey: "discard-this-test-key" }),
    BIRTHDAY_03: JSON.stringify({ name: "Never Export This", date: nonMatchingSlot, message: "Keep in the secret" }),
  };
  await run(process.execPath, [script, "--sample", "--out", output], { env });
  const sample = JSON.parse(await readFile(output, "utf8"));
  assert.equal(sample.date, iso);
  assert.equal(sample.cards.length, 1);
  assert.notEqual(sample.cards[0].name, recipient.name);
  await run(process.execPath, [script, "--out", output], { env });
  const published = await readFile(output, "utf8");
  assert.deepEqual(JSON.parse(published), { date: iso, cards: [{ name: recipient.name, message: recipient.message }] });
  assert.equal(published.includes("discard-this-test-key"), false);
  assert.equal(published.includes("Never Export This"), false);
  assert.deepEqual(await readdir(directory), ["today.json"]);
});
