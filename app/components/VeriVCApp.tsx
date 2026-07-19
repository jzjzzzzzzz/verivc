"use client";

import { useEffect, useMemo, useState } from "react";
import { demoCompanies } from "@/lib/demoData";
import { runReview, runReviewWithEvidencePacket } from "@/lib/engine";
import { auditPackageFileName, parseAuditPackageJson, serializeAuditPackage } from "@/lib/auditPackage";
import { getScoringProfile, scoringProfiles, summarizeWeightedRecommendation, type ScoringProfileId } from "@/lib/scoringProfiles";
import { extractPdfTextFromFile } from "@/lib/pdfExtraction";
import { fetchGithubSnapshotFromUrl, formatGithubSnapshot } from "@/lib/githubAnalysis";
import { applyClaimReviewerOverride } from "@/lib/reviewerOverrides";
import { buildPrintableMemoHtml, printableMemoFileName } from "@/lib/memoHtmlExport";
import { compareReviews } from "@/lib/reviewComparison";
import { createSharePayload, parseSharePayload, sharePayloadSummary } from "@/lib/sharePackage";
import { buildPartnerReviewChecklist, type ChecklistStatus } from "@/lib/reviewChecklist";
import { buildMemoCoverageSummary, type MemoCoverageStatus } from "@/lib/memoCoverage";
import { addManualClaim, editClaimMetadata, type AddManualClaimInput, type EditClaimInput } from "@/lib/claimEditor";
import { applyManualEvidenceLink, type ManualEvidenceLinkInput, type ManualEvidenceLinkMode, type ManualEvidenceLinkAction } from "@/lib/evidenceLinker";
import { claimCategories, type CategoryEvaluation, type Claim, type Evidence, type ReviewResult, type StartupInput } from "@/lib/types";

const emptyInput: StartupInput = {
  companyName: "",
  websiteUrl: "",
  githubUrl: "",
  githubSnapshot: "",
  pitch: "",
  sector: "AI / SaaS",
  stage: "Seed",
  investmentThesis: "",
  notes: "",
  pastedEvidence: "",
  deckFileName: "",
  deckText: "",
};

const statusLabels: Record<string, string> = {
  supported: "Supported",
  partially_supported: "Partial",
  contradicted: "Contradicted",
  insufficient_evidence: "Insufficient",
  unverifiable: "Unverifiable",
  not_evaluated: "Queued",
};

const recommendationLabels: Record<string, string> = {
  proceed_to_partner_review: "Proceed to partner review",
  proceed_with_conditions: "Proceed with conditions",
  request_more_information: "Request more information",
  manual_review_required: "Manual review required",
  decline_based_on_current_evidence: "Decline on current evidence",
};

function cls(...names: Array<string | false | undefined>) {
  return names.filter(Boolean).join(" ");
}

function Badge({ tone = "neutral", children }: { tone?: "green" | "amber" | "red" | "blue" | "neutral" | "purple"; children: React.ReactNode }) {
  return <span className={cls("badge", `badge-${tone}`)}>{children}</span>;
}

function statusTone(status: Claim["status"]): "green" | "amber" | "red" | "blue" | "neutral" {
  if (status === "supported") return "green";
  if (status === "partially_supported") return "blue";
  if (status === "contradicted") return "red";
  if (status === "insufficient_evidence") return "amber";
  return "neutral";
}

function recommendationTone(state: string): "green" | "amber" | "red" | "blue" | "neutral" {
  if (state === "proceed_to_partner_review") return "green";
  if (state === "proceed_with_conditions") return "blue";
  if (state === "manual_review_required") return "amber";
  if (state === "decline_based_on_current_evidence") return "red";
  return "neutral";
}

function checklistTone(status: ChecklistStatus): "green" | "amber" | "red" | "blue" | "neutral" {
  if (status === "ready") return "green";
  if (status === "needs_attention") return "blue";
  if (status === "missing") return "amber";
  if (status === "blocked") return "red";
  return "neutral";
}

function memoCoverageTone(status: MemoCoverageStatus): "green" | "amber" | "red" | "blue" | "neutral" {
  if (status === "strong_evidence") return "green";
  if (status === "mixed_evidence") return "blue";
  if (status === "weak_evidence") return "amber";
  if (status === "inference_only") return "neutral";
  return "neutral";
}

function scoreTone(score: number) {
  if (score >= 72) return "score-good";
  if (score >= 52) return "score-mid";
  return "score-low";
}

function evidenceById(evidence: Evidence[]) {
  return new Map(evidence.map((item) => [item.evidence_id, item]));
}

const storageKey = "verivc.reviews.v2";

function downloadText(fileName: string, text: string, type: string) {
  const blob = new Blob([text], { type });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  link.click();
  URL.revokeObjectURL(url);
}

function downloadAuditPackage(review: ReviewResult) {
  downloadText(auditPackageFileName(review), serializeAuditPackage(review), "application/json;charset=utf-8");
}
function profileMemoAddendum(summary: ReturnType<typeof summarizeWeightedRecommendation>) {
  const gaps = summary.must_have_gaps.length
    ? summary.must_have_gaps.map((gap) => `- ${gap.dimension.replaceAll("_", " ")}: ${gap.score}/100 below threshold ${gap.threshold}`).join("\n")
    : "- No must-have gaps below threshold.";
  const positives = summary.top_positive_weighted_dimensions
    .map((item) => `- ${item.dimension.replaceAll("_", " ")}: score ${item.score}, weight ${item.weight}, contribution ${item.contribution}`)
    .join("\n");
  return `\n## Fund Scoring Profile View\nProfile: ${summary.profile_name}\n\n${summary.explanation}\n\n### Top Weighted Positives\n${positives}\n\n### Must-Have Gaps\n${gaps}\n`;
}


function parseStoredReviews(): ReviewResult[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(storageKey);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((item): item is ReviewResult => Boolean(item && typeof item === "object" && "review_id" in item && "recommendation" in item)).slice(0, 12);
  } catch {
    return [];
  }
}

function Dashboard({ onDemo, onNew, onCompareDemos, recent, onOpenReview, onClearReviews, onImportReview }: { onDemo: (index: number) => void; onNew: () => void; onCompareDemos: () => void; recent: ReviewResult[]; onOpenReview: (review: ReviewResult) => void; onClearReviews: () => void; onImportReview: (review: ReviewResult) => void }) {
  return (
    <section className="hero-grid" aria-labelledby="hero-title">
      <div className="hero-card">
        <div className="eyebrow">Hack Nation 2026 · Challenge 2</div>
        <h1 id="hero-title">VeriVC verifies startup claims before confidence becomes consensus.</h1>
        <p className="hero-copy">Most AI investment tools generate opinions. VeriVC verifies the evidence behind them.</p>
        <div className="hero-actions">
          <button className="primary-button" onClick={onNew}>New Review</button>
          <a className="secondary-button" href="#demo-companies">Load deterministic demos</a>
          <button className="secondary-button" onClick={onCompareDemos}>Compare demos</button>
        </div>
        <div className="trust-strip" aria-label="Product principles">
          <span>Evidence before opinion</span>
          <span>No fabricated citations</span>
          <span>Human review required</span>
        </div>
      </div>
      <aside className="signal-panel" aria-label="Workflow summary">
        {[
          ["1", "Extract claims", "Pitch, notes, website/GitHub URLs, optional deck artifact."],
          ["2", "Link evidence", "Support, contradiction, missing, or unverifiable status."],
          ["3", "Explain risk", "Scorecards, red flags, founder questions, memo export."],
        ].map(([num, title, body]) => (
          <div className="signal-step" key={num}>
            <span>{num}</span>
            <div><strong>{title}</strong><p>{body}</p></div>
          </div>
        ))}
      </aside>
      <div id="demo-companies" className="demo-grid">
        {demoCompanies.map((demo, index) => (
          <button className="demo-card" key={demo.id} onClick={() => onDemo(index)}>
            <span className="demo-label">Demo {index + 1}</span>
            <strong>{demo.label}</strong>
            <p>{demo.summary}</p>
          </button>
        ))}
      </div>
      <div className="recent-card">
        <div className="section-heading"><span>Review library</span><small>Persisted in local browser storage</small></div>
        <AuditImportPanel onImportReview={onImportReview} />
        {recent.length === 0 ? <p className="empty-state">No reviews yet. Start with a demo or create a manual review.</p> : (
          <>
            <div className="recent-list">
              {recent.map((review) => (
                <button key={review.review_id} className="recent-row recent-button" onClick={() => onOpenReview(review)}>
                  <span><strong>{review.profile.company_name}</strong><small>{new Date(review.created_at).toLocaleString()} · {review.claims.length} claims · {review.evidence.length} evidence items</small></span>
                  <Badge tone={recommendationTone(review.recommendation.state)}>{recommendationLabels[review.recommendation.state]}</Badge>
                </button>
              ))}
            </div>
            <button className="ghost-button library-clear" onClick={onClearReviews}>Clear local library</button>
          </>
        )}
      </div>
    </section>
  );
}

function AuditImportPanel({ onImportReview }: { onImportReview: (review: ReviewResult) => void }) {
  const [message, setMessage] = useState<{ tone: "green" | "red"; text: string }>();
  const [shareText, setShareText] = useState("");

  function importSharePayload() {
    try {
      const imported = parseSharePayload(shareText);
      onImportReview(imported.review);
      setShareText("");
      setMessage({ tone: "green", text: `Imported ${imported.review.profile.company_name} from a local share payload.` });
    } catch (error) {
      setMessage({ tone: "red", text: error instanceof Error ? error.message : "Unable to import share payload." });
    }
  }

  return (
    <div className="audit-import-panel">
      <div>
        <strong>Import audit package</strong>
        <p>Reopen a VeriVC JSON export or pasted local share payload with claims, evidence, memo, and provenance intact.</p>
      </div>
      <label className="import-button">
        <input
          type="file"
          accept="application/json,.json"
          onChange={async (event) => {
            const file = event.target.files?.[0];
            event.currentTarget.value = "";
            if (!file) return;
            try {
              const imported = parseAuditPackageJson(await file.text());
              onImportReview(imported.review);
              setMessage({ tone: "green", text: `Imported ${imported.review.profile.company_name} from ${imported.schema_version}.` });
            } catch (error) {
              setMessage({ tone: "red", text: error instanceof Error ? error.message : "Unable to import audit package." });
            }
          }}
        />
        Choose JSON
      </label>
      {message ? <Badge tone={message.tone}>{message.text}</Badge> : null}
      <form className="share-import-form" onSubmit={(event) => { event.preventDefault(); importSharePayload(); }}>
        <label>Paste local share payload
          <textarea
            value={shareText}
            onChange={(event) => setShareText(event.target.value)}
            placeholder="verivc-share:v1:..."
            aria-label="Paste VeriVC local share payload"
          />
        </label>
        <div className="share-import-actions">
          <button className="secondary-button" type="submit" disabled={!shareText.trim()}>Import share payload</button>
          {shareText.trim() ? <small>{sharePayloadSummary(shareText.trim())}</small> : <small>Local-only handoff; use a secure channel for sensitive diligence data.</small>}
        </div>
      </form>
    </div>
  );
}

function IntakeForm({ initialInput, onCancel, onRun }: { initialInput?: StartupInput; onCancel: () => void; onRun: (input: StartupInput) => void }) {
  const [input, setInput] = useState<StartupInput>(initialInput ?? emptyInput);
  const [error, setError] = useState("");
  const [pdfStatus, setPdfStatus] = useState<{ tone: "green" | "amber" | "red"; text: string }>();
  const [githubStatus, setGithubStatus] = useState<{ tone: "green" | "amber" | "red"; text: string }>();
  const [isExtractingPdf, setIsExtractingPdf] = useState(false);
  const [isAnalyzingGithub, setIsAnalyzingGithub] = useState(false);
  const set = (key: keyof StartupInput, value: string) => setInput((current) => ({ ...current, [key]: value }));
  async function handlePdfUpload(file: File | undefined) {
    if (!file) return;
    setIsExtractingPdf(true);
    setPdfStatus({ tone: "amber", text: `Extracting text from ${file.name} locally...` });
    setInput((current) => ({ ...current, deckFileName: file.name }));
    try {
      const extracted = await extractPdfTextFromFile(file);
      setInput((current) => ({ ...current, deckFileName: extracted.sanitizedFileName, deckText: extracted.text }));
      setPdfStatus({
        tone: extracted.truncated ? "amber" : "green",
        text: `Extracted ${extracted.processedPages}/${extracted.pageCount} pages and ${extracted.charCount.toLocaleString()} characters. Claims will cite Page N references.`,
      });
    } catch (err) {
      setPdfStatus({ tone: "red", text: err instanceof Error ? err.message : "Unable to extract PDF text locally." });
    } finally {
      setIsExtractingPdf(false);
    }
  }
  async function handleGithubAnalysis() {
    if (!input.githubUrl?.trim()) {
      setGithubStatus({ tone: "red", text: "Enter a GitHub repository URL before analysis." });
      return;
    }
    setIsAnalyzingGithub(true);
    setGithubStatus({ tone: "amber", text: "Fetching public GitHub repository snapshot..." });
    try {
      const snapshot = await fetchGithubSnapshotFromUrl(input.githubUrl);
      const formatted = formatGithubSnapshot(snapshot);
      setInput((current) => ({ ...current, githubUrl: snapshot.htmlUrl, githubSnapshot: formatted }));
      setGithubStatus({ tone: "green", text: `Captured ${snapshot.owner}/${snapshot.repo}: ${snapshot.stars} stars, ${snapshot.forks} forks, README ${snapshot.readme}, license ${snapshot.license}.` });
    } catch (err) {
      setGithubStatus({ tone: "red", text: err instanceof Error ? err.message : "Unable to fetch GitHub snapshot." });
    } finally {
      setIsAnalyzingGithub(false);
    }
  }
  return (
    <section className="intake-shell" aria-labelledby="intake-title">
      <div className="panel-header">
        <div>
          <div className="eyebrow">Startup intake</div>
          <h2 id="intake-title">Create an evidence-preserving review</h2>
        </div>
        <button className="ghost-button" onClick={onCancel}>Back</button>
      </div>
      <form className="intake-form" onSubmit={(event) => {
        event.preventDefault();
        try {
          if (!input.companyName.trim() || !input.pitch.trim()) throw new Error("Company name and pitch description are required.");
          onRun(input);
        } catch (err) {
          setError(err instanceof Error ? err.message : "Unable to start review.");
        }
      }}>
        <div className="form-grid">
          <label>Company name<input value={input.companyName} onChange={(e) => set("companyName", e.target.value)} placeholder="Example: VeriVC" required /></label>
          <label>Sector<input value={input.sector} onChange={(e) => set("sector", e.target.value)} placeholder="AI / Fintech" /></label>
          <label>Stage<select value={input.stage} onChange={(e) => set("stage", e.target.value)}><option>Pre-seed</option><option>Seed</option><option>Series A</option><option>Accelerator</option><option>Competition</option></select></label>
          <label>Company website<input value={input.websiteUrl} onChange={(e) => set("websiteUrl", e.target.value)} placeholder="https://..." /></label>
          <label>GitHub URL<input value={input.githubUrl} onChange={(e) => set("githubUrl", e.target.value)} placeholder="https://github.com/..." /></label>
          <div className="form-action-field"><span>Public GitHub snapshot</span><button type="button" className="secondary-button" disabled={isAnalyzingGithub} onClick={() => void handleGithubAnalysis()}>{isAnalyzingGithub ? "Analyzing..." : "Analyze GitHub"}</button></div>
          <label>Optional pitch deck PDF<input type="file" accept="application/pdf,.pdf" disabled={isExtractingPdf} onChange={(e) => void handlePdfUpload(e.target.files?.[0])} /></label>
        </div>
        <label>Pitch description<textarea className="large" value={input.pitch} onChange={(e) => set("pitch", e.target.value)} placeholder="Paste the founder pitch or application answer." required /></label>
        <label>Pitch deck text or page excerpts<textarea value={input.deckText} onChange={(e) => set("deckText", e.target.value)} placeholder="Optional: paste extracted deck text with page labels, e.g. Page 5: $14.4K MRR across 8 locations." /></label>
        {githubStatus ? <p className={cls("file-note", `file-note-${githubStatus.tone}`)}>{githubStatus.text}</p> : null}
        {input.githubSnapshot?.trim() ? <label>GitHub public snapshot<textarea value={input.githubSnapshot} onChange={(e) => set("githubSnapshot", e.target.value)} placeholder="Public GitHub API snapshot appears here." /></label> : null}
        <label>Pasted evidence and metrics<textarea value={input.pastedEvidence} onChange={(e) => set("pastedEvidence", e.target.value)} placeholder="Paste customer references, Stripe excerpts, GitHub snapshots, market notes, or reviewer observations." /></label>
        <label>Reviewer notes / traction details<textarea value={input.notes} onChange={(e) => set("notes", e.target.value)} placeholder="Add contradictions, caveats, meeting notes, or extra founder claims." /></label>
        <label>Investor thesis or review criteria<textarea value={input.investmentThesis} onChange={(e) => set("investmentThesis", e.target.value)} placeholder="Optional: describe what this fund or judge values." /></label>
        {pdfStatus ? <p className={cls("file-note", `file-note-${pdfStatus.tone}`)}>{pdfStatus.text}</p> : null}
        {input.deckFileName ? <p className="file-note">Captured PDF artifact: <strong>{input.deckFileName}</strong>. {input.deckText?.trim() ? "Deck text is available for page-level claim extraction." : "Paste key deck text above if extraction is unavailable."}</p> : null}
        {error ? <p className="error-note">{error}</p> : null}
        <div className="form-actions"><button type="button" className="secondary-button" onClick={onCancel}>Cancel</button><button type="submit" className="primary-button">Run evidence review</button></div>
      </form>
    </section>
  );
}

function ScoreCard({ evaluation }: { evaluation: CategoryEvaluation }) {
  return (
    <details className="score-card">
      <summary>
        <span>{evaluation.dimension.replaceAll("_", " ")}</span>
        <strong className={scoreTone(evaluation.score)}>{evaluation.score}</strong>
      </summary>
      <div className="score-body">
        <Badge tone={evaluation.confidence === "high" ? "green" : evaluation.confidence === "medium" ? "blue" : "amber"}>{evaluation.confidence} confidence</Badge>
        <p>{evaluation.scoring_explanation}</p>
        {evaluation.supporting_reasons.length ? <ul>{evaluation.supporting_reasons.map((r) => <li key={r}>{r}</li>)}</ul> : null}
        {evaluation.negative_reasons.length ? <ul className="negative-list">{evaluation.negative_reasons.map((r) => <li key={r}>{r}</li>)}</ul> : null}
        {evaluation.missing_information.length ? <p className="muted">Missing: {evaluation.missing_information.join("; ")}</p> : null}
      </div>
    </details>
  );
}

function ClaimExplorer({
  claims,
  evidence,
  onOverrideClaim,
  onAddManualClaim,
  onEditClaim,
}: {
  claims: Claim[];
  evidence: Evidence[];
  onOverrideClaim: (claimId: string, status: Claim["status"], confidence: Claim["confidence"], note: string) => void;
  onAddManualClaim: (input: AddManualClaimInput) => void;
  onEditClaim: (input: EditClaimInput) => void;
}) {
  const byId = useMemo(() => evidenceById(evidence), [evidence]);
  const [filter, setFilter] = useState("all");
  const visible = filter === "all" ? claims : claims.filter((claim) => claim.status === filter);
  return (
    <section className="workspace-section" aria-labelledby="claims-title">
      <div className="section-heading"><span id="claims-title">Claim–evidence explorer</span><small>Every conclusion remains traceable</small></div>
      <ManualClaimForm onAddManualClaim={onAddManualClaim} />
      <div className="filter-row" role="group" aria-label="Filter claims by status">
        {['all', 'supported', 'partially_supported', 'contradicted', 'insufficient_evidence', 'unverifiable'].map((item) => (
          <button key={item} className={cls("chip", filter === item && "chip-active")} onClick={() => setFilter(item)}>{item === 'all' ? 'All' : statusLabels[item]}</button>
        ))}
      </div>
      <div className="claim-list">
        {visible.map((claim) => (
          <details className="claim-card" key={claim.claim_id}>
            <summary>
              <div>
                <span className="claim-id">{claim.claim_id} · {claim.category.replaceAll("_", " ")}</span>
                <strong>{claim.claim_text}</strong>
              </div>
              <Badge tone={statusTone(claim.status)}>{statusLabels[claim.status]}</Badge>
            </summary>
            <div className="claim-detail-grid">
              <div><h4>Source</h4><p>{claim.source_reference}</p><blockquote>{claim.source_excerpt}</blockquote></div>
              <div><h4>Evaluation</h4><p>Materiality: {claim.materiality} · Verifiability: {claim.verifiability} · Confidence: {claim.confidence}</p><p>{claim.reviewer_notes.join(" ")}</p></div>
              <div><h4>Supporting evidence</h4>{claim.supporting_evidence_ids.length ? claim.supporting_evidence_ids.map((id) => <EvidenceMini key={id} evidence={byId.get(id)} />) : <p className="muted">No support linked.</p>}</div>
              <div><h4>Contradicting evidence</h4>{claim.contradicting_evidence_ids.length ? claim.contradicting_evidence_ids.map((id) => <EvidenceMini key={id} evidence={byId.get(id)} />) : <p className="muted">No contradiction linked.</p>}</div>
              <div className="full-span"><h4>Missing evidence</h4>{claim.missing_evidence.length ? <ul>{claim.missing_evidence.map((item) => <li key={item}>{item}</li>)}</ul> : <p className="muted">No major missing evidence for this claim.</p>}</div>
              {claim.reviewer_overrides?.length ? <div className="full-span override-history"><h4>Reviewer override history</h4>{claim.reviewer_overrides.map((override) => <p key={override.override_id}><strong>{override.updated_at}</strong>: {override.previous_status}/{override.previous_confidence} → {override.new_status}/{override.new_confidence}. {override.note}</p>)}</div> : null}
              <ClaimMetadataEditForm claim={claim} onEditClaim={onEditClaim} />
              <ClaimOverrideForm claim={claim} onOverrideClaim={onOverrideClaim} />
            </div>
          </details>
        ))}
      </div>
    </section>
  );
}

function ManualClaimForm({ onAddManualClaim }: { onAddManualClaim: (input: AddManualClaimInput) => void }) {
  const [open, setOpen] = useState(false);
  const [category, setCategory] = useState<Claim["category"]>("legal");
  const [claimText, setClaimText] = useState("");
  const [sourceExcerpt, setSourceExcerpt] = useState("");
  const [materiality, setMateriality] = useState<Claim["materiality"]>("high");
  const [verifiability, setVerifiability] = useState<Claim["verifiability"]>("needs_primary_docs");
  const [status, setStatus] = useState<Claim["status"]>("insufficient_evidence");
  const [confidence, setConfidence] = useState<Claim["confidence"]>("low");
  const [note, setNote] = useState("");
  const [message, setMessage] = useState<{ tone: "green" | "amber"; text: string }>();
  return (
    <details className="manual-claim-editor" open={open} onToggle={(event) => setOpen(event.currentTarget.open)}>
      <summary><strong>Add reviewer claim</strong><Badge tone="purple">Manual editor</Badge></summary>
      <form onSubmit={(event) => {
        event.preventDefault();
        try {
          onAddManualClaim({
            category,
            claim_text: claimText,
            source_excerpt: sourceExcerpt,
            materiality,
            verifiability,
            status,
            confidence,
            reviewer_note: note,
          });
          setClaimText("");
          setSourceExcerpt("");
          setNote("");
          setMessage({ tone: "green", text: "Manual claim added to audit trail." });
        } catch (error) {
          setMessage({ tone: "amber", text: error instanceof Error ? error.message : "Unable to add manual claim." });
        }
      }}>
        <div className="claim-editor-grid">
          <label>Category<select value={category} onChange={(event) => setCategory(event.target.value as Claim["category"])}>{claimCategories.map((item) => <option key={item} value={item}>{item}</option>)}</select></label>
          <label>Materiality<select value={materiality} onChange={(event) => setMateriality(event.target.value as Claim["materiality"])}><option value="critical">critical</option><option value="high">high</option><option value="medium">medium</option><option value="low">low</option></select></label>
          <label>Verifiability<select value={verifiability} onChange={(event) => setVerifiability(event.target.value as Claim["verifiability"])}><option value="direct">direct</option><option value="indirect">indirect</option><option value="needs_primary_docs">needs_primary_docs</option><option value="unverifiable">unverifiable</option></select></label>
          <label>Status<select value={status} onChange={(event) => setStatus(event.target.value as Claim["status"])}>{Object.entries(statusLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
          <label>Confidence<select value={confidence} onChange={(event) => setConfidence(event.target.value as Claim["confidence"])}><option value="high">high</option><option value="medium">medium</option><option value="low">low</option></select></label>
          <label className="full-span">Claim text<textarea value={claimText} onChange={(event) => setClaimText(event.target.value)} placeholder="Example: Company processes regulated customer data and needs counsel review before close." /></label>
          <label className="full-span">Source excerpt<textarea value={sourceExcerpt} onChange={(event) => setSourceExcerpt(event.target.value)} placeholder="Paste reviewer note, founder quote, data-room excerpt, or meeting note that created this claim." /></label>
          <label className="full-span">Reviewer note<textarea value={note} onChange={(event) => setNote(event.target.value)} placeholder="Why are you adding this claim, and what evidence is still required?" /></label>
        </div>
        <div className="form-actions"><button className="secondary-button" type="submit">Add claim to audit trail</button>{message ? <Badge tone={message.tone}>{message.text}</Badge> : null}</div>
      </form>
    </details>
  );
}

function ClaimMetadataEditForm({ claim, onEditClaim }: { claim: Claim; onEditClaim: (input: EditClaimInput) => void }) {
  const [claimText, setClaimText] = useState(claim.claim_text);
  const [category, setCategory] = useState<Claim["category"]>(claim.category);
  const [materiality, setMateriality] = useState<Claim["materiality"]>(claim.materiality);
  const [verifiability, setVerifiability] = useState<Claim["verifiability"]>(claim.verifiability);
  const [note, setNote] = useState("");
  const [message, setMessage] = useState("");
  return (
    <details className="claim-metadata-editor full-span">
      <summary><strong>Edit claim metadata</strong><small>Preserves existing evidence links and writes reviewer edit log</small></summary>
      <form onSubmit={(event) => {
        event.preventDefault();
        try {
          onEditClaim({ claim_id: claim.claim_id, claim_text: claimText, category, materiality, verifiability, reviewer_note: note });
          setMessage("Claim metadata edit saved.");
          setNote("");
        } catch (error) {
          setMessage(error instanceof Error ? error.message : "Unable to edit claim.");
        }
      }}>
        <div className="claim-editor-grid">
          <label>Category<select value={category} onChange={(event) => setCategory(event.target.value as Claim["category"])}>{claimCategories.map((item) => <option key={item} value={item}>{item}</option>)}</select></label>
          <label>Materiality<select value={materiality} onChange={(event) => setMateriality(event.target.value as Claim["materiality"])}><option value="critical">critical</option><option value="high">high</option><option value="medium">medium</option><option value="low">low</option></select></label>
          <label>Verifiability<select value={verifiability} onChange={(event) => setVerifiability(event.target.value as Claim["verifiability"])}><option value="direct">direct</option><option value="indirect">indirect</option><option value="needs_primary_docs">needs_primary_docs</option><option value="unverifiable">unverifiable</option></select></label>
          <label className="full-span">Claim text<textarea value={claimText} onChange={(event) => setClaimText(event.target.value)} /></label>
          <label className="full-span">Reviewer reason<textarea value={note} onChange={(event) => setNote(event.target.value)} placeholder="Explain why this claim wording or metadata changed." /></label>
        </div>
        <div className="form-actions"><button className="secondary-button" type="submit">Save claim edit</button>{message ? <Badge tone={message.startsWith("Claim") ? "green" : "amber"}>{message}</Badge> : null}</div>
      </form>
    </details>
  );
}

function ClaimOverrideForm({ claim, onOverrideClaim }: { claim: Claim; onOverrideClaim: (claimId: string, status: Claim["status"], confidence: Claim["confidence"], note: string) => void }) {
  const [status, setStatus] = useState<Claim["status"]>(claim.status);
  const [confidence, setConfidence] = useState<Claim["confidence"]>(claim.confidence);
  const [note, setNote] = useState("");
  const [message, setMessage] = useState("");
  return (
    <form className="claim-override-form full-span" onSubmit={(event) => {
      event.preventDefault();
      if (note.trim().length < 8) {
        setMessage("Add a reviewer reason with at least 8 characters.");
        return;
      }
      onOverrideClaim(claim.claim_id, status, confidence, note.trim());
      setMessage("Reviewer override saved to audit trail.");
      setNote("");
    }}>
      <div className="section-heading compact-heading"><span>Reviewer override</span><small>Human edits are preserved in memo and audit JSON</small></div>
      <div className="claim-override-grid">
        <label>Status<select value={status} onChange={(event) => setStatus(event.target.value as Claim["status"])}>{Object.entries(statusLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
        <label>Confidence<select value={confidence} onChange={(event) => setConfidence(event.target.value as Claim["confidence"])}><option value="high">high</option><option value="medium">medium</option><option value="low">low</option></select></label>
        <label className="full-span">Override reason<textarea value={note} onChange={(event) => setNote(event.target.value)} placeholder="Example: Partner reviewed updated Stripe export; claim is partially supported pending signed customer list." /></label>
      </div>
      <div className="form-actions"><button className="secondary-button" type="submit">Save reviewer override</button>{message ? <Badge tone={message.startsWith("Add") ? "amber" : "green"}>{message}</Badge> : null}</div>
    </form>
  );
}

function EvidenceMini({ evidence }: { evidence?: Evidence }) {
  if (!evidence) return <p className="muted">Evidence record missing.</p>;
  return <div className="evidence-mini"><strong>{evidence.evidence_id}: {evidence.title}</strong><p>{evidence.excerpt}</p><small>{evidence.source_type} · reliability {evidence.reliability_level}</small></div>;
}

function EvidenceVault({ evidence, claims, onAddEvidence, onLinkEvidence }: { evidence: Evidence[]; claims: Claim[]; onAddEvidence: (evidence: Evidence) => void; onLinkEvidence: (input: ManualEvidenceLinkInput) => void }) {
  return (
    <section className="workspace-section" aria-labelledby="evidence-title">
      <div className="section-heading"><span id="evidence-title">Evidence vault</span><small>Provenance is preserved; unavailable evidence is explicit</small></div>
      <ManualEvidenceForm onAddEvidence={onAddEvidence} nextIndex={evidence.length + 1} />
      <div className="evidence-grid">
        {evidence.map((item) => (
          <article className="evidence-card" key={item.evidence_id}>
            <Badge tone={item.reliability_level === "primary" || item.reliability_level === "high" ? "green" : item.reliability_level === "medium" ? "blue" : "neutral"}>{item.evidence_id}</Badge>
            <h3>{item.title}</h3>
            <p>{item.excerpt}</p>
            {item.url_or_file ? <small>{item.url_or_file}</small> : null}
            <small>Supports {item.supports_claim_ids.length} · Contradicts {item.contradicts_claim_ids.length}</small>
            {item.limitations.length ? <ul>{item.limitations.map((limit) => <li key={limit}>{limit}</li>)}</ul> : null}
            <ManualEvidenceLinkForm evidence={item} claims={claims} onLinkEvidence={onLinkEvidence} />
          </article>
        ))}
      </div>
    </section>
  );
}

function ManualEvidenceLinkForm({ evidence, claims, onLinkEvidence }: { evidence: Evidence; claims: Claim[]; onLinkEvidence: (input: ManualEvidenceLinkInput) => void }) {
  const [claimId, setClaimId] = useState(claims[0]?.claim_id ?? "");
  const [mode, setMode] = useState<ManualEvidenceLinkMode>("supports");
  const [action, setAction] = useState<ManualEvidenceLinkAction>("link");
  const [note, setNote] = useState("");
  const [message, setMessage] = useState("");
  const selectedClaim = claims.find((claim) => claim.claim_id === claimId);
  return (
    <details className="manual-evidence-linker">
      <summary><strong>Manual claim link</strong><Badge tone="purple">Traceable</Badge></summary>
      <form onSubmit={(event) => {
        event.preventDefault();
        try {
          onLinkEvidence({ evidence_id: evidence.evidence_id, claim_id: claimId, mode, action, reviewer_note: note });
          setMessage(`Evidence ${action === "link" ? "linked" : "unlinked"} as ${mode}.`);
          setNote("");
        } catch (error) {
          setMessage(error instanceof Error ? error.message : "Unable to update evidence link.");
        }
      }}>
        <label>Claim<select value={claimId} onChange={(event) => setClaimId(event.target.value)}>{claims.map((claim) => <option key={claim.claim_id} value={claim.claim_id}>{claim.claim_id} · {claim.claim_text.slice(0, 88)}</option>)}</select></label>
        {selectedClaim ? <small className="muted">Current claim status: {selectedClaim.status} · confidence {selectedClaim.confidence}</small> : null}
        <div className="linker-row">
          <label>Relationship<select value={mode} onChange={(event) => setMode(event.target.value as ManualEvidenceLinkMode)}><option value="supports">supports</option><option value="contradicts">contradicts</option></select></label>
          <label>Action<select value={action} onChange={(event) => setAction(event.target.value as ManualEvidenceLinkAction)}><option value="link">link</option><option value="unlink">unlink</option></select></label>
        </div>
        <label>Reviewer note<textarea value={note} onChange={(event) => setNote(event.target.value)} placeholder="Why does this evidence support or contradict the selected claim?" /></label>
        <div className="form-actions"><button className="secondary-button" type="submit" disabled={!claimId}>Save manual link</button>{message ? <Badge tone={message.startsWith("Evidence") ? "green" : "amber"}>{message}</Badge> : null}</div>
      </form>
    </details>
  );
}

function ManualEvidenceForm({ onAddEvidence, nextIndex }: { onAddEvidence: (evidence: Evidence) => void; nextIndex: number }) {
  const [title, setTitle] = useState("");
  const [excerpt, setExcerpt] = useState("");
  const [url, setUrl] = useState("");
  const [sourceType, setSourceType] = useState<Evidence["source_type"]>("manual_evidence");
  const [reliability, setReliability] = useState<Evidence["reliability_level"]>("medium");
  return (
    <form className="manual-evidence-form" onSubmit={(event) => {
      event.preventDefault();
      if (!title.trim() || !excerpt.trim()) return;
      onAddEvidence({
        evidence_id: `EV-ADD-${Date.now().toString(36)}-${String(nextIndex).padStart(2, "0")}`,
        source_type: sourceType,
        title: title.trim(),
        url_or_file: url.trim() || undefined,
        excerpt: excerpt.trim(),
        captured_at: new Date().toISOString(),
        reliability_level: reliability,
        relevance: "high",
        supports_claim_ids: [],
        contradicts_claim_ids: [],
        limitations: ["Reviewer-added evidence after initial analysis; verify source authenticity before relying on it."],
      });
      setTitle("");
      setExcerpt("");
      setUrl("");
    }}>
      <div className="section-heading"><span>Add evidence and rerun</span><small>Manual evidence becomes part of the audit graph</small></div>
      <div className="manual-evidence-grid">
        <label>Title<input value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Stripe export, customer call, GitHub snapshot..." /></label>
        <label>Source type<select value={sourceType} onChange={(event) => setSourceType(event.target.value as Evidence["source_type"])}><option value="manual_evidence">manual_evidence</option><option value="financial_document">financial_document</option><option value="customer_reference">customer_reference</option><option value="github">github</option><option value="website">website</option><option value="public_record">public_record</option><option value="deck">deck</option><option value="founder_note">founder_note</option></select></label>
        <label>Reliability<select value={reliability} onChange={(event) => setReliability(event.target.value as Evidence["reliability_level"])}><option value="primary">primary</option><option value="high">high</option><option value="medium">medium</option><option value="low">low</option><option value="unknown">unknown</option></select></label>
        <label className="full-span">URL or file reference<input value={url} onChange={(event) => setUrl(event.target.value)} placeholder="Optional source locator" /></label>
        <label className="full-span">Excerpt<textarea value={excerpt} onChange={(event) => setExcerpt(event.target.value)} placeholder="Paste the exact evidence excerpt. VeriVC will relink claims and update scores." /></label>
      </div>
      <button className="primary-button" type="submit">Add evidence + rerun analysis</button>
    </form>
  );
}

function MemoPanel({ review, weightedSummary }: { review: ReviewResult; weightedSummary: ReturnType<typeof summarizeWeightedRecommendation> }) {
  const [copied, setCopied] = useState<"memo" | "share" | "error">();
  const coverage = useMemo(() => buildMemoCoverageSummary(review), [review]);
  const downloadMemo = () => {
    downloadText(`${review.profile.company_name.replace(/[^a-z0-9]+/gi, "-").toLowerCase()}-verivc-memo.md`, review.memo.markdown + profileMemoAddendum(weightedSummary), "text/markdown;charset=utf-8");
  };
  const downloadPrintableHtml = () => {
    downloadText(printableMemoFileName(review), buildPrintableMemoHtml(review, weightedSummary), "text/html;charset=utf-8");
  };
  const copySharePayload = async () => {
    try {
      await navigator.clipboard.writeText(createSharePayload(review));
      setCopied("share");
    } catch {
      setCopied("error");
    }
  };
  return (
    <section className="workspace-section" aria-labelledby="memo-title">
      <div className="section-heading"><span id="memo-title">Investment memo</span><small>Markdown and print-ready HTML exports include selected fund scoring profile</small></div>
      <div className="memo-actions">
        <button className="secondary-button" onClick={async () => { await navigator.clipboard.writeText(review.memo.markdown + profileMemoAddendum(weightedSummary)); setCopied("memo"); }}>Copy memo</button>
        <button className="secondary-button" onClick={copySharePayload}>Copy share payload</button>
        <button className="secondary-button" onClick={() => downloadAuditPackage(review)}>Export audit JSON</button>
        <button className="secondary-button" onClick={downloadPrintableHtml}>Download HTML</button>
        <button className="primary-button" onClick={downloadMemo}>Download Markdown</button>
        {copied === "memo" ? <Badge tone="green">Memo copied</Badge> : null}
        {copied === "share" ? <Badge tone="green">Share payload copied</Badge> : null}
        {copied === "error" ? <Badge tone="red">Clipboard unavailable</Badge> : null}
      </div>
      <p className="file-note">Local share payloads contain the full audit package as encoded text. They are not encrypted or cloud-hosted.</p>
      <MemoCoveragePanel coverage={coverage} />
      <pre className="memo-box">{review.memo.markdown + profileMemoAddendum(weightedSummary)}</pre>
    </section>
  );
}

function MemoCoveragePanel({ coverage }: { coverage: ReturnType<typeof buildMemoCoverageSummary> }) {
  return (
    <section className="memo-coverage-panel" aria-labelledby="memo-coverage-title">
      <div className="section-heading compact-heading">
        <div>
          <span id="memo-coverage-title">Memo evidence coverage</span>
          <small>Section-level indicators show which memo conclusions are evidence-backed versus inference-heavy</small>
        </div>
        <Badge tone={coverage.average_coverage_score >= 72 ? "green" : coverage.average_coverage_score >= 46 ? "blue" : "amber"}>{coverage.average_coverage_score}/100 avg</Badge>
      </div>
      <p>{coverage.summary}</p>
      <div className="memo-coverage-counts">
        <span><strong>{coverage.strong_sections}</strong> strong</span>
        <span><strong>{coverage.mixed_sections}</strong> mixed</span>
        <span><strong>{coverage.weak_sections}</strong> weak</span>
        <span><strong>{coverage.inference_only_sections}</strong> inference</span>
      </div>
      <div className="memo-coverage-grid">
        {coverage.sections.map((section) => (
          <details className={cls("memo-coverage-card", `memo-coverage-${section.status}`)} key={section.section_key}>
            <summary>
              <div>
                <strong>{section.title}</strong>
                <small>{section.coverage_score}/100 · {section.confidence} confidence</small>
              </div>
              <Badge tone={memoCoverageTone(section.status)}>{section.status.replaceAll("_", " ")}</Badge>
            </summary>
            <div className="memo-coverage-detail">
              <p>{section.explanation}</p>
              <small>Claims: {section.related_claim_ids.join(", ") || "none"} · Evidence: {section.evidence_ids.join(", ") || "none"}</small>
              {section.contradiction_claim_ids.length ? <small>Contradictions: {section.contradiction_claim_ids.join(", ")}</small> : null}
              {section.unsupported_claim_ids.length ? <small>Unsupported: {section.unsupported_claim_ids.join(", ")}</small> : null}
              {section.missing_information.length ? <ul>{section.missing_information.slice(0, 3).map((item) => <li key={item}>{item}</li>)}</ul> : null}
            </div>
          </details>
        ))}
      </div>
    </section>
  );
}

function ReviewWorkspace({
  review,
  onBack,
  onNew,
  onAddEvidence,
  onOverrideClaim,
  onAddManualClaim,
  onEditClaim,
  onLinkEvidence,
}: {
  review: ReviewResult;
  onBack: () => void;
  onNew: () => void;
  onAddEvidence: (evidence: Evidence) => void;
  onOverrideClaim: (claimId: string, status: Claim["status"], confidence: Claim["confidence"], note: string) => void;
  onAddManualClaim: (input: AddManualClaimInput) => void;
  onEditClaim: (input: EditClaimInput) => void;
  onLinkEvidence: (input: ManualEvidenceLinkInput) => void;
}) {
  const [tab, setTab] = useState<"overview" | "claims" | "evidence" | "memo">("overview");
  const [profileId, setProfileId] = useState<ScoringProfileId>("balanced");
  const scoringProfile = getScoringProfile(profileId);
  const weightedSummary = summarizeWeightedRecommendation(review, scoringProfile);
  const recTone = recommendationTone(review.recommendation.state);
  return (
    <section className="workspace" aria-labelledby="workspace-title">
      <div className="workspace-top">
        <div><div className="eyebrow">Review workspace</div><h2 id="workspace-title">{review.profile.company_name}</h2><p>{review.profile.tagline}</p></div>
        <div className="workspace-actions"><button className="ghost-button" onClick={onBack}>Dashboard</button><button className="secondary-button" onClick={() => downloadAuditPackage(review)}>Export audit JSON</button><button className="secondary-button" onClick={onNew}>New Review</button></div>
      </div>
      <div className="decision-band">
        <div className="readiness"><span>Readiness score</span><strong>{weightedSummary.weighted_readiness_score}</strong><small>/100 weighted</small></div>
        <div><Badge tone={recTone}>{recommendationLabels[review.recommendation.state]}</Badge><p>{weightedSummary.explanation} Base recommendation remains {review.recommendation.state}.</p></div>
        <div><Badge tone={review.recommendation.confidence === "high" ? "green" : review.recommendation.confidence === "medium" ? "blue" : "amber"}>{review.recommendation.confidence} confidence</Badge><p>{review.recommendation.human_review_note}</p></div>
      </div>
      <ScoringProfilePanel profileId={profileId} onProfileChange={setProfileId} summary={weightedSummary} />
      <nav className="tabs" aria-label="Review sections">
        {[
          ["overview", "Overview"], ["claims", "Claims"], ["evidence", "Evidence"], ["memo", "Memo"],
        ].map(([id, label]) => <button key={id} className={cls(tab === id && "tab-active")} onClick={() => setTab(id as typeof tab)}>{label}</button>)}
      </nav>
      {tab === "overview" ? <Overview review={review} /> : null}
      {tab === "claims" ? <ClaimExplorer claims={review.claims} evidence={review.evidence} onOverrideClaim={onOverrideClaim} onAddManualClaim={onAddManualClaim} onEditClaim={onEditClaim} /> : null}
      {tab === "evidence" ? <EvidenceVault evidence={review.evidence} claims={review.claims} onAddEvidence={onAddEvidence} onLinkEvidence={onLinkEvidence} /> : null}
      {tab === "memo" ? <MemoPanel review={review} weightedSummary={weightedSummary} /> : null}
    </section>
  );
}

function ScoringProfilePanel({
  profileId,
  onProfileChange,
  summary,
}: {
  profileId: ScoringProfileId;
  onProfileChange: (id: ScoringProfileId) => void;
  summary: ReturnType<typeof summarizeWeightedRecommendation>;
}) {
  const selected = scoringProfiles.find((profile) => profile.id === profileId) ?? scoringProfiles[0];
  return (
    <section className="profile-panel" aria-labelledby="profile-title">
      <div>
        <div className="section-heading compact-heading"><span id="profile-title">Fund scoring profile</span><small>Weights alter readiness score, not the underlying evidence graph</small></div>
        <label className="profile-select">Profile<select value={profileId} onChange={(event) => onProfileChange(event.target.value as ScoringProfileId)}>{scoringProfiles.map((profile) => <option key={profile.id} value={profile.id}>{profile.name}</option>)}</select></label>
        <p>{selected.description}</p>
      </div>
      <div className="profile-score-card">
        <span>Weighted delta</span>
        <strong className={summary.delta >= 0 ? "score-good" : "score-low"}>{summary.delta >= 0 ? "+" : ""}{summary.delta}</strong>
        <small>Base {summary.base_readiness_score}/100 → weighted {summary.weighted_readiness_score}/100</small>
      </div>
      <div className="profile-contributions">
        <strong>Top weighted positives</strong>
        {summary.top_positive_weighted_dimensions.map((item) => <span key={item.dimension}>{item.dimension.replaceAll("_", " ")} · {item.score} × {item.weight}</span>)}
      </div>
      <div className="profile-contributions negative-profile">
        <strong>Must-have gaps</strong>
        {summary.must_have_gaps.length ? summary.must_have_gaps.map((gap) => <span key={gap.dimension}>{gap.dimension.replaceAll("_", " ")} below {gap.threshold}: {gap.score}</span>) : <span>No must-have gaps below threshold.</span>}
      </div>
    </section>
  );
}

function ComparisonWorkspace({ reviews, onBack, onOpenReview }: { reviews: [ReviewResult, ReviewResult]; onBack: () => void; onOpenReview: (review: ReviewResult) => void }) {
  const comparison = useMemo(() => compareReviews(reviews[0], reviews[1]), [reviews]);
  const companies = [comparison.left, comparison.right];
  return (
    <section className="workspace comparison-workspace" aria-labelledby="comparison-title">
      <div className="workspace-top">
        <div><div className="eyebrow">Demo comparison</div><h2 id="comparison-title">Evidence beats polish</h2><p>{comparison.demo_takeaway}</p></div>
        <div className="workspace-actions"><button className="ghost-button" onClick={onBack}>Dashboard</button>{reviews.map((review) => <button key={review.review_id} className="secondary-button" onClick={() => onOpenReview(review)}>Open {review.profile.company_name}</button>)}</div>
      </div>
      <section className="comparison-hero">
        <div><span>Stronger evidence case</span><strong>{comparison.stronger_evidence_company}</strong><p>VeriVC compares traceability, contradictions, red flags, and evidence completeness rather than pitch polish.</p></div>
      </section>
      <div className="comparison-grid">
        {companies.map((company, index) => (
          <article className="comparison-card" key={company.company_name}>
            <span className="demo-label">Demo {index + 1}</span>
            <h3>{company.company_name}</h3>
            <Badge tone={recommendationTone(company.recommendation)}>{recommendationLabels[company.recommendation] ?? company.recommendation}</Badge>
            <div className="comparison-metrics">
              <div><span>Readiness</span><strong>{company.readiness_score}</strong></div>
              <div><span>Evidence</span><strong>{company.evidence_count}</strong></div>
              <div><span>Contradictions</span><strong className={company.contradicted_claims ? "score-low" : "score-good"}>{company.contradicted_claims}</strong></div>
              <div><span>Severe flags</span><strong className={company.high_or_critical_red_flags ? "score-low" : "score-good"}>{company.high_or_critical_red_flags}</strong></div>
            </div>
            <h4>Strongest dimensions</h4>
            <ul>{company.strongest_dimensions.map((item) => <li key={item.dimension}>{item.dimension.replaceAll("_", " ")} · {item.score}</li>)}</ul>
            <h4>Weakest dimensions</h4>
            <ul>{company.weakest_dimensions.map((item) => <li key={item.dimension}>{item.dimension.replaceAll("_", " ")} · {item.score}</li>)}</ul>
          </article>
        ))}
      </div>
      <section className="workspace-section">
        <div className="section-heading"><span>Head-to-head diligence signals</span><small>Visible comparison rules, no fake precision</small></div>
        <div className="comparison-table-wrap"><table className="comparison-table"><thead><tr><th>Signal</th><th>{comparison.left.company_name}</th><th>{comparison.right.company_name}</th><th>Interpretation</th></tr></thead><tbody>{comparison.rows.map((row) => <tr key={row.label}><td>{row.label}</td><td className={row.stronger === "left" ? "winner-cell" : ""}>{row.left}</td><td className={row.stronger === "right" ? "winner-cell" : ""}>{row.right}</td><td>{row.interpretation}</td></tr>)}</tbody></table></div>
      </section>
    </section>
  );
}

function Overview({ review }: { review: ReviewResult }) {
  const checklist = useMemo(() => buildPartnerReviewChecklist(review), [review]);
  return (
    <div className="overview-grid">
      <PartnerChecklistPanel checklist={checklist} />
      <section className="workspace-section span-8"><div className="section-heading"><span>Category evaluations</span><small>Rule-based scoring, no fake precision</small></div><div className="score-grid">{review.evaluations.map((evaluation) => <ScoreCard key={evaluation.dimension} evaluation={evaluation} />)}</div></section>
      <aside className="workspace-section span-4"><div className="section-heading"><span>Top red flags</span><small>{review.red_flags.length} detected</small></div>{review.red_flags.length ? review.red_flags.slice(0, 5).map((finding) => <details className="finding-card" key={finding.finding_id}><summary><Badge tone={finding.severity === "high" || finding.severity === "critical" ? "red" : "amber"}>{finding.severity}</Badge><strong>{finding.title}</strong></summary><p>{finding.explanation}</p><p className="muted">Claims: {finding.related_claim_ids.join(", ") || "none"} · Evidence: {finding.evidence_ids.join(", ") || "none"}</p></details>) : <p className="empty-state">No major contradictions detected.</p>}</aside>
      <section className="workspace-section span-6"><div className="section-heading"><span>Evidence-backed strengths</span><small>Only linked or score-derived items</small></div>{review.strengths.length ? <ul className="clean-list">{review.strengths.map((item) => <li key={item}>{item}</li>)}</ul> : <p className="empty-state">No strong evidence-backed strengths yet.</p>}</section>
      <section className="workspace-section span-6"><div className="section-heading"><span>Missing information</span><small>Confidence reducers</small></div>{review.missing_information.length ? <ul className="clean-list">{review.missing_information.slice(0, 8).map((item) => <li key={item}>{item}</li>)}</ul> : <p className="empty-state">No major missing information detected.</p>}</section>
      <section className="workspace-section span-12"><div className="section-heading"><span>Founder follow-up questions</span><small>Prioritized by unresolved findings</small></div><div className="questions-grid">{review.founder_questions.map((q) => <article className="question-card" key={q.question_id}><Badge tone={q.priority === "critical" || q.priority === "high" ? "red" : "blue"}>{q.group}</Badge><h3>{q.question}</h3><p>{q.rationale}</p><small>{q.related_claim_ids.join(", ") || "General diligence"}</small></article>)}</div></section>
    </div>
  );
}

function PartnerChecklistPanel({ checklist }: { checklist: ReturnType<typeof buildPartnerReviewChecklist> }) {
  return (
    <section className="workspace-section span-12 checklist-panel" aria-labelledby="checklist-title">
      <div className="section-heading">
        <div>
          <span id="checklist-title">Partner review checklist</span>
          <small>Deterministic readiness gate for evidence handoff, not an investment authorization</small>
        </div>
        <Badge tone={checklistTone(checklist.overall_status)}>{checklist.overall_status.replaceAll("_", " ")}</Badge>
      </div>
      <div className="checklist-summary">
        <div className="checklist-score"><span>Completion</span><strong>{checklist.completion_score}</strong><small>/100 checklist-weighted</small></div>
        <p>{checklist.summary}</p>
        <div className="checklist-counts" aria-label="Checklist status counts">
          <span><strong>{checklist.ready_count}</strong> ready</span>
          <span><strong>{checklist.needs_attention_count}</strong> attention</span>
          <span><strong>{checklist.missing_count}</strong> missing</span>
          <span><strong>{checklist.blocked_count}</strong> blocked</span>
        </div>
      </div>
      <div className="checklist-grid">
        {checklist.items.map((item) => (
          <details className={cls("checklist-item", `checklist-${item.status}`)} key={item.item_id}>
            <summary>
              <div>
                <span className="claim-id">{item.group} · {item.priority}</span>
                <strong>{item.label}</strong>
              </div>
              <Badge tone={checklistTone(item.status)}>{item.status.replaceAll("_", " ")}</Badge>
            </summary>
            <div className="checklist-detail">
              <p>{item.explanation}</p>
              <p><strong>Next action:</strong> {item.next_action}</p>
              <small>Claims: {item.claim_ids.join(", ") || "none"} · Evidence: {item.evidence_ids.join(", ") || "none"}</small>
            </div>
          </details>
        ))}
      </div>
    </section>
  );
}

export default function VeriVCApp() {
  const [recent, setRecent] = useState<ReviewResult[]>(() => parseStoredReviews());
  const [review, setReview] = useState<ReviewResult | undefined>(() => parseStoredReviews()[0]);
  const [mode, setMode] = useState<"dashboard" | "intake" | "review" | "compare">(() => (parseStoredReviews()[0] ? "review" : "dashboard"));
  const [draft, setDraft] = useState<StartupInput | undefined>();
  const [comparisonReviews, setComparisonReviews] = useState<[ReviewResult, ReviewResult] | undefined>();

  useEffect(() => {
    window.localStorage.setItem(storageKey, JSON.stringify(recent.slice(0, 12)));
  }, [recent]);

  const saveReview = (result: ReviewResult) => {
    setReview(result);
    setRecent((items) => [result, ...items.filter((item) => item.review_id !== result.review_id)].slice(0, 12));
    setMode("review");
  };

  const run = (input: StartupInput, evidence = [] as Evidence[]) => {
    const result = runReview(input, evidence);
    saveReview(result);
  };

  const compareDemoReviews = () => {
    const demoReviews = demoCompanies.map((demo) => runReview(demo.input, demo.evidence)) as [ReviewResult, ReviewResult];
    setComparisonReviews(demoReviews);
    setRecent((items) => [...demoReviews, ...items.filter((item) => !demoReviews.some((demo) => demo.review_id === item.review_id))].slice(0, 12));
    setMode("compare");
  };

  const addEvidenceToCurrentReview = (evidence: Evidence) => {
    if (!review) return;
    saveReview(runReviewWithEvidencePacket(review.input, [...review.evidence, evidence]));
  };

  const overrideClaimInCurrentReview = (claimId: string, status: Claim["status"], confidence: Claim["confidence"], note: string) => {
    if (!review) return;
    saveReview(applyClaimReviewerOverride(review, { claimId, status, confidence, note }));
  };

  const addManualClaimToCurrentReview = (input: AddManualClaimInput) => {
    if (!review) return;
    saveReview(addManualClaim(review, input));
  };

  const editClaimInCurrentReview = (input: EditClaimInput) => {
    if (!review) return;
    saveReview(editClaimMetadata(review, input));
  };

  const linkEvidenceInCurrentReview = (input: ManualEvidenceLinkInput) => {
    if (!review) return;
    saveReview(applyManualEvidenceLink(review, input));
  };

  return (
    <main className="app-shell">
      <header className="topbar"><button className="brand" onClick={() => setMode("dashboard")} aria-label="Go to VeriVC dashboard"><span>V</span><strong>VeriVC</strong></button><div className="topbar-note">Evidence-driven AI startup due-diligence copilot</div></header>
      {mode === "dashboard" ? <Dashboard recent={recent} onOpenReview={(item) => { setReview(item); setMode("review"); }} onClearReviews={() => { setRecent([]); setReview(undefined); }} onImportReview={(item) => saveReview(item)} onNew={() => { setDraft(undefined); setMode("intake"); }} onCompareDemos={compareDemoReviews} onDemo={(index) => { const demo = demoCompanies[index]; setDraft(demo.input); run(demo.input, demo.evidence); }} /> : null}
      {mode === "intake" ? <IntakeForm initialInput={draft} onCancel={() => setMode("dashboard")} onRun={(input) => run(input)} /> : null}
      {mode === "review" && review ? <ReviewWorkspace review={review} onAddEvidence={addEvidenceToCurrentReview} onOverrideClaim={overrideClaimInCurrentReview} onAddManualClaim={addManualClaimToCurrentReview} onEditClaim={editClaimInCurrentReview} onLinkEvidence={linkEvidenceInCurrentReview} onBack={() => setMode("dashboard")} onNew={() => { setDraft(undefined); setMode("intake"); }} /> : null}
      {mode === "compare" && comparisonReviews ? <ComparisonWorkspace reviews={comparisonReviews} onBack={() => setMode("dashboard")} onOpenReview={(item) => { setReview(item); setMode("review"); }} /> : null}
    </main>
  );
}
