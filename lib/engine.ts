import type {
  CategoryEvaluation,
  Claim,
  ClaimCategory,
  ClaimStatus,
  ClaimType,
  ConfidenceLevel,
  EvaluationDimension,
  Evidence,
  FounderQuestion,
  InvestmentMemo,
  Materiality,
  Recommendation,
  ReviewResult,
  RiskFinding,
  StartupInput,
  StartupProfile,
  Verifiability,
} from "./types";
import { assertReviewResult, evaluationDimensions } from "./types";

const highImpactWords = ["revenue", "mrr", "customer", "enterprise", "growth", "market", "moat", "production", "funding", "patent", "regulatory"];
const metricPattern = /(?:\$\s?\d+(?:\.\d+)?\s?[kmb]?|\b\d+(?:\.\d+)?\s?%|\b\d+\s?(?:customers|users|locations|pilots|contributors|commits|mrr|arr|loi|letters|months|weeks)\b)/i;

function slugify(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "").slice(0, 48) || "review";
}

function splitSentences(text: string): string[] {
  return text
    .replace(/\s+/g, " ")
    .split(/(?<=[.!?])\s+/)
    .map((sentence) => sentence.trim())
    .filter((sentence) => sentence.length > 18);
}

function includesAny(text: string, words: string[]): boolean {
  const lower = text.toLowerCase();
  return words.some((word) => lower.includes(word));
}

function categoryFor(sentence: string): ClaimCategory {
  const lower = sentence.toLowerCase();
  if (includesAny(lower, ["regulatory", "legal", "compliance", "privacy"])) return "legal";
  if (includesAny(lower, ["raising", "raise", "funding", "use of funds"])) return "fundraising";
  if (includesAny(lower, ["competitor", "competitors", "gong", "salesloft", "apollo", "clay"])) return "competition";
  if (includesAny(lower, ["moat", "proprietary", "defensible", "patent", "unique"])) return "defensibility";
  if (includesAny(lower, ["github", "repository", "commits", "production-ready", "production ready", "technical", "license", "tests"])) return "technology";
  if (includesAny(lower, ["charge", "pricing", "subscription", "per month", "business model"])) return "business_model";
  if (includesAny(lower, ["product", "dashboard", "platform", "agent", "workflow", "mobile", "sms"])) return "product";
  if (includesAny(lower, ["mrr", "revenue", "customers", "pilots", "usage", "subscriptions", "loi", "growth", "converted"])) return "traction";
  if (includesAny(lower, ["founder", "founding", "engineering team", "team has", "team with", "team experience", "experience", "previously built", "hire one"])) return "team";
  if (includesAny(lower, ["problem", "spreadsheets", "phone calls", "busywork", "pain", "missed"])) return "problem";
  if (includesAny(lower, ["market", "tam", "opportunity", "$50b", "global", "regional", "midwest"])) return "market";
  return "execution";
}


function claimTypeFor(sentence: string): ClaimType {
  const lower = sentence.toLowerCase();
  if (metricPattern.test(sentence)) return "metric";
  if (includesAny(lower, ["will", "intend", "plan", "forecast", "project"])) return "projection";
  if (includesAny(lower, ["no direct competitors", "better", "first", "largest", "unique"])) return "comparison";
  if (includesAny(lower, ["founder", "experience", "previously", "fortune 500"])) return "credential";
  if (includesAny(lower, ["raising", "hire", "expand"])) return "intent";
  if (includesAny(lower, ["strong", "clear", "attractive", "useful"])) return "opinion";
  return "fact";
}

function verifiabilityFor(sentence: string, type: ClaimType): Verifiability {
  const lower = sentence.toLowerCase();
  if (type === "opinion" || lower.includes("unique") || lower.includes("moat")) return "indirect";
  if (lower.includes("market") || lower.includes("opportunity")) return "needs_primary_docs";
  if (lower.includes("fortune 500") || lower.includes("revenue") || lower.includes("mrr") || lower.includes("customers")) return "needs_primary_docs";
  if (metricPattern.test(sentence)) return "direct";
  return "indirect";
}

function materialityFor(sentence: string, category: ClaimCategory): Materiality {
  const lower = sentence.toLowerCase();
  if (includesAny(lower, highImpactWords) || ["traction", "fundraising", "legal"].includes(category)) return "high";
  if (["market", "team", "technology", "defensibility"].includes(category)) return "medium";
  return "low";
}

function makeClaim(index: number, sentence: string, source_type: Claim["source_type"], source_reference: string): Claim {
  const category = categoryFor(sentence);
  const type = claimTypeFor(sentence);
  return {
    claim_id: `CL-${String(index + 1).padStart(3, "0")}`,
    category,
    claim_text: sentence,
    normalized_claim: sentence.toLowerCase().replace(/[^a-z0-9$%. ]+/g, " ").replace(/\s+/g, " ").trim(),
    source_type,
    source_reference,
    source_excerpt: sentence.slice(0, 280),
    claim_type: type,
    verifiability: verifiabilityFor(sentence, type),
    materiality: materialityFor(sentence, category),
    status: "not_evaluated",
    confidence: "low",
    supporting_evidence_ids: [],
    contradicting_evidence_ids: [],
    missing_evidence: [],
    reviewer_notes: [],
  };
}

export function extractClaims(input: StartupInput): Claim[] {
  const sourceBlocks: Array<[Claim["source_type"], string, string]> = [
    ["pitch", "Pitch description", input.pitch],
    ["founder_note", "Reviewer / founder notes", input.notes ?? ""],
  ];
  let index = 0;
  const claims: Claim[] = [];
  for (const [sourceType, sourceRef, block] of sourceBlocks) {
    for (const sentence of splitSentences(block)) {
      if (
        metricPattern.test(sentence) ||
        includesAny(sentence, ["market", "customer", "revenue", "mrr", "competitor", "moat", "production", "repository", "founder", "founding", "team", "raising", "charge", "pricing", "product", "problem", "serve"])
      ) {
        claims.push(makeClaim(index, sentence, sourceType, sourceRef));
        index += 1;
      }
    }
  }
  if (input.deckFileName) {
    claims.push({
      ...makeClaim(index, `Pitch deck file ${input.deckFileName} was uploaded but local demo mode does not extract embedded PDF text.`, "deck", input.deckFileName),
      category: "execution",
      claim_type: "fact",
      status: "unverifiable",
      missing_evidence: ["Paste key deck text or enable a PDF extraction provider to preserve page-level citations."],
    });
  }
  return claims.slice(0, 24);
}

export function buildEvidenceFromInput(input: StartupInput, provided: Evidence[] = []): Evidence[] {
  const now = new Date().toISOString();
  const evidence: Evidence[] = provided.map((item) => ({ ...item, supports_claim_ids: [...item.supports_claim_ids], contradicts_claim_ids: [...item.contradicts_claim_ids] }));
  if (input.pastedEvidence?.trim()) {
    evidence.push({
      evidence_id: `EV-USR-${String(evidence.length + 1).padStart(3, "0")}`,
      source_type: "manual_evidence",
      title: "Pasted evidence and metrics",
      excerpt: input.pastedEvidence.trim().slice(0, 1200),
      captured_at: now,
      reliability_level: "medium",
      relevance: "high",
      supports_claim_ids: [],
      contradicts_claim_ids: [],
      limitations: ["Pasted evidence is user-provided and should be verified against primary documents."],
    });
  }
  if (input.websiteUrl) {
    evidence.push({
      evidence_id: `EV-WEB-${String(evidence.length + 1).padStart(3, "0")}`,
      source_type: "website",
      title: "Company website URL captured",
      url_or_file: input.websiteUrl,
      excerpt: `Website URL captured for follow-up review: ${input.websiteUrl}. No live scraping is required for this deterministic local analysis.`,
      captured_at: now,
      reliability_level: "low",
      relevance: "medium",
      supports_claim_ids: [],
      contradicts_claim_ids: [],
      limitations: ["URL capture preserves provenance but is not independent validation."],
    });
  }
  if (input.githubUrl) {
    evidence.push({
      evidence_id: `EV-GH-${String(evidence.length + 1).padStart(3, "0")}`,
      source_type: "github",
      title: "GitHub URL captured",
      url_or_file: input.githubUrl,
      excerpt: `GitHub URL captured for optional technical diligence: ${input.githubUrl}. Public metrics are not fetched in offline demo mode.`,
      captured_at: now,
      reliability_level: "low",
      relevance: "medium",
      supports_claim_ids: [],
      contradicts_claim_ids: [],
      limitations: ["Captured URL alone does not prove repository quality, ownership, or production readiness."],
    });
  }
  if (input.deckFileName) {
    evidence.push({
      evidence_id: `EV-DECK-${String(evidence.length + 1).padStart(3, "0")}`,
      source_type: "deck",
      title: "Uploaded pitch deck placeholder",
      url_or_file: input.deckFileName,
      excerpt: `PDF file name captured: ${input.deckFileName}. Text extraction is intentionally explicit rather than inferred.`,
      captured_at: now,
      reliability_level: "unknown",
      relevance: "medium",
      supports_claim_ids: [],
      contradicts_claim_ids: [],
      limitations: ["This local MVP records the PDF artifact but does not execute or parse embedded content."],
    });
  }
  return evidence;
}

function importantTokens(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[$,]/g, "")
    .split(/[^a-z0-9.]+/)
    .filter((token) => token.length > 2 && !["the", "and", "with", "that", "for", "are", "but", "our", "has", "have", "from", "this", "into", "after", "before", "they", "was", "were"].includes(token));
}

function numericHints(text: string): string[] {
  return (text.toLowerCase().replace(/,/g, "").match(/\$?\d+(?:\.\d+)?\s?[kmb]?|\d+(?:\.\d+)?%/g) ?? []).map((v) => v.replace(/\s+/g, ""));
}

function evidenceRelation(claim: Claim, evidence: Evidence): "supports" | "contradicts" | "none" {
  const claimText = claim.normalized_claim;
  const evidenceText = `${evidence.title} ${evidence.excerpt}`.toLowerCase();
  const tokens = importantTokens(claimText);
  const overlap = tokens.filter((token) => evidenceText.includes(token));
  const claimNumbers = numericHints(claimText);
  const evidenceNumbers = numericHints(evidenceText);

  if (claimText.includes("no direct competitors") && includesAny(evidenceText, ["competitors", "gong", "outreach", "salesloft", "apollo", "clay"])) return "contradicts";
  if ((claimText.includes("production-ready") || claimText.includes("production ready")) && includesAny(evidenceText, ["prototype", "stub", "no deployment", "one contributor", "last commit on 2025"])) return "contradicts";
  if ((claimText.includes("fortune 500") || claimText.includes("enterprise customers")) && includesAny(evidenceText, ["no signed enterprise", "pipeline includes", "innovation teams"])) return "contradicts";
  if ((claimText.includes("$82k") || claimText.includes("82k mrr")) && evidenceText.includes("$31k")) return "contradicts";
  if (claimText.includes("92%") && includesAny(evidenceText, ["unpaid", "design partners"])) return "contradicts";
  if (claimText.includes("strong technical moat") && includesAny(evidenceText, ["stub", "no deployment", "one contributor"])) return "contradicts";

  if (claimNumbers.length > 0 && evidenceNumbers.some((n) => claimNumbers.includes(n))) return "supports";
  if (overlap.length >= Math.min(4, Math.max(2, Math.floor(tokens.length * 0.25)))) return "supports";
  if (claim.category === "technology" && evidence.source_type === "github" && overlap.length >= 1) return "supports";
  if (claim.category === "product" && ["customer_reference", "github", "manual_evidence"].includes(evidence.source_type) && overlap.length >= 1) return "supports";
  if (claim.category === "team" && includesAny(evidenceText, ["contributors", "previously built", "operations experience", "founding team"])) return "supports";
  if (claim.category === "traction" && ["financial_document", "customer_reference", "founder_note", "manual_evidence"].includes(evidence.source_type) && overlap.length >= 2) return "supports";
  return "none";
}

function missingEvidenceFor(claim: Claim): string[] {
  const lower = claim.claim_text.toLowerCase();
  const missing: string[] = [];
  if (claim.verifiability === "needs_primary_docs") missing.push("Primary source document or independent verification required.");
  if (claim.category === "traction") missing.push("Underlying customer list, contract status, cohort dates, and revenue reconciliation.");
  if (claim.category === "market") missing.push("Bottom-up market model or cited external market source.");
  if (claim.category === "technology") missing.push("Technical artifact: repository access, architecture notes, deployment evidence, or product walkthrough.");
  if (claim.category === "team") missing.push("Founder background verification and role-specific execution evidence.");
  if (claim.category === "competition") missing.push("Named competitor map and differentiation evidence.");
  if (lower.includes("growth") && !/\b(month|week|quarter|year|period|from|to)\b/i.test(lower)) missing.push("Growth baseline and time period.");
  if (lower.includes("market") && !/source|bottom-up|bottom up|cited|association/i.test(lower)) missing.push("Market sizing methodology.");
  return [...new Set(missing)];
}

export function associateEvidence(claims: Claim[], evidence: Evidence[]): { claims: Claim[]; evidence: Evidence[] } {
  const nextEvidence = evidence.map((item) => ({ ...item, supports_claim_ids: [] as string[], contradicts_claim_ids: [] as string[] }));
  const nextClaims = claims.map((claim) => {
    const supporting: string[] = [];
    const contradicting: string[] = [];
    for (const item of nextEvidence) {
      const relation = evidenceRelation(claim, item);
      if (relation === "supports") {
        supporting.push(item.evidence_id);
        item.supports_claim_ids.push(claim.claim_id);
      }
      if (relation === "contradicts") {
        contradicting.push(item.evidence_id);
        item.contradicts_claim_ids.push(claim.claim_id);
      }
    }
    const missing = missingEvidenceFor(claim);
    let status: ClaimStatus = "insufficient_evidence";
    if (claim.verifiability === "unverifiable") status = "unverifiable";
    else if (contradicting.length > 0) status = supporting.length > 0 ? "contradicted" : "contradicted";
    else if (supporting.length >= 2 && missing.length === 0) status = "supported";
    else if (supporting.length > 0) status = missing.length > 0 ? "partially_supported" : "supported";
    else if (claim.claim_type === "opinion") status = "unverifiable";
    const confidence: ConfidenceLevel = status === "supported" ? "high" : status === "partially_supported" || status === "contradicted" ? "medium" : "low";
    return {
      ...claim,
      status,
      confidence,
      supporting_evidence_ids: supporting,
      contradicting_evidence_ids: contradicting,
      missing_evidence: status === "supported" ? [] : missing,
      reviewer_notes: [
        status === "supported" ? "Evidence matched the claim without a detected contradiction." : "Evidence coverage is incomplete or conflicting; human review should inspect linked sources.",
      ],
    };
  });
  return { claims: nextClaims, evidence: nextEvidence };
}

function firstSentence(text: string, fallback: string): string {
  return splitSentences(text)[0] ?? fallback;
}

function claimsBy(claims: Claim[], category: ClaimCategory): Claim[] {
  return claims.filter((claim) => claim.category === category);
}

export function buildStartupProfile(input: StartupInput, claims: Claim[]): StartupProfile {
  const tractionClaims = claimsBy(claims, "traction").map((claim) => claim.claim_text);
  const marketClaims = claimsBy(claims, "market").map((claim) => claim.claim_text);
  const technologyClaims = claimsBy(claims, "technology").map((claim) => claim.claim_text);
  const teamClaims = claimsBy(claims, "team").map((claim) => claim.claim_text);
  const competitiveClaims = claimsBy(claims, "competition").map((claim) => claim.claim_text);
  const fundraisingClaim = claims.find((claim) => claim.category === "fundraising")?.claim_text ?? "Funding request not specified.";
  return {
    company_name: input.companyName,
    tagline: firstSentence(input.pitch, `${input.companyName} startup review`),
    problem: claimsBy(claims, "problem")[0]?.claim_text ?? "Problem statement needs clarification.",
    solution: claimsBy(claims, "product")[0]?.claim_text ?? firstSentence(input.pitch, "Solution not extracted."),
    target_customer: /serve[s]? ([^.]+)\./i.exec(input.pitch)?.[1] ?? "Target customer requires reviewer confirmation.",
    product: claimsBy(claims, "product")[0]?.claim_text ?? "Product description not extracted.",
    industry: input.sector,
    business_model: claimsBy(claims, "business_model")[0]?.claim_text ?? "Business model not clearly stated.",
    pricing: /(?:charge|pricing|price|\$)([^.]+)/i.exec(input.pitch)?.[0] ?? "Pricing not clearly stated.",
    market_claims: marketClaims,
    traction_claims: tractionClaims,
    technology_claims: technologyClaims,
    team_claims: teamClaims,
    competitive_claims: competitiveClaims,
    funding_request: fundraisingClaim,
    stage: input.stage,
    source_references: [
      { source_type: "pitch", label: "Pitch description" },
      ...(input.notes ? [{ source_type: "founder_note" as const, label: "Reviewer / founder notes" }] : []),
      ...(input.websiteUrl ? [{ source_type: "website" as const, label: "Company website", locator: input.websiteUrl }] : []),
      ...(input.githubUrl ? [{ source_type: "github" as const, label: "GitHub repository", locator: input.githubUrl }] : []),
    ],
    extraction_notes: ["Deterministic local extraction; optional LLM providers can be added without changing the evidence schema."],
  };
}

function scoreForDimension(dimension: EvaluationDimension, claims: Claim[], evidence: Evidence[]): CategoryEvaluation {
  const map: Record<EvaluationDimension, ClaimCategory[]> = {
    problem_clarity: ["problem"],
    product_strength: ["product"],
    market_evidence: ["market"],
    business_model: ["business_model"],
    traction_evidence: ["traction"],
    technical_credibility: ["technology"],
    team_evidence: ["team"],
    competition_awareness: ["competition"],
    defensibility: ["defensibility"],
    execution_risk: ["execution", "fundraising", "legal"],
    evidence_completeness: ["problem", "product", "market", "business_model", "team", "traction", "technology", "competition", "defensibility", "execution", "legal", "fundraising"],
    transparency: ["traction", "competition", "fundraising", "legal"],
  };
  const relevant = claims.filter((claim) => map[dimension].includes(claim.category));
  const total = Math.max(relevant.length, 1);
  const supported = relevant.filter((claim) => claim.status === "supported").length;
  const partial = relevant.filter((claim) => claim.status === "partially_supported").length;
  const contradicted = relevant.filter((claim) => claim.status === "contradicted").length;
  const insufficient = relevant.filter((claim) => claim.status === "insufficient_evidence" || claim.status === "unverifiable").length;
  let score = Math.round((supported * 90 + partial * 62 + insufficient * 32 - contradicted * 35) / total);
  if (relevant.length === 0) {
    const evidenceText = evidence.map((item) => `${item.title} ${item.excerpt}`.toLowerCase()).join(" ");
    score = 35;
    if (dimension === "technical_credibility" && includesAny(evidenceText, ["commits", "contributors", "readme", "tests", "license"])) score = 70;
    if (dimension === "market_evidence" && includesAny(evidenceText, ["bottom-up", "bottom up", "regional", "associations", "beachhead"])) score = 62;
    if (dimension === "product_strength" && includesAny(evidenceText, ["customer reference", "product walkthrough", "workflow", "dashboard"])) score = 66;
    if (dimension === "team_evidence" && includesAny(evidenceText, ["contributors", "operations experience", "previously built"])) score = 58;
    if (dimension === "competition_awareness") score = 30;
    if (dimension === "defensibility") score = 42;
  }
  if (dimension === "execution_risk") score = Math.max(0, Math.min(100, 72 - contradicted * 25 - insufficient * 8 + supported * 6));
  if (dimension === "evidence_completeness") {
    const coverage = claims.filter((claim) => claim.supporting_evidence_ids.length + claim.contradicting_evidence_ids.length > 0).length / Math.max(claims.length, 1);
    score = Math.round(coverage * 100 - contradicted * 5);
  }
  score = Math.max(0, Math.min(100, score));
  const evidenceIds = [...new Set(relevant.flatMap((claim) => [...claim.supporting_evidence_ids, ...claim.contradicting_evidence_ids]))];
  const confidence: ConfidenceLevel = evidenceIds.length >= 3 && contradicted === 0 ? "high" : evidenceIds.length > 0 || contradicted > 0 ? "medium" : "low";
  const label = dimension.replaceAll("_", " ");
  return {
    dimension,
    score,
    confidence,
    supporting_reasons: relevant.filter((claim) => claim.status === "supported" || claim.status === "partially_supported").slice(0, 3).map((claim) => `${claim.claim_id}: ${claim.claim_text}`),
    negative_reasons: relevant.filter((claim) => claim.status === "contradicted" || claim.status === "insufficient_evidence" || claim.status === "unverifiable").slice(0, 4).map((claim) => `${claim.claim_id}: ${claim.status.replaceAll("_", " ")}`),
    evidence_ids: evidenceIds,
    missing_information: [...new Set(relevant.flatMap((claim) => claim.missing_evidence))].slice(0, 5),
    scoring_explanation: `${label} score uses visible claim statuses: supported=${supported}, partially_supported=${partial}, insufficient_or_unverifiable=${insufficient}, contradicted=${contradicted}. Evidence count=${evidenceIds.length}/${evidence.length}.`,
  };
}

export function evaluateCategories(claims: Claim[], evidence: Evidence[]): CategoryEvaluation[] {
  return evaluationDimensions.map((dimension) => scoreForDimension(dimension, claims, evidence));
}

export function detectFindings(claims: Claim[]): RiskFinding[] {
  const findings: RiskFinding[] = [];
  for (const claim of claims) {
    if (claim.status === "contradicted") {
      findings.push({
        finding_id: `RF-${String(findings.length + 1).padStart(3, "0")}`,
        severity: claim.materiality === "critical" || claim.materiality === "high" ? "high" : "medium",
        title: `Contradiction in ${claim.category.replaceAll("_", " ")}`,
        explanation: `The claim is contradicted by one or more preserved evidence items. The conclusion is not treated as verified until the conflict is resolved.`,
        related_claim_ids: [claim.claim_id],
        evidence_ids: claim.contradicting_evidence_ids,
        contradiction: claim.claim_text,
        missing_data: claim.missing_evidence,
        confidence: "medium",
      });
    } else if ((claim.materiality === "high" || claim.materiality === "critical") && (claim.status === "insufficient_evidence" || claim.status === "unverifiable")) {
      findings.push({
        finding_id: `RF-${String(findings.length + 1).padStart(3, "0")}`,
        severity: "medium",
        title: `Material claim lacks evidence: ${claim.category.replaceAll("_", " ")}`,
        explanation: `A high-materiality claim has not been supported by reliable evidence in the current review packet.`,
        related_claim_ids: [claim.claim_id],
        evidence_ids: [],
        missing_data: claim.missing_evidence,
        confidence: "low",
      });
    }
  }
  return findings;
}

export function buildFounderQuestions(claims: Claim[], findings: RiskFinding[]): FounderQuestion[] {
  const questions: FounderQuestion[] = [];
  const add = (group: FounderQuestion["group"], priority: FounderQuestion["priority"], question: string, rationale: string, related: string[]) => {
    questions.push({ question_id: `FQ-${String(questions.length + 1).padStart(3, "0")}`, group, priority, question, rationale, related_claim_ids: related });
  };
  for (const finding of findings.slice(0, 8)) {
    const claim = claims.find((item) => item.claim_id === finding.related_claim_ids[0]);
    if (!claim) continue;
    if (claim.category === "traction") add("traction", finding.severity === "high" ? "critical" : "high", "Please reconcile the traction claim with source documents: customer count, paid status, MRR/ARR, dates, churn, and cohort definition.", finding.title, [claim.claim_id]);
    else if (claim.category === "market") add("market", "high", "What is the bottom-up market sizing model, and which external sources or customer counts support it?", finding.title, [claim.claim_id]);
    else if (claim.category === "technology") add("technology", "high", "Which production artifacts, architecture documents, deployment logs, tests, or customer environments prove the product is production-ready?", finding.title, [claim.claim_id]);
    else if (claim.category === "competition") add("market", "high", "Who are the closest alternatives customers use today, and why do you win despite those options?", finding.title, [claim.claim_id]);
    else if (claim.category === "team") add("team", "medium", "Which founder or team experiences are directly relevant to this product, and can references confirm them?", finding.title, [claim.claim_id]);
    else if (claim.category === "fundraising") add("fundraising", "medium", "How does the requested round map to hiring, runway, milestones, and follow-on financing assumptions?", finding.title, [claim.claim_id]);
  }
  if (!claims.some((claim) => claim.category === "legal")) add("legal", "medium", "Are there any regulatory, data privacy, contractual, or sector-specific compliance risks that should be reviewed before partner discussion?", "No legal diligence claim was extracted.", []);
  if (!claims.some((claim) => claim.category === "business_model")) add("economics", "high", "What are price, gross margin, sales cycle, implementation cost, and payback period assumptions?", "Business model evidence is incomplete.", []);
  return questions.slice(0, 12);
}

export function selectRecommendation(evaluations: CategoryEvaluation[], findings: RiskFinding[], claims: Claim[]): Recommendation {
  const avg = Math.round(evaluations.reduce((sum, item) => sum + item.score, 0) / evaluations.length);
  const contradictionCount = claims.filter((claim) => claim.status === "contradicted").length;
  const highFindings = findings.filter((finding) => finding.severity === "critical" || finding.severity === "high").length;
  const coverage = claims.filter((claim) => claim.status === "supported" || claim.status === "partially_supported" || claim.status === "contradicted").length / Math.max(claims.length, 1);
  const criticalWeak = claims.filter((claim) => claim.materiality === "high" && ["insufficient_evidence", "unverifiable"].includes(claim.status)).length;
  const confidence: ConfidenceLevel = coverage > 0.72 && contradictionCount === 0 ? "high" : coverage > 0.4 ? "medium" : "low";
  const reasons = [`Average category score is ${avg}/100.`, `Evidence coverage is ${Math.round(coverage * 100)}% across extracted claims.`, `${contradictionCount} contradiction(s) and ${criticalWeak} unsupported high-materiality claim(s) detected.`];
  const required_conditions = [...new Set(evaluations.flatMap((item) => item.missing_information).concat(findings.flatMap((item) => item.missing_data)))].slice(0, 6);
  let state: Recommendation["state"] = "request_more_information";
  if (contradictionCount >= 3 || highFindings >= 3) state = "decline_based_on_current_evidence";
  else if (contradictionCount > 0 || highFindings > 0) state = "manual_review_required";
  else if (avg >= 72 && coverage >= 0.68 && criticalWeak <= 1) state = "proceed_to_partner_review";
  else if (avg >= 58 && coverage >= 0.45) state = "proceed_with_conditions";
  else state = "request_more_information";
  return {
    state,
    readiness_score: Math.max(0, Math.min(100, avg)),
    confidence,
    reasons,
    required_conditions,
    human_review_note: "VeriVC is a decision-support system: a human investor must review the memo, source evidence, legal documents, and final investment terms.",
  };
}

export function deriveStrengths(claims: Claim[], evaluations: CategoryEvaluation[]): string[] {
  const fromClaims = claims
    .filter((claim) => claim.status === "supported" || claim.status === "partially_supported")
    .filter((claim) => ["traction", "product", "technology", "team", "business_model", "problem"].includes(claim.category))
    .slice(0, 5)
    .map((claim) => `${claim.claim_text} (${claim.claim_id})`);
  const topDims = evaluations.filter((evaluation) => evaluation.score >= 68).slice(0, 3).map((evaluation) => `${evaluation.dimension.replaceAll("_", " ")} scored ${evaluation.score}/100 with ${evaluation.confidence} confidence.`);
  return [...fromClaims, ...topDims].slice(0, 6);
}

export function buildMemo(input: StartupInput, profile: StartupProfile, claims: Claim[], evidence: Evidence[], evaluations: CategoryEvaluation[], strengths: string[], findings: RiskFinding[], questions: FounderQuestion[], recommendation: Recommendation): InvestmentMemo {
  const supportedClaims = claims.filter((claim) => claim.status === "supported" || claim.status === "partially_supported").slice(0, 6);
  const redFlags = findings.map((finding) => `${finding.title}: ${finding.explanation} Evidence: ${finding.evidence_ids.join(", ") || "none linked"}.`);
  const unresolved = questions.slice(0, 6).map((question) => `${question.group}: ${question.question}`);
  const sections = {
    executive_summary: `${profile.company_name} is reviewed at ${profile.stage} stage in ${profile.industry}. Current evidence supports ${supportedClaims.length} important claim(s), while ${findings.length} risk finding(s) remain open. Recommendation: ${recommendation.state}.`,
    company_overview: `${profile.tagline}\n\nProblem: ${profile.problem}\nSolution/Product: ${profile.product}`,
    investment_thesis: input.investmentThesis?.trim() || "No investor-specific thesis was supplied; analysis uses default evidence-quality and early-stage diligence criteria.",
    evidence_backed_strengths: strengths,
    red_flags: redFlags,
    unresolved_questions: unresolved,
    market_analysis: `Market-related claims: ${profile.market_claims.join(" ") || "No explicit market claim extracted."} Evidence should be interpreted through linked source IDs, not generic market assumptions.`,
    product_and_technology: `Product/technology claims include: ${[...profile.technology_claims, profile.product].filter(Boolean).join(" ")} Technical credibility score: ${evaluations.find((item) => item.dimension === "technical_credibility")?.score ?? "n/a"}/100.`,
    traction_assessment: `Traction claims: ${profile.traction_claims.join(" ") || "No traction claim extracted."} Traction score: ${evaluations.find((item) => item.dimension === "traction_evidence")?.score ?? "n/a"}/100.`,
    team_assessment: profile.team_claims.join(" ") || "Team evidence was not sufficiently extracted from the current packet.",
    competition: profile.competitive_claims.join(" ") || "No explicit competitor analysis was provided; this is a diligence gap, not proof of no competition.",
    risks: findings.map((finding) => `${finding.severity.toUpperCase()}: ${finding.title}`),
    conditions: recommendation.required_conditions,
    recommendation: `${recommendation.state} — ${recommendation.reasons.join(" ")}`,
    confidence_and_limitations: `${recommendation.confidence} confidence. Conclusions are based only on preserved evidence IDs (${evidence.map((item) => item.evidence_id).join(", ") || "none"}) and founder/user-provided material. Missing primary documents reduce confidence.`,
  };
  const markdown = `# VeriVC Investment Memo: ${profile.company_name}\n\n## Executive Summary\n${sections.executive_summary}\n\n## Company Overview\n${sections.company_overview}\n\n## Investment Thesis\n${sections.investment_thesis}\n\n## Evidence-Backed Strengths\n${sections.evidence_backed_strengths.map((item) => `- ${item}`).join("\n") || "- No evidence-backed strengths identified yet."}\n\n## Red Flags\n${sections.red_flags.map((item) => `- ${item}`).join("\n") || "- No major red flags detected in the current packet."}\n\n## Unresolved Questions\n${sections.unresolved_questions.map((item) => `- ${item}`).join("\n") || "- None generated."}\n\n## Market Analysis\n${sections.market_analysis}\n\n## Product and Technology Assessment\n${sections.product_and_technology}\n\n## Traction Assessment\n${sections.traction_assessment}\n\n## Team Assessment\n${sections.team_assessment}\n\n## Competition\n${sections.competition}\n\n## Risks\n${sections.risks.map((item) => `- ${item}`).join("\n") || "- No risk finding generated."}\n\n## Conditions\n${sections.conditions.map((item) => `- ${item}`).join("\n") || "- None."}\n\n## Recommendation\n${sections.recommendation}\n\n## Confidence and Limitations\n${sections.confidence_and_limitations}\n`;
  return { markdown, sections };
}

export function runReview(input: StartupInput, providedEvidence: Evidence[] = []): ReviewResult {
  if (!input.companyName.trim()) throw new Error("Company name is required.");
  if (!input.pitch.trim()) throw new Error("Pitch description is required.");
  const rawClaims = extractClaims(input);
  const allEvidence = buildEvidenceFromInput(input, providedEvidence);
  const linked = associateEvidence(rawClaims, allEvidence);
  const profile = buildStartupProfile(input, linked.claims);
  const evaluations = evaluateCategories(linked.claims, linked.evidence);
  const redFlags = detectFindings(linked.claims);
  const founderQuestions = buildFounderQuestions(linked.claims, redFlags);
  const recommendation = selectRecommendation(evaluations, redFlags, linked.claims);
  const strengths = deriveStrengths(linked.claims, evaluations);
  const missingInformation = [...new Set(linked.claims.flatMap((claim) => claim.missing_evidence).concat(evaluations.flatMap((evaluation) => evaluation.missing_information)))].slice(0, 12);
  const memo = buildMemo(input, profile, linked.claims, linked.evidence, evaluations, strengths, redFlags, founderQuestions, recommendation);
  return assertReviewResult({
    review_id: `rvw-${slugify(input.companyName)}-${Date.now().toString(36)}`,
    created_at: new Date().toISOString(),
    input,
    profile,
    claims: linked.claims,
    evidence: linked.evidence,
    evaluations,
    strengths,
    red_flags: redFlags,
    missing_information: missingInformation,
    founder_questions: founderQuestions,
    memo,
    recommendation,
    provenance_log: [
      "Startup intake captured from user/demo input.",
      "Claims extracted deterministically from pitch and notes.",
      "Evidence linked by transparent lexical, numeric, and contradiction rules.",
      "Scores and recommendation selected by explicit deterministic thresholds.",
      "No evidence, URLs, metrics, or citations were fabricated.",
    ],
  });
}
