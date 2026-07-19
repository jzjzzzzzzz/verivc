import assert from "node:assert/strict";
import test from "node:test";
import { demoCompanies } from "../lib/demoData.ts";
import { runReview } from "../lib/engine.ts";
import { buildMemoCoverageSummary } from "../lib/memoCoverage.ts";

test("memo coverage creates section indicators for all memo sections", () => {
  const review = runReview(demoCompanies[1].input, demoCompanies[1].evidence);
  const coverage = buildMemoCoverageSummary(review);
  assert.equal(coverage.sections.length, Object.keys(review.memo.sections).length);
  assert.ok(coverage.average_coverage_score > 0);
  assert.match(coverage.summary, /Average section evidence coverage/);
});

test("memo coverage distinguishes stronger demo from contradicted demo", () => {
  const risky = buildMemoCoverageSummary(runReview(demoCompanies[0].input, demoCompanies[0].evidence));
  const stronger = buildMemoCoverageSummary(runReview(demoCompanies[1].input, demoCompanies[1].evidence));
  assert.ok(stronger.average_coverage_score > risky.average_coverage_score);
  assert.ok(risky.sections.some((section) => section.contradiction_claim_ids.length > 0));
});

test("memo coverage exposes claim and evidence provenance per section", () => {
  const coverage = buildMemoCoverageSummary(runReview(demoCompanies[1].input, demoCompanies[1].evidence));
  const traction = coverage.sections.find((section) => section.section_key === "traction_assessment");
  assert.ok(traction);
  assert.ok(traction.related_claim_ids.length > 0);
  assert.ok(traction.evidence_ids.length > 0);
  assert.ok(["strong_evidence", "mixed_evidence", "weak_evidence", "inference_only"].includes(traction.status));
});
