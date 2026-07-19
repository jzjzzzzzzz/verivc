import { appendReviewerAuditLogs } from "./reviewerAuditLogs";
import { buildFounderQuestions, buildMemo, buildStartupProfile, detectFindings, deriveStrengths, evaluateCategories, selectRecommendation } from "./engine";
import { assertReviewResult, type ReviewResult } from "./types";

function unique(values: string[]) {
  return Array.from(new Set(values.filter(Boolean)));
}

export function refreshDerivedAnalysis(review: ReviewResult, now = new Date().toISOString()): ReviewResult {
  const profile = buildStartupProfile(review.input, review.claims);
  const evaluations = evaluateCategories(review.claims, review.evidence);
  const redFlags = detectFindings(review.claims);
  const founderQuestions = buildFounderQuestions(review.claims, redFlags);
  const recommendation = selectRecommendation(evaluations, redFlags, review.claims);
  const strengths = deriveStrengths(review.claims, evaluations);
  const missingInformation = unique(review.claims.flatMap((claim) => claim.missing_evidence).concat(evaluations.flatMap((evaluation) => evaluation.missing_information))).slice(0, 12);
  const memo = buildMemo(review.input, profile, review.claims, review.evidence, evaluations, strengths, redFlags, founderQuestions, recommendation);

  return assertReviewResult({
    ...review,
    profile,
    evaluations,
    strengths,
    red_flags: redFlags,
    missing_information: missingInformation,
    founder_questions: founderQuestions,
    recommendation,
    memo: { ...memo, markdown: appendReviewerAuditLogs(memo.markdown, review) },
    provenance_log: [...review.provenance_log, `${now}: Reviewer refreshed derived analysis from the current claim/evidence graph.`],
  });
}
