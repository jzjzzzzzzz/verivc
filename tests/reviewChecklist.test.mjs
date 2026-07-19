import assert from "node:assert/strict";
import test from "node:test";
import { demoCompanies } from "../lib/demoData.ts";
import { runReview } from "../lib/engine.ts";
import { buildPartnerReviewChecklist } from "../lib/reviewChecklist.ts";

test("partner checklist blocks polished startup with critical contradictions", () => {
  const review = runReview(demoCompanies[0].input, demoCompanies[0].evidence);
  const checklist = buildPartnerReviewChecklist(review);
  assert.equal(checklist.overall_status, "blocked");
  assert.ok(checklist.blocked_count >= 1);
  assert.ok(checklist.items.find((item) => item.item_id === "CHK-RISK-CONTRADICTIONS")?.claim_ids.length);
  assert.match(checklist.summary, /blocked/i);
});

test("partner checklist favors better supported execution over polish", () => {
  const risky = buildPartnerReviewChecklist(runReview(demoCompanies[0].input, demoCompanies[0].evidence));
  const stronger = buildPartnerReviewChecklist(runReview(demoCompanies[1].input, demoCompanies[1].evidence));
  assert.notEqual(stronger.overall_status, "blocked");
  assert.ok(stronger.completion_score > risky.completion_score);
  assert.ok(stronger.ready_count > risky.ready_count);
});

test("partner checklist exposes evidence and next actions", () => {
  const checklist = buildPartnerReviewChecklist(runReview(demoCompanies[1].input, demoCompanies[1].evidence));
  assert.equal(checklist.items.length, 8);
  assert.ok(checklist.items.every((item) => item.next_action.length > 10));
  assert.ok(checklist.items.some((item) => item.evidence_ids.length > 0));
});
