import type { CategoryEvaluation, ClaimStatus, ReviewResult } from "./types";

export interface ComparisonCompanySummary {
  company_name: string;
  recommendation: string;
  readiness_score: number;
  confidence: string;
  evidence_count: number;
  supported_claims: number;
  contradicted_claims: number;
  insufficient_claims: number;
  high_or_critical_red_flags: number;
  missing_information_count: number;
  evidence_completeness_score: number;
  traction_score: number;
  technical_score: number;
  strongest_dimensions: Array<{ dimension: string; score: number }>;
  weakest_dimensions: Array<{ dimension: string; score: number }>;
}

export interface ComparisonRow {
  label: string;
  left: string;
  right: string;
  interpretation: string;
  stronger: "left" | "right" | "tie";
}

export interface ReviewComparison {
  left: ComparisonCompanySummary;
  right: ComparisonCompanySummary;
  rows: ComparisonRow[];
  stronger_evidence_company: string;
  demo_takeaway: string;
}

function evaluationScore(evaluations: CategoryEvaluation[], dimension: CategoryEvaluation["dimension"]): number {
  return evaluations.find((evaluation) => evaluation.dimension === dimension)?.score ?? 0;
}

function claimCount(review: ReviewResult, statuses: ClaimStatus[]): number {
  return review.claims.filter((claim) => statuses.includes(claim.status)).length;
}

function topDimensions(evaluations: CategoryEvaluation[], direction: "high" | "low") {
  return [...evaluations]
    .sort((a, b) => (direction === "high" ? b.score - a.score : a.score - b.score))
    .slice(0, 3)
    .map((evaluation) => ({ dimension: evaluation.dimension, score: evaluation.score }));
}

export function summarizeForComparison(review: ReviewResult): ComparisonCompanySummary {
  return {
    company_name: review.profile.company_name,
    recommendation: review.recommendation.state,
    readiness_score: review.recommendation.readiness_score,
    confidence: review.recommendation.confidence,
    evidence_count: review.evidence.length,
    supported_claims: claimCount(review, ["supported", "partially_supported"]),
    contradicted_claims: claimCount(review, ["contradicted"]),
    insufficient_claims: claimCount(review, ["insufficient_evidence", "unverifiable"]),
    high_or_critical_red_flags: review.red_flags.filter((finding) => finding.severity === "high" || finding.severity === "critical").length,
    missing_information_count: review.missing_information.length,
    evidence_completeness_score: evaluationScore(review.evaluations, "evidence_completeness"),
    traction_score: evaluationScore(review.evaluations, "traction_evidence"),
    technical_score: evaluationScore(review.evaluations, "technical_credibility"),
    strongest_dimensions: topDimensions(review.evaluations, "high"),
    weakest_dimensions: topDimensions(review.evaluations, "low"),
  };
}

function strongerHigher(left: number, right: number): "left" | "right" | "tie" {
  if (left === right) return "tie";
  return left > right ? "left" : "right";
}

function strongerLower(left: number, right: number): "left" | "right" | "tie" {
  if (left === right) return "tie";
  return left < right ? "left" : "right";
}

function pickWinner(left: ComparisonCompanySummary, right: ComparisonCompanySummary): string {
  const leftEvidenceSignal = left.readiness_score + left.evidence_completeness_score + left.traction_score - left.contradicted_claims * 18 - left.high_or_critical_red_flags * 14;
  const rightEvidenceSignal = right.readiness_score + right.evidence_completeness_score + right.traction_score - right.contradicted_claims * 18 - right.high_or_critical_red_flags * 14;
  if (leftEvidenceSignal === rightEvidenceSignal) return "Tie - manual partner review required";
  return leftEvidenceSignal > rightEvidenceSignal ? left.company_name : right.company_name;
}

export function compareReviews(leftReview: ReviewResult, rightReview: ReviewResult): ReviewComparison {
  const left = summarizeForComparison(leftReview);
  const right = summarizeForComparison(rightReview);
  const rows: ComparisonRow[] = [
    {
      label: "Readiness score",
      left: `${left.readiness_score}/100`,
      right: `${right.readiness_score}/100`,
      interpretation: "Higher score means the evidence graph currently supports a more actionable partner-review path.",
      stronger: strongerHigher(left.readiness_score, right.readiness_score),
    },
    {
      label: "Recommendation",
      left: left.recommendation,
      right: right.recommendation,
      interpretation: "Restrained recommendation states prevent the system from pretending to authorize an investment.",
      stronger: "tie",
    },
    {
      label: "Supported or partial claims",
      left: String(left.supported_claims),
      right: String(right.supported_claims),
      interpretation: "More supported claims indicate stronger traceability, not automatic investability.",
      stronger: strongerHigher(left.supported_claims, right.supported_claims),
    },
    {
      label: "Contradicted claims",
      left: String(left.contradicted_claims),
      right: String(right.contradicted_claims),
      interpretation: "Contradictions are weighted heavily because they undermine trust in polished claims.",
      stronger: strongerLower(left.contradicted_claims, right.contradicted_claims),
    },
    {
      label: "High/critical red flags",
      left: String(left.high_or_critical_red_flags),
      right: String(right.high_or_critical_red_flags),
      interpretation: "Severe findings drive manual review or decline states even when the pitch sounds attractive.",
      stronger: strongerLower(left.high_or_critical_red_flags, right.high_or_critical_red_flags),
    },
    {
      label: "Evidence completeness",
      left: `${left.evidence_completeness_score}/100`,
      right: `${right.evidence_completeness_score}/100`,
      interpretation: "Evidence completeness rewards provenance, primary documents, and transparency.",
      stronger: strongerHigher(left.evidence_completeness_score, right.evidence_completeness_score),
    },
    {
      label: "Traction evidence",
      left: `${left.traction_score}/100`,
      right: `${right.traction_score}/100`,
      interpretation: "Traction claims need primary metrics or strong customer evidence, not adjectives.",
      stronger: strongerHigher(left.traction_score, right.traction_score),
    },
    {
      label: "Technical credibility",
      left: `${left.technical_score}/100`,
      right: `${right.technical_score}/100`,
      interpretation: "Technical artifacts help diligence, but do not alone prove product quality.",
      stronger: strongerHigher(left.technical_score, right.technical_score),
    },
  ];
  const strongerEvidenceCompany = pickWinner(left, right);
  return {
    left,
    right,
    rows,
    stronger_evidence_company: strongerEvidenceCompany,
    demo_takeaway: `${strongerEvidenceCompany} is the stronger evidence case in this comparison. VeriVC does not simply reward polished language; it rewards supportable claims, fewer contradictions, and clearer provenance.`,
  };
}
