import assert from "node:assert/strict";
import test from "node:test";
import { demoCompanies } from "../lib/demoData.ts";
import { runReview } from "../lib/engine.ts";
import { applyClaimReviewerOverride } from "../lib/reviewerOverrides.ts";
import { refreshDerivedAnalysis } from "../lib/refreshReview.ts";
import { assessAnalysisFreshness } from "../lib/analysisFreshness.ts";

test("analysis freshness is fresh before manual edits", () => {
  const review = runReview(demoCompanies[1].input, demoCompanies[1].evidence);
  const freshness = assessAnalysisFreshness(review);
  assert.equal(freshness.status, "fresh");
  assert.equal(freshness.manual_action_count, 0);
});

test("analysis freshness recommends refresh after manual override", () => {
  const review = runReview(demoCompanies[0].input, demoCompanies[0].evidence);
  const target = review.claims[0];
  const edited = applyClaimReviewerOverride(review, {
    claimId: target.claim_id,
    status: "partially_supported",
    confidence: "medium",
    note: "Reviewer changed status and wants stale analysis indicator.",
    updatedAt: "2026-07-19T02:00:00.000Z",
  });
  const freshness = assessAnalysisFreshness(edited);
  assert.equal(freshness.status, "never_refreshed_after_manual_edits");
});

test("analysis freshness becomes fresh after refresh", () => {
  const review = runReview(demoCompanies[0].input, demoCompanies[0].evidence);
  const target = review.claims[0];
  const edited = applyClaimReviewerOverride(review, {
    claimId: target.claim_id,
    status: "partially_supported",
    confidence: "medium",
    note: "Reviewer changed status before refreshing derived analysis.",
    updatedAt: "2026-07-19T02:00:00.000Z",
  });
  const refreshed = refreshDerivedAnalysis(edited, "2026-07-19T03:00:00.000Z");
  const freshness = assessAnalysisFreshness(refreshed);
  assert.equal(freshness.status, "fresh");
  assert.equal(freshness.latest_refresh_at, "2026-07-19T03:00:00.000Z");
});
