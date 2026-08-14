import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

const actionSource = readFileSync(
  join(process.cwd(), "lib/actions/appointments.ts"),
  "utf8"
);

const migrationSource = readFileSync(
  join(
    process.cwd(),
    "supabase/migrations/20260814160000_public_service_lookup_by_id.sql"
  ),
  "utf8"
);

test("public booking uses the safe business lookup instead of the failing public view path", () => {
  assert.match(actionSource, /rpc\("get_public_business_by_id"/);
  assert.doesNotMatch(actionSource, /\.from\("businesses_public"\)/);
});

test("public booking resolves the selected service through the safe service RPC", () => {
  assert.match(actionSource, /rpc\("get_public_service_by_id"/);
  assert.match(actionSource, /p_service_id: serviceId/);
  assert.match(actionSource, /p_business_id: businessId/);
  assert.match(migrationSource, /security definer/);
  assert.match(migrationSource, /s\.id = p_service_id/);
  assert.match(migrationSource, /s\.business_id = p_business_id/);
  assert.match(migrationSource, /s\.is_active = true/);
});

test("public booking still validates an active service for the selected business server-side", () => {
  assert.match(actionSource, /isBookableServiceForBusiness\(service, businessId\)/);
});
