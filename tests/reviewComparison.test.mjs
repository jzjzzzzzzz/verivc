import assert from "node:assert/strict";
import test from "node:test";
import { demoCompanies } from "../lib/demoData.ts";
import { runReview } from "../lib/engine.ts";
import { compareReviews, summarizeForComparison } from "../lib/reviewComparison.ts";

test("comparison summary counts supported and contradicted claims", () => {
  const risky = runReview(demoCompanies[0].input, demoCompanies[0].evidence);
  const summary = summarizeForComparison(risky);
  assert.equal(summary.company_name, "Aurelia AI");
  assert.ok(summary.contradicted_claims >= 3);
  assert.ok(summary.high_or_critical_red_flags >= 1);
  assert.equal(summary.strongest_dimensions.length, 3);
  assert.equal(summary.weakest_dimensions.length, 3);
});

test("demo comparison favors the less flashy but better supported company", () => {
  const risky = runReview(demoCompanies[0].input, demoCompanies[0].evidence);
  const stronger = runReview(demoCompanies[1].input, demoCompanies[1].evidence);
  const comparison = compareReviews(risky, stronger);
  assert.equal(comparison.stronger_evidence_company, "GrainLoop");
  assert.match(comparison.demo_takeaway, /does not simply reward polished language/);
  assert.ok(comparison.rows.some((row) => row.label === "Contradicted claims" && row.stronger === "right"));
  assert.ok(comparison.rows.some((row) => row.label === "Evidence completeness"));
});
