import { test } from "node:test";
import assert from "node:assert/strict";
import { passwordProblems, safeAdminPath, validateNewPassword } from "./password.ts";

test("password rules", () => {
  assert.deepEqual(passwordProblems("babywear2026"), []);
  assert.deepEqual(passwordProblems("short1"), ["At least 10 characters"]);
  assert.deepEqual(passwordProblems("onlyletterslong"), ["A number"]);
  assert.deepEqual(passwordProblems("1234567890"), ["A letter"]);
  assert.equal(passwordProblems("a1".repeat(40)).length, 1, "too long");
});

test("new password and confirmation", () => {
  assert.deepEqual(validateNewPassword("babywear2026", "babywear2026"), {});
  assert.ok(validateNewPassword("babywear2026", "babywear2027").confirm);
  assert.ok(validateNewPassword("short", "short").password);
  assert.match(
    validateNewPassword("babywear2026", "babywear2026", { current: "babywear2026" }).password ?? "",
    /different/,
  );
});

test("redirects stay inside the admin area", () => {
  assert.equal(safeAdminPath("/admin/products"), "/admin/products");
  assert.equal(safeAdminPath("https://evil.example"), "/admin/dashboard");
  assert.equal(safeAdminPath("//evil.example/admin"), "/admin/dashboard");
  assert.equal(safeAdminPath("/products"), "/admin/dashboard");
  assert.equal(safeAdminPath(null), "/admin/dashboard");
});
