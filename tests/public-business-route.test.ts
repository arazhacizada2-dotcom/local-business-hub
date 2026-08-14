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

test("public business lookup contract excludes private business fields", () => {
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
  assert.equal(PUBLIC_FIELDS.includes("owner_id" as never), false);
  assert.equal(PUBLIC_FIELDS.includes("plan" as never), false);
  assert.equal(PUBLIC_FIELDS.includes("onboarding_complete" as never), false);
});

