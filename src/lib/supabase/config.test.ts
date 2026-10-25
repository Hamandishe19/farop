import { test } from "node:test";
import assert from "node:assert/strict";
import { normaliseSupabaseUrl } from "./config.ts";

test("Supabase URL: only the base address is kept", () => {
  assert.equal(normaliseSupabaseUrl(" https://abc123.supabase.co/rest/v1/"), "https://abc123.supabase.co");
  assert.equal(normaliseSupabaseUrl('"https://abc123.supabase.co/"'), "https://abc123.supabase.co");
  assert.equal(normaliseSupabaseUrl("https://abc123.supabase.co"), "https://abc123.supabase.co");
  assert.equal(normaliseSupabaseUrl("http://localhost:54321/rest/v1"), "http://localhost:54321");
  assert.equal(normaliseSupabaseUrl("abc123.supabase.co"), undefined, "missing https://");
  assert.equal(normaliseSupabaseUrl("http://abc123.supabase.co"), undefined, "must be https");
  assert.equal(normaliseSupabaseUrl("   "), undefined);
  assert.equal(normaliseSupabaseUrl(undefined), undefined);
});
