export const claimStatuses = [
  "supported",
  "partially_supported",
  "contradicted",
  "insufficient_evidence",
  "unverifiable",
  "not_evaluated",
] as const;

export const recommendationStates = [
  "proceed_to_partner_review",
  "proceed_with_conditions",
  "request_more_information",
  "manual_review_required",
  "decline_based_on_current_evidence",
] as const;

export const claimCategories = [
  "problem",
  "product",
  "market",
  "business_model",
  "team",
  "traction",
  "technology",
  "competition",
  "defensibility",
  "execution",
  "legal",
  "fundraising",
] as const;

export const evaluationDimensions = [
  "problem_clarity",
  "product_strength",
  "market_evidence",
  "business_model",
  "traction_evidence",
  "technical_credibility",
  "team_evidence",
  "competition_awareness",
  "defensibility",
  "execution_risk",
  "evidence_completeness",
  "transparency",
] as const;

export type ClaimStatus = (typeof claimStatuses)[number];
export type RecommendationState = (typeof recommendationStates)[number];
export type ClaimCategory = (typeof claimCategories)[number];
export type EvaluationDimension = (typeof evaluationDimensions)[number];

export type SourceType =
  | "pitch"
  | "deck"
  | "website"
  | "github"
  | "founder_note"
  | "customer_reference"
  | "financial_document"
  | "public_record"
  | "demo_snapshot"
  | "manual_evidence"
  | "llm_inference";

export type ReliabilityLevel = "primary" | "high" | "medium" | "low" | "unknown";
export type ConfidenceLevel = "high" | "medium" | "low";
export type Materiality = "critical" | "high" | "medium" | "low";
export type Verifiability = "direct" | "indirect" | "needs_primary_docs" | "unverifiable";
export type ClaimType = "fact" | "metric" | "projection" | "comparison" | "credential" | "intent" | "opinion";

export interface ReviewerClaimOverride {
  override_id: string;
  claim_id: string;
  previous_status: ClaimStatus;
  new_status: ClaimStatus;
  previous_confidence: ConfidenceLevel;
  new_confidence: ConfidenceLevel;
  note: string;
  updated_at: string;
}

export interface SourceReference {
  source_type: SourceType;
  label: string;
  locator?: string;
  page?: number;
}

export interface StartupInput {
  companyName: string;
  websiteUrl?: string;
  githubUrl?: string;
  githubSnapshot?: string;
  pitch: string;
  sector: string;
  stage: string;
  investmentThesis?: string;
  notes?: string;
  pastedEvidence?: string;
  deckFileName?: string;
  deckText?: string;
}

export interface StartupProfile {
  company_name: string;
  tagline: string;
  problem: string;
  solution: string;
  target_customer: string;
  product: string;
  industry: string;
  business_model: string;
  pricing: string;
  market_claims: string[];
  traction_claims: string[];
  technology_claims: string[];
  team_claims: string[];
  competitive_claims: string[];
  funding_request: string;
  stage: string;
  source_references: SourceReference[];
  extraction_notes: string[];
}

export interface Claim {
  claim_id: string;
  category: ClaimCategory;
  claim_text: string;
  normalized_claim: string;
  source_type: SourceType;
  source_reference: string;
  source_excerpt: string;
  claim_type: ClaimType;
  verifiability: Verifiability;
  materiality: Materiality;
  status: ClaimStatus;
  confidence: ConfidenceLevel;
  supporting_evidence_ids: string[];
  contradicting_evidence_ids: string[];
  missing_evidence: string[];
  reviewer_notes: string[];
  reviewer_overrides?: ReviewerClaimOverride[];
}

export interface Evidence {
  evidence_id: string;
  source_type: SourceType;
  title: string;
  url_or_file?: string;
  excerpt: string;
  captured_at: string;
  reliability_level: ReliabilityLevel;
  relevance: "high" | "medium" | "low";
  supports_claim_ids: string[];
  contradicts_claim_ids: string[];
  limitations: string[];
}

export interface CategoryEvaluation {
  dimension: EvaluationDimension;
  score: number;
  confidence: ConfidenceLevel;
  supporting_reasons: string[];
  negative_reasons: string[];
  evidence_ids: string[];
  missing_information: string[];
  scoring_explanation: string;
}

export interface RiskFinding {
  finding_id: string;
  severity: "critical" | "high" | "medium" | "low";
  title: string;
  explanation: string;
  related_claim_ids: string[];
  evidence_ids: string[];
  contradiction?: string;
  missing_data: string[];
  confidence: ConfidenceLevel;
}

export interface FounderQuestion {
  question_id: string;
  group: "market" | "traction" | "customers" | "technology" | "team" | "economics" | "legal" | "fundraising";
  priority: "critical" | "high" | "medium" | "low";
  question: string;
  rationale: string;
  related_claim_ids: string[];
}

export interface InvestmentMemo {
  markdown: string;
  sections: {
    executive_summary: string;
    company_overview: string;
    investment_thesis: string;
    evidence_backed_strengths: string[];
    red_flags: string[];
    unresolved_questions: string[];
    market_analysis: string;
    product_and_technology: string;
    traction_assessment: string;
    team_assessment: string;
    competition: string;
    risks: string[];
    conditions: string[];
    recommendation: string;
    confidence_and_limitations: string;
  };
}

export interface Recommendation {
  state: RecommendationState;
  readiness_score: number;
  confidence: ConfidenceLevel;
  reasons: string[];
  required_conditions: string[];
  human_review_note: string;
}

export interface ReviewResult {
  review_id: string;
  created_at: string;
  input: StartupInput;
  profile: StartupProfile;
  claims: Claim[];
  evidence: Evidence[];
  evaluations: CategoryEvaluation[];
  strengths: string[];
  red_flags: RiskFinding[];
  missing_information: string[];
  founder_questions: FounderQuestion[];
  memo: InvestmentMemo;
  recommendation: Recommendation;
  last_refresh_diff?: {
    refreshed_at: string;
    previous_recommendation: RecommendationState;
    next_recommendation: RecommendationState;
    previous_readiness_score: number;
    next_readiness_score: number;
    readiness_delta: number;
    confidence_before: string;
    confidence_after: string;
    evaluation_changes: Array<{ dimension: EvaluationDimension; before_score: number; after_score: number; delta: number }>;
    red_flags_added: string[];
    red_flags_resolved: string[];
    founder_question_delta: number;
    missing_information_delta: number;
    summary: string;
  };
  provenance_log: string[];
}

export function isRecommendationState(value: string): value is RecommendationState {
  return recommendationStates.includes(value as RecommendationState);
}

export function assertReviewResult(value: ReviewResult): ReviewResult {
  if (!value.review_id || !value.profile?.company_name) {
    throw new Error("Invalid review: missing review id or company profile.");
  }
  for (const claim of value.claims) {
    if (!claimStatuses.includes(claim.status)) {
      throw new Error(`Invalid claim status for ${claim.claim_id}: ${claim.status}`);
    }
    for (const override of claim.reviewer_overrides ?? []) {
      if (!claimStatuses.includes(override.new_status) || !claimStatuses.includes(override.previous_status)) {
        throw new Error(`Invalid reviewer override status for ${claim.claim_id}.`);
      }
      if (!override.note.trim()) {
        throw new Error(`Reviewer override for ${claim.claim_id} is missing a note.`);
      }
    }
  }
  for (const evaluation of value.evaluations) {
    if (evaluation.score < 0 || evaluation.score > 100) {
      throw new Error(`Invalid score for ${evaluation.dimension}: ${evaluation.score}`);
    }
  }
  if (!isRecommendationState(value.recommendation.state)) {
    throw new Error(`Invalid recommendation state: ${value.recommendation.state}`);
  }
  return value;
}
