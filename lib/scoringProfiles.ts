import type { CategoryEvaluation, EvaluationDimension, Recommendation, ReviewResult } from "./types";

export type ScoringProfileId = "balanced" | "ai_seed" | "b2b_saas" | "technical_angel";

export interface ScoringProfile {
  id: ScoringProfileId;
  name: string;
  description: string;
  weights: Record<EvaluationDimension, number>;
  mustHaveDimensions: EvaluationDimension[];
}

const balancedWeights: Record<EvaluationDimension, number> = {
  problem_clarity: 1,
  product_strength: 1,
  market_evidence: 1,
  business_model: 1,
  traction_evidence: 1,
  technical_credibility: 1,
  team_evidence: 1,
  competition_awareness: 1,
  defensibility: 1,
  execution_risk: 1,
  evidence_completeness: 1,
  transparency: 1,
};

export const scoringProfiles: ScoringProfile[] = [
  {
    id: "balanced",
    name: "Balanced early-stage",
    description: "Default review profile with equal weight across evidence quality, market, product, team, and execution.",
    weights: balancedWeights,
    mustHaveDimensions: ["evidence_completeness", "transparency"],
  },
  {
    id: "ai_seed",
    name: "AI seed fund",
    description: "Weights technical credibility, defensibility, market evidence, and transparency for AI-native seed investments.",
    weights: {
      ...balancedWeights,
      technical_credibility: 1.55,
      defensibility: 1.45,
      market_evidence: 1.25,
      traction_evidence: 1.15,
      transparency: 1.3,
      business_model: 0.85,
    },
    mustHaveDimensions: ["technical_credibility", "defensibility", "transparency"],
  },
  {
    id: "b2b_saas",
    name: "B2B SaaS accelerator",
    description: "Prioritizes problem clarity, business model, traction evidence, sales transparency, and competition awareness.",
    weights: {
      ...balancedWeights,
      problem_clarity: 1.25,
      business_model: 1.45,
      traction_evidence: 1.55,
      competition_awareness: 1.25,
      transparency: 1.25,
      defensibility: 0.75,
    },
    mustHaveDimensions: ["business_model", "traction_evidence", "transparency"],
  },
  {
    id: "technical_angel",
    name: "Technical angel",
    description: "Emphasizes product strength, technical credibility, execution risk, and evidence completeness over broad market narratives.",
    weights: {
      ...balancedWeights,
      product_strength: 1.35,
      technical_credibility: 1.65,
      execution_risk: 1.35,
      evidence_completeness: 1.35,
      market_evidence: 0.75,
      business_model: 0.85,
    },
    mustHaveDimensions: ["product_strength", "technical_credibility", "execution_risk"],
  },
];

export interface WeightedRecommendationSummary {
  profile_id: ScoringProfileId;
  profile_name: string;
  weighted_readiness_score: number;
  base_readiness_score: number;
  delta: number;
  confidence: Recommendation["confidence"];
  top_positive_weighted_dimensions: Array<{ dimension: EvaluationDimension; score: number; weight: number; contribution: number }>;
  top_negative_weighted_dimensions: Array<{ dimension: EvaluationDimension; score: number; weight: number; contribution: number }>;
  must_have_gaps: Array<{ dimension: EvaluationDimension; score: number; threshold: number }>;
  explanation: string;
}

export function getScoringProfile(id: ScoringProfileId): ScoringProfile {
  const profile = scoringProfiles.find((item) => item.id === id);
  if (!profile) throw new Error(`Unknown scoring profile: ${id}`);
  return profile;
}

export function weightedScore(evaluations: CategoryEvaluation[], profile: ScoringProfile): number {
  let numerator = 0;
  let denominator = 0;
  for (const evaluation of evaluations) {
    const weight = profile.weights[evaluation.dimension] ?? 1;
    numerator += evaluation.score * weight;
    denominator += weight;
  }
  return Math.round(numerator / Math.max(denominator, 1));
}

export function summarizeWeightedRecommendation(review: ReviewResult, profile: ScoringProfile): WeightedRecommendationSummary {
  const weighted = weightedScore(review.evaluations, profile);
  const scored = review.evaluations.map((evaluation) => {
    const weight = profile.weights[evaluation.dimension] ?? 1;
    return {
      dimension: evaluation.dimension,
      score: evaluation.score,
      weight,
      contribution: Math.round(evaluation.score * weight),
    };
  });
  const mustHaveGaps = profile.mustHaveDimensions
    .map((dimension) => review.evaluations.find((evaluation) => evaluation.dimension === dimension))
    .filter((evaluation): evaluation is CategoryEvaluation => Boolean(evaluation))
    .filter((evaluation) => evaluation.score < 55)
    .map((evaluation) => ({ dimension: evaluation.dimension, score: evaluation.score, threshold: 55 }));
  const delta = weighted - review.recommendation.readiness_score;
  const confidence = review.recommendation.confidence;
  return {
    profile_id: profile.id,
    profile_name: profile.name,
    weighted_readiness_score: weighted,
    base_readiness_score: review.recommendation.readiness_score,
    delta,
    confidence,
    top_positive_weighted_dimensions: scored.sort((a, b) => b.contribution - a.contribution).slice(0, 3),
    top_negative_weighted_dimensions: [...scored].sort((a, b) => a.contribution - b.contribution).slice(0, 3),
    must_have_gaps: mustHaveGaps,
    explanation: `${profile.name} weighted score is ${weighted}/100 versus base ${review.recommendation.readiness_score}/100. Delta ${delta >= 0 ? "+" : ""}${delta}. ${mustHaveGaps.length} must-have dimension gap(s) below 55/100.`,
  };
}
