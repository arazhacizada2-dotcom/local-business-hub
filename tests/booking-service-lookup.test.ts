import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

const actionSource = readFileSync(
  join(process.cwd(), "lib/actions/appointments.ts"),
  "utf8"
);

test("public booking uses the safe business lookup instead of the failing public view path", () => {
  assert.match(actionSource, /rpc\("get_public_business_by_id"/);
  assert.doesNotMatch(actionSource, /\.from\("businesses_public"\)/);
});

test("public booking validates an active service for the selected business server-side", () => {
  assert.match(actionSource, /\.eq\("id", serviceId\)/);
  assert.match(actionSource, /\.eq\("business_id", businessId\)/);
  assert.match(actionSource, /\.eq\("is_active", true\)/);
});
