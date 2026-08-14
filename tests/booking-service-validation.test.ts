import assert from "node:assert/strict";
import test from "node:test";
import { isBookableServiceForBusiness } from "../lib/booking";

const BUSINESS_A = "11111111-1111-1111-1111-111111111111";
const BUSINESS_B = "22222222-2222-2222-2222-222222222222";

const activeService = {
  business_id: BUSINESS_A,
  is_active: true,
};

test("an active service for the selected business passes booking validation", () => {
  assert.equal(isBookableServiceForBusiness(activeService, BUSINESS_A), true);
});

test("a nonexistent service fails booking validation", () => {
  assert.equal(isBookableServiceForBusiness(null, BUSINESS_A), false);
});

test("an inactive service fails booking validation", () => {
  assert.equal(
    isBookableServiceForBusiness(
      { business_id: BUSINESS_A, is_active: false },
      BUSINESS_A
    ),
    false
  );
});

test("a service belonging to another business fails booking validation", () => {
  assert.equal(isBookableServiceForBusiness({ ...activeService, business_id: BUSINESS_B }, BUSINESS_A), false);
});
