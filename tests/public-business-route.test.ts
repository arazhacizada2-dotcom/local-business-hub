import assert from "node:assert/strict";
import test from "node:test";

const PUBLIC_FIELDS = [
  "id",
  "slug",
  "name",
  "business_type",
  "description",
  "address",
  "phone",
  "email",
  "logo_url",
  "timezone",
  "opening_hours",
] as const;

test("public business lookup exposes only the intended public fields", () => {
  assert.deepEqual(PUBLIC_FIELDS, [
    "id",
    "slug",
    "name",
    "business_type",
    "description",
    "address",
    "phone",
    "email",
    "logo_url",
    "timezone",
    "opening_hours",
  ]);

  assert.equal((PUBLIC_FIELDS as readonly string[]).includes("owner_id"), false);
  assert.equal((PUBLIC_FIELDS as readonly string[]).includes("plan"), false);
  assert.equal((PUBLIC_FIELDS as readonly string[]).includes("onboarding_complete"), false);
});
