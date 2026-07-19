import assert from "node:assert/strict";
import test from "node:test";
import { demoCompanies } from "../lib/demoData.ts";
import { runReview } from "../lib/engine.ts";
import { createSharePayload, parseSharePayload, sharePayloadPrefix, sharePayloadSummary } from "../lib/sharePackage.ts";

test("share payload round-trips a complete audit package", () => {
  const review = runReview(demoCompanies[1].input, demoCompanies[1].evidence);
  const payload = createSharePayload(review);
  assert.ok(payload.startsWith(sharePayloadPrefix));
  assert.match(sharePayloadSummary(payload), /local handoff only/);
  const imported = parseSharePayload(payload);
  assert.equal(imported.schema_version, "verivc.review.v1");
  assert.equal(imported.review.profile.company_name, "GrainLoop");
  assert.equal(imported.review.claims.length, review.claims.length);
  assert.equal(imported.review.recommendation.state, review.recommendation.state);
});

test("share payload import rejects malformed handoff text", () => {
  assert.throws(() => parseSharePayload("{}"), /must start/);
  assert.throws(() => parseSharePayload(`${sharePayloadPrefix}`), /missing encoded/);
  assert.throws(() => parseSharePayload(`${sharePayloadPrefix}not valid!`), /outside the VeriVC base64url format/);
});
