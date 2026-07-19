import assert from "node:assert/strict";
import test from "node:test";
import { demoCompanies } from "../lib/demoData.ts";
import { runReview } from "../lib/engine.ts";
import { buildPrintableMemoHtml, escapeHtml, memoMarkdownToHtml, printableMemoFileName } from "../lib/memoHtmlExport.ts";
import { getScoringProfile, summarizeWeightedRecommendation } from "../lib/scoringProfiles.ts";

test("HTML escaping prevents raw markup in printable memo exports", () => {
  assert.equal(escapeHtml("<script>alert('x')</script> & memo"), "&lt;script&gt;alert(&#39;x&#39;)&lt;/script&gt; &amp; memo");
  assert.match(memoMarkdownToHtml("# Title\n\n- **safe** `code`"), /<h1>Title<\/h1>/);
  assert.match(memoMarkdownToHtml("# <bad>"), /&lt;bad&gt;/);
});

test("printable memo HTML includes recommendation, evidence, profile, and print CSS", () => {
  const review = runReview(demoCompanies[1].input, demoCompanies[1].evidence);
  const weighted = summarizeWeightedRecommendation(review, getScoringProfile("b2b_saas"));
  const html = buildPrintableMemoHtml(review, weighted);
  assert.match(html, /^<!doctype html>/);
  assert.match(html, /VeriVC printable investment memo/);
  assert.match(html, /proceed_with_conditions/);
  assert.match(html, /Claim-evidence appendix/);
  assert.match(html, /Evidence appendix/);
  assert.match(html, /Memo Evidence Coverage/);
  assert.match(html, /Traction Assessment/);
  assert.match(html, /@media print/);
  assert.match(html, /B2B SaaS accelerator weighted score/);
  assert.equal(printableMemoFileName(review), "grainloop-verivc-printable-memo.html");
});
