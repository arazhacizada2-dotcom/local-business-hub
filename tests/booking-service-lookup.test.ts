import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

const actionSource = readFileSync(
  join(process.cwd(), "lib/actions/appointments.ts"),
  "utf8"
);


test("public booking reuses the working public business slug lookup", () => {
  assert.match(actionSource, /rpc\("get_public_business_by_slug"/);
  assert.match(actionSource, /p_slug: businessSlug/);
  assert.match(actionSource, /publicBusiness\.id !== businessId/);
  assert.doesNotMatch(actionSource, /rpc\("get_public_business_by_id"/);
});

test("public booking keeps the existing RLS-backed active service lookup", () => {
  assert.match(actionSource, /\.from\("services"\)/);
  assert.match(actionSource, /\.eq\("id", serviceId\)/);
  assert.match(actionSource, /\.eq\("business_id", businessId\)/);
  assert.match(actionSource, /\.eq\("is_active", true\)/);
  assert.doesNotMatch(actionSource, /rpc\("get_public_service_by_id"/);
});

test("public booking still validates an active service for the selected business server-side", () => {
  assert.match(actionSource, /isBookableServiceForBusiness\(service, businessId\)/);
});
