"use client";

import { useMemo, useState } from "react";
import { demoCompanies } from "@/lib/demoData";
import { runReview } from "@/lib/engine";
import type { CategoryEvaluation, Claim, Evidence, ReviewResult, StartupInput } from "@/lib/types";

const emptyInput: StartupInput = {
  companyName: "",
  websiteUrl: "",
  githubUrl: "",
  pitch: "",
  sector: "AI / SaaS",
  stage: "Seed",
  investmentThesis: "",
  notes: "",
  pastedEvidence: "",
  deckFileName: "",
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

function scoreTone(score: number) {
  if (score >= 72) return "score-good";
  if (score >= 52) return "score-mid";
  return "score-low";
}

function evidenceById(evidence: Evidence[]) {
  return new Map(evidence.map((item) => [item.evidence_id, item]));
}

function Dashboard({ onDemo, onNew, recent }: { onDemo: (index: number) => void; onNew: () => void; recent: ReviewResult[] }) {
  return (
    <section className="hero-grid" aria-labelledby="hero-title">
      <div className="hero-card">
        <div className="eyebrow">Hack Nation 2026 · Challenge 2</div>
        <h1 id="hero-title">VeriVC verifies startup claims before confidence becomes consensus.</h1>
        <p className="hero-copy">Most AI investment tools generate opinions. VeriVC verifies the evidence behind them.</p>
        <div className="hero-actions">
          <button className="primary-button" onClick={onNew}>New Review</button>
          <a className="secondary-button" href="#demo-companies">Load deterministic demos</a>
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
        <div className="section-heading"><span>Recent local reviews</span><small>Stored in this browser session only</small></div>
        {recent.length === 0 ? <p className="empty-state">No reviews yet. Start with a demo or create a manual review.</p> : (
          <div className="recent-list">
            {recent.map((review) => (
              <div key={review.review_id} className="recent-row">
                <span>{review.profile.company_name}</span>
                <Badge tone={recommendationTone(review.recommendation.state)}>{recommendationLabels[review.recommendation.state]}</Badge>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

function IntakeForm({ initialInput, onCancel, onRun }: { initialInput?: StartupInput; onCancel: () => void; onRun: (input: StartupInput) => void }) {
  const [input, setInput] = useState<StartupInput>(initialInput ?? emptyInput);
  const [error, setError] = useState("");
  const set = (key: keyof StartupInput, value: string) => setInput((current) => ({ ...current, [key]: value }));
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
          <label>Optional pitch deck PDF<input type="file" accept="application/pdf,.pdf" onChange={(e) => set("deckFileName", e.target.files?.[0]?.name ?? "")} /></label>
        </div>
        <label>Pitch description<textarea className="large" value={input.pitch} onChange={(e) => set("pitch", e.target.value)} placeholder="Paste the founder pitch, deck text, or application answer." required /></label>
        <label>Pasted evidence and metrics<textarea value={input.pastedEvidence} onChange={(e) => set("pastedEvidence", e.target.value)} placeholder="Paste customer references, Stripe excerpts, GitHub snapshots, market notes, or reviewer observations." /></label>
        <label>Reviewer notes / traction details<textarea value={input.notes} onChange={(e) => set("notes", e.target.value)} placeholder="Add contradictions, caveats, meeting notes, or extra founder claims." /></label>
        <label>Investor thesis or review criteria<textarea value={input.investmentThesis} onChange={(e) => set("investmentThesis", e.target.value)} placeholder="Optional: describe what this fund or judge values." /></label>
        {input.deckFileName ? <p className="file-note">Captured PDF artifact: <strong>{input.deckFileName}</strong>. Local MVP preserves file provenance; paste key deck text for claim extraction.</p> : null}
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

function ClaimExplorer({ claims, evidence }: { claims: Claim[]; evidence: Evidence[] }) {
  const byId = useMemo(() => evidenceById(evidence), [evidence]);
  const [filter, setFilter] = useState("all");
  const visible = filter === "all" ? claims : claims.filter((claim) => claim.status === filter);
  return (
    <section className="workspace-section" aria-labelledby="claims-title">
      <div className="section-heading"><span id="claims-title">Claim–evidence explorer</span><small>Every conclusion remains traceable</small></div>
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
            </div>
          </details>
        ))}
      </div>
    </section>
  );
}

function EvidenceMini({ evidence }: { evidence?: Evidence }) {
  if (!evidence) return <p className="muted">Evidence record missing.</p>;
  return <div className="evidence-mini"><strong>{evidence.evidence_id}: {evidence.title}</strong><p>{evidence.excerpt}</p><small>{evidence.source_type} · reliability {evidence.reliability_level}</small></div>;
}

function EvidenceVault({ evidence }: { evidence: Evidence[] }) {
  return (
    <section className="workspace-section" aria-labelledby="evidence-title">
      <div className="section-heading"><span id="evidence-title">Evidence vault</span><small>Provenance is preserved; unavailable evidence is explicit</small></div>
      <div className="evidence-grid">
        {evidence.map((item) => (
          <article className="evidence-card" key={item.evidence_id}>
            <Badge tone={item.reliability_level === "primary" || item.reliability_level === "high" ? "green" : item.reliability_level === "medium" ? "blue" : "neutral"}>{item.evidence_id}</Badge>
            <h3>{item.title}</h3>
            <p>{item.excerpt}</p>
            {item.url_or_file ? <small>{item.url_or_file}</small> : null}
            <small>Supports {item.supports_claim_ids.length} · Contradicts {item.contradicts_claim_ids.length}</small>
            {item.limitations.length ? <ul>{item.limitations.map((limit) => <li key={limit}>{limit}</li>)}</ul> : null}
          </article>
        ))}
      </div>
    </section>
  );
}

function MemoPanel({ review }: { review: ReviewResult }) {
  const [copied, setCopied] = useState(false);
  const downloadMemo = () => {
    const blob = new Blob([review.memo.markdown], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${review.profile.company_name.replace(/[^a-z0-9]+/gi, "-").toLowerCase()}-verivc-memo.md`;
    link.click();
    URL.revokeObjectURL(url);
  };
  return (
    <section className="workspace-section" aria-labelledby="memo-title">
      <div className="section-heading"><span id="memo-title">Investment memo</span><small>Markdown export for partner review</small></div>
      <div className="memo-actions"><button className="secondary-button" onClick={async () => { await navigator.clipboard.writeText(review.memo.markdown); setCopied(true); }}>Copy memo</button><button className="primary-button" onClick={downloadMemo}>Download Markdown</button>{copied ? <Badge tone="green">Copied</Badge> : null}</div>
      <pre className="memo-box">{review.memo.markdown}</pre>
    </section>
  );
}

function ReviewWorkspace({ review, onBack, onNew }: { review: ReviewResult; onBack: () => void; onNew: () => void }) {
  const [tab, setTab] = useState<"overview" | "claims" | "evidence" | "memo">("overview");
  const recTone = recommendationTone(review.recommendation.state);
  return (
    <section className="workspace" aria-labelledby="workspace-title">
      <div className="workspace-top">
        <div><div className="eyebrow">Review workspace</div><h2 id="workspace-title">{review.profile.company_name}</h2><p>{review.profile.tagline}</p></div>
        <div className="workspace-actions"><button className="ghost-button" onClick={onBack}>Dashboard</button><button className="secondary-button" onClick={onNew}>New Review</button></div>
      </div>
      <div className="decision-band">
        <div className="readiness"><span>Readiness score</span><strong>{review.recommendation.readiness_score}</strong><small>/100</small></div>
        <div><Badge tone={recTone}>{recommendationLabels[review.recommendation.state]}</Badge><p>{review.recommendation.reasons.join(" ")}</p></div>
        <div><Badge tone={review.recommendation.confidence === "high" ? "green" : review.recommendation.confidence === "medium" ? "blue" : "amber"}>{review.recommendation.confidence} confidence</Badge><p>{review.recommendation.human_review_note}</p></div>
      </div>
      <nav className="tabs" aria-label="Review sections">
        {[
          ["overview", "Overview"], ["claims", "Claims"], ["evidence", "Evidence"], ["memo", "Memo"],
        ].map(([id, label]) => <button key={id} className={cls(tab === id && "tab-active")} onClick={() => setTab(id as typeof tab)}>{label}</button>)}
      </nav>
      {tab === "overview" ? <Overview review={review} /> : null}
      {tab === "claims" ? <ClaimExplorer claims={review.claims} evidence={review.evidence} /> : null}
      {tab === "evidence" ? <EvidenceVault evidence={review.evidence} /> : null}
      {tab === "memo" ? <MemoPanel review={review} /> : null}
    </section>
  );
}

function Overview({ review }: { review: ReviewResult }) {
  return (
    <div className="overview-grid">
      <section className="workspace-section span-8"><div className="section-heading"><span>Category evaluations</span><small>Rule-based scoring, no fake precision</small></div><div className="score-grid">{review.evaluations.map((evaluation) => <ScoreCard key={evaluation.dimension} evaluation={evaluation} />)}</div></section>
      <aside className="workspace-section span-4"><div className="section-heading"><span>Top red flags</span><small>{review.red_flags.length} detected</small></div>{review.red_flags.length ? review.red_flags.slice(0, 5).map((finding) => <details className="finding-card" key={finding.finding_id}><summary><Badge tone={finding.severity === "high" || finding.severity === "critical" ? "red" : "amber"}>{finding.severity}</Badge><strong>{finding.title}</strong></summary><p>{finding.explanation}</p><p className="muted">Claims: {finding.related_claim_ids.join(", ") || "none"} · Evidence: {finding.evidence_ids.join(", ") || "none"}</p></details>) : <p className="empty-state">No major contradictions detected.</p>}</aside>
      <section className="workspace-section span-6"><div className="section-heading"><span>Evidence-backed strengths</span><small>Only linked or score-derived items</small></div>{review.strengths.length ? <ul className="clean-list">{review.strengths.map((item) => <li key={item}>{item}</li>)}</ul> : <p className="empty-state">No strong evidence-backed strengths yet.</p>}</section>
      <section className="workspace-section span-6"><div className="section-heading"><span>Missing information</span><small>Confidence reducers</small></div>{review.missing_information.length ? <ul className="clean-list">{review.missing_information.slice(0, 8).map((item) => <li key={item}>{item}</li>)}</ul> : <p className="empty-state">No major missing information detected.</p>}</section>
      <section className="workspace-section span-12"><div className="section-heading"><span>Founder follow-up questions</span><small>Prioritized by unresolved findings</small></div><div className="questions-grid">{review.founder_questions.map((q) => <article className="question-card" key={q.question_id}><Badge tone={q.priority === "critical" || q.priority === "high" ? "red" : "blue"}>{q.group}</Badge><h3>{q.question}</h3><p>{q.rationale}</p><small>{q.related_claim_ids.join(", ") || "General diligence"}</small></article>)}</div></section>
    </div>
  );
}

export default function VeriVCApp() {
  const [mode, setMode] = useState<"dashboard" | "intake" | "review">("dashboard");
  const [draft, setDraft] = useState<StartupInput | undefined>();
  const [review, setReview] = useState<ReviewResult | undefined>();
  const [recent, setRecent] = useState<ReviewResult[]>([]);

  const run = (input: StartupInput, evidence = [] as Evidence[]) => {
    const result = runReview(input, evidence);
    setReview(result);
    setRecent((items) => [result, ...items.filter((item) => item.review_id !== result.review_id)].slice(0, 5));
    setMode("review");
  };

  return (
    <main className="app-shell">
      <header className="topbar"><button className="brand" onClick={() => setMode("dashboard")} aria-label="Go to VeriVC dashboard"><span>V</span><strong>VeriVC</strong></button><div className="topbar-note">Evidence-driven AI startup due-diligence copilot</div></header>
      {mode === "dashboard" ? <Dashboard recent={recent} onNew={() => { setDraft(undefined); setMode("intake"); }} onDemo={(index) => { const demo = demoCompanies[index]; setDraft(demo.input); run(demo.input, demo.evidence); }} /> : null}
      {mode === "intake" ? <IntakeForm initialInput={draft} onCancel={() => setMode("dashboard")} onRun={(input) => run(input)} /> : null}
      {mode === "review" && review ? <ReviewWorkspace review={review} onBack={() => setMode("dashboard")} onNew={() => { setDraft(undefined); setMode("intake"); }} /> : null}
    </main>
  );
}
