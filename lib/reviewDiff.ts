import type { EvaluationDimension, RecommendationState, ReviewResult } from "./types";

export interface EvaluationDelta {
  dimension: EvaluationDimension;
  before_score: number;
  after_score: number;
  delta: number;
}

export interface ReviewRefreshDiff {
  refreshed_at: string;
  previous_recommendation: RecommendationState;
  next_recommendation: RecommendationState;
  previous_readiness_score: number;
  next_readiness_score: number;
  readiness_delta: number;
  confidence_before: string;
  confidence_after: string;
  evaluation_changes: EvaluationDelta[];
  red_flags_added: string[];
  red_flags_resolved: string[];
  founder_question_delta: number;
  missing_information_delta: number;
  summary: string;
}

function titleSet(review: ReviewResult) {
  return new Set(review.red_flags.map((finding) => `${finding.title}::${finding.related_claim_ids.join(",")}`));
}

export function buildReviewRefreshDiff(before: ReviewResult, after: ReviewResult, refreshedAt = new Date().toISOString()): ReviewRefreshDiff {
  const beforeEvaluations = new Map(before.evaluations.map((evaluation) => [evaluation.dimension, evaluation]));
  const evaluation_changes = after.evaluations
    .map((afterEvaluation) => {
      const beforeScore = beforeEvaluations.get(afterEvaluation.dimension)?.score ?? 0;
      return {
        dimension: afterEvaluation.dimension,
        before_score: beforeScore,
        after_score: afterEvaluation.score,
        delta: afterEvaluation.score - beforeScore,
      } satisfies EvaluationDelta;
    })
    .filter((change) => change.delta !== 0)
    .sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta));

  const beforeFlags = titleSet(before);
  const afterFlags = titleSet(after);
  const red_flags_added = after.red_flags.filter((finding) => !beforeFlags.has(`${finding.title}::${finding.related_claim_ids.join(",")}`)).map((finding) => finding.title);
  const red_flags_resolved = before.red_flags.filter((finding) => !afterFlags.has(`${finding.title}::${finding.related_claim_ids.join(",")}`)).map((finding) => finding.title);
  const readiness_delta = after.recommendation.readiness_score - before.recommendation.readiness_score;
  const recommendationChanged = before.recommendation.state !== after.recommendation.state ? `Recommendation changed from ${before.recommendation.state} to ${after.recommendation.state}.` : `Recommendation remained ${after.recommendation.state}.`;
  const scoreDirection = readiness_delta === 0 ? "Readiness score was unchanged" : `Readiness score ${readiness_delta > 0 ? "increased" : "decreased"} by ${Math.abs(readiness_delta)} point(s)`;

  return {
    refreshed_at: refreshedAt,
    previous_recommendation: before.recommendation.state,
    next_recommendation: after.recommendation.state,
    previous_readiness_score: before.recommendation.readiness_score,
    next_readiness_score: after.recommendation.readiness_score,
    readiness_delta,
    confidence_before: before.recommendation.confidence,
    confidence_after: after.recommendation.confidence,
    evaluation_changes,
    red_flags_added,
    red_flags_resolved,
    founder_question_delta: after.founder_questions.length - before.founder_questions.length,
    missing_information_delta: after.missing_information.length - before.missing_information.length,
    summary: `${recommendationChanged} ${scoreDirection}. ${red_flags_added.length} red flag(s) added, ${red_flags_resolved.length} resolved, ${evaluation_changes.length} scorecard dimension(s) changed.`,
  };
}
