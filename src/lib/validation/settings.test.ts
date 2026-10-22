import { test } from "node:test";
import assert from "node:assert/strict";
import { mergeSettings, readSettingsForm, validateSettings } from "./settings.ts";
import type { BusinessSettings } from "../../types/settings.ts";

function form(entries: Array<[string, string]>): FormData {
  const data = new FormData();
  for (const [key, value] of entries) data.append(key, value);
  return data;
}

test("settings form is read, cleaned and validated", () => {
  const values = readSettingsForm(
    form([
      ["whatsapp", "+263 77 477 3122"],
      ["ecocashNumber", "077 477 3122"],
      ["facebook", "https://www.facebook.com/profile.php?id=1"],
      ["deliveryDays", "Saturday"],
      ["deliveryDays", "Thursday"],
      ["hoursDays", "Monday"],
      ["hoursTime", "08:00 – 17:00"],
      ["hoursDays", ""],
      ["hoursTime", ""],
    ]),
  );
  assert.deepEqual(values.deliveryDays, ["Thursday", "Saturday"], "kept in week order");
  assert.deepEqual(values.hours, [{ days: "Monday", time: "08:00 – 17:00" }], "empty rows dropped");

  const { settings, errors } = validateSettings(values);
  assert.deepEqual(errors, {});
  assert.equal(settings?.whatsapp, "263774773122");
  assert.equal(settings?.email, undefined, "empty fields are hidden, not empty strings");
});

test("invalid settings are rejected field by field", () => {
  const values = readSettingsForm(
    form([
      ["whatsapp", "0774773122"],
      ["email", "not-an-email"],
      ["facebook", "https://example.com/page"],
      ["ecocashNumber", "abc"],
      ["hoursDays", "Monday"],
      ["hoursTime", ""],
    ]),
  );
  const { settings, errors } = validateSettings(values);
  assert.equal(settings, undefined);
  assert.ok(errors.whatsapp && errors.email && errors.facebook && errors.ecocashNumber && errors.hours);
});

test("saved settings are laid over the defaults", () => {
  const defaults: BusinessSettings = { phone: "1", ecocashNumber: "2", deliveryDays: ["Thursday"], hours: [] };
  assert.equal(mergeSettings(defaults, null), defaults);
  const merged = mergeSettings(defaults, { phone: "9", deliveryDays: ["Sunday", "Bogus" as never] });
  assert.equal(merged.phone, "9");
  assert.equal(merged.ecocashNumber, "2");
  assert.deepEqual(merged.deliveryDays, ["Sunday"]);
});
