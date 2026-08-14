import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

const root = process.cwd();
const migration = readFileSync(
  join(root, "supabase/migrations/20260814190000_security_public_data_rls.sql"),
  "utf8"
);
const publicBusinessRoute = readFileSync(join(root, "app/b/[slug]/page.tsx"), "utf8");
const appointmentsAction = readFileSync(join(root, "lib/actions/appointments.ts"), "utf8");
const servicesAction = readFileSync(join(root, "lib/actions/services.ts"), "utf8");
const businessAction = readFileSync(join(root, "lib/actions/business.ts"), "utf8");
const authAction = readFileSync(join(root, "lib/actions/auth.ts"), "utf8");

test("protected application tables keep RLS enabled", () => {
  for (const table of ["profiles", "businesses", "services", "appointments", "page_views"]) {
    assert.match(
      migration,
      new RegExp(`alter table public\\.${table} enable row level security`, "i")
    );
  }
});

test("anonymous service SELECT is removed and public services use an allowlist RPC", () => {
  assert.match(migration, /drop policy if exists "services_select_public_active" on public\.services/);
  assert.match(migration, /revoke select on public\.services from anon/);
  assert.match(migration, /get_public_services_by_business_id/);
  assert.doesNotMatch(publicBusinessRoute, /\.from\("services"\)/);
  assert.doesNotMatch(publicBusinessRoute, /\.select\("\*"\)/);
});

test("public business lookups require completed onboarding and omit private fields", () => {
  assert.match(migration, /b\.onboarding_complete = true/g);
  assert.doesNotMatch(migration, /owner_id\s*,\s*plan\s*,\s*onboarding_complete/);
  assert.doesNotMatch(publicBusinessRoute, /owner_id|onboarding_complete|plan/);
});

test("booking validates services through the explicit public service RPC", () => {
  assert.match(appointmentsAction, /rpc\("get_public_service_by_id"/);
  assert.match(migration, /s\.id = p_service_id/);
  assert.match(migration, /s\.business_id = p_business_id/);
  assert.match(migration, /s\.is_active = true/);
});

test("server actions do not return raw database error.message values", () => {
  assert.doesNotMatch(servicesAction, /return \{ error: error\.message \}/);
  assert.doesNotMatch(businessAction, /return \{ error: error\.message \}/);
  assert.doesNotMatch(appointmentsAction, /return \{ error: error\.message \}/);
});

test("auth errors are logged server-side but sanitized for users", () => {
  assert.match(authAction, /return "Something went wrong\. Please try again\."/);
  assert.doesNotMatch(authAction, /return \{ error: error\.message \}/);
});
