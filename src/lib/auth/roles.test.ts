import { test } from "node:test";
import assert from "node:assert/strict";
import { assignableRoles, can, canManage, canSeeAdmin, canUseFinance, isAdminRole } from "./roles.ts";

test("regular admins edit products but can't delete, edit settings or see the team", () => {
  assert.ok(can("regular", "products.edit"));
  assert.ok(can("regular", "settings.view"));
  assert.ok(!can("regular", "products.delete"));
  assert.ok(!can("regular", "settings.edit"));
  assert.ok(!can("regular", "team.view"));
  assert.ok(!can("regular", "system.view"));
});

test("supreme admins delete, edit settings and manage regular admins only", () => {
  assert.ok(can("supreme", "products.delete"));
  assert.ok(can("supreme", "settings.edit"));
  assert.ok(!can("supreme", "system.view"));
  assert.deepEqual(assignableRoles("supreme"), ["regular"]);
  assert.ok(canManage("supreme", "regular"));
  assert.ok(!canManage("supreme", "supreme"));
  assert.ok(!canManage("supreme", "developer"));
});

test("developer admins manage supreme and regular admins, but never other developers", () => {
  assert.ok(can("developer", "system.view"));
  assert.ok(canManage("developer", "supreme"));
  assert.ok(canManage("developer", "regular"));
  assert.ok(!canManage("developer", "developer"));
  assert.deepEqual(assignableRoles("regular"), []);
});

test("role values from the database are checked", () => {
  assert.ok(isAdminRole("supreme"));
  assert.ok(!isAdminRole("owner"));
  assert.ok(!isAdminRole(undefined));
});

test("finance: supreme and developer always; regular only with a grant", () => {
  assert.ok(can("supreme", "finance.view") && can("supreme", "finance.edit"));
  assert.ok(can("developer", "finance.view") && can("developer", "finance.edit"));
  assert.ok(!can("regular", "finance.view"));
  assert.ok(can("regular", "finance.view", ["finance.view"]));
  assert.ok(!can("regular", "finance.edit", ["finance.view"]), "view doesn't imply record");
  assert.ok(can("regular", "finance.edit", ["finance.edit"]));
  assert.ok(!can("regular", "products.delete", ["products.delete"]), "only finance permissions can be granted");
  assert.ok(canUseFinance("regular", ["finance.edit"]));
  assert.ok(!canUseFinance("regular"));
});

test("only the developer resets passwords; the developer account is hidden from everyone else", () => {
  assert.ok(can("developer", "team.passwords"));
  assert.ok(!can("supreme", "team.passwords"));
  assert.ok(!can("regular", "team.passwords"));
  assert.ok(canSeeAdmin("developer", "developer"));
  assert.ok(!canSeeAdmin("supreme", "developer"));
  assert.ok(!canSeeAdmin("regular", "developer"));
  assert.ok(canSeeAdmin("supreme", "regular") && canSeeAdmin("regular", "supreme"));
});
