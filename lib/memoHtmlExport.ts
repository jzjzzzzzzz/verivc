import type { ReviewResult } from "./types";
import type { WeightedRecommendationSummary } from "./scoringProfiles";
import { slugify } from "./engine";

export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function inlineMarkdown(value: string): string {
  return escapeHtml(value).replace(/`([^`]+)`/g, "<code>$1</code>").replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
}

export function memoMarkdownToHtml(markdown: string): string {
  const lines = markdown.split("\n");
  const html: string[] = [];
  let inList = false;

  const closeList = () => {
    if (inList) {
      html.push("</ul>");
      inList = false;
    }
  };

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) {
      closeList();
      continue;
    }
    if (trimmed.startsWith("### ")) {
      closeList();
      html.push(`<h3>${inlineMarkdown(trimmed.slice(4))}</h3>`);
    } else if (trimmed.startsWith("## ")) {
      closeList();
      html.push(`<h2>${inlineMarkdown(trimmed.slice(3))}</h2>`);
    } else if (trimmed.startsWith("# ")) {
      closeList();
      html.push(`<h1>${inlineMarkdown(trimmed.slice(2))}</h1>`);
    } else if (trimmed.startsWith("- ")) {
      if (!inList) {
        html.push("<ul>");
        inList = true;
      }
      html.push(`<li>${inlineMarkdown(trimmed.slice(2))}</li>`);
    } else {
      closeList();
      html.push(`<p>${inlineMarkdown(trimmed)}</p>`);
    }
  }
  closeList();
  return html.join("\n");
}

function rows(items: string[]): string {
  return items.map((item) => `<li>${escapeHtml(item)}</li>`).join("");
}

function statusClass(status: string): string {
  if (status === "supported") return "good";
  if (status === "partially_supported") return "info";
  if (status === "contradicted") return "bad";
  if (status === "insufficient_evidence") return "warn";
  return "neutral";
}

export function printableMemoFileName(review: ReviewResult): string {
  return `${slugify(review.profile.company_name)}-verivc-printable-memo.html`;
}

export function buildPrintableMemoHtml(review: ReviewResult, weightedSummary: WeightedRecommendationSummary): string {
  const generatedAt = new Date().toISOString();
  const memoHtml = memoMarkdownToHtml(review.memo.markdown);
  const topClaims = review.claims.slice(0, 18);
  const evidence = review.evidence.slice(0, 18);
  const reviewerOverrideCount = review.claims.reduce((count, claim) => count + (claim.reviewer_overrides?.length ?? 0), 0);

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>VeriVC Memo - ${escapeHtml(review.profile.company_name)}</title>
<style>
  :root { color-scheme: light; --ink:#111827; --muted:#5f6674; --line:#d9dee8; --soft:#f6f7f9; --blue:#3157d8; --green:#12805c; --amber:#9a6200; --red:#b42318; }
  * { box-sizing: border-box; }
  body { margin: 0; background: #f3f4f6; color: var(--ink); font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; line-height: 1.55; }
  main { width: min(1080px, calc(100% - 32px)); margin: 24px auto; background: white; border: 1px solid var(--line); border-radius: 24px; box-shadow: 0 24px 80px rgba(17,24,39,.10); overflow: hidden; }
  header { padding: 34px 40px; background: linear-gradient(135deg, #111827, #1f2a44); color: white; }
  header p { color: #d7dce8; max-width: 780px; }
  .eyebrow { text-transform: uppercase; letter-spacing: .14em; font-size: 12px; font-weight: 800; color: #9db4ff; }
  h1, h2, h3 { line-height: 1.08; letter-spacing: -.03em; }
  h1 { font-size: 42px; margin: 10px 0 12px; }
  h2 { margin-top: 28px; padding-top: 20px; border-top: 1px solid var(--line); }
  h3 { margin-bottom: 8px; }
  section { padding: 26px 40px; }
  .summary-grid { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 12px; margin-top: 24px; }
  .metric { background: var(--soft); border: 1px solid rgba(255,255,255,.2); border-radius: 16px; padding: 14px; }
  .metric span { display:block; color: var(--muted); font-size: 12px; text-transform: uppercase; letter-spacing: .08em; font-weight: 800; }
  .metric strong { display:block; font-size: 24px; margin-top: 4px; }
  .badge { display:inline-block; border-radius: 999px; padding: 3px 8px; font-size: 11px; font-weight: 850; text-transform: uppercase; letter-spacing: .06em; border: 1px solid currentColor; }
  .good { color: var(--green); } .info { color: var(--blue); } .warn { color: var(--amber); } .bad { color: var(--red); } .neutral { color: var(--muted); }
  table { width: 100%; border-collapse: collapse; margin: 14px 0 24px; font-size: 13px; }
  th, td { border-bottom: 1px solid var(--line); padding: 10px 8px; text-align: left; vertical-align: top; }
  th { color: var(--muted); font-size: 11px; text-transform: uppercase; letter-spacing: .08em; }
  code { background: #eef2ff; color: #243a9b; border-radius: 5px; padding: 1px 4px; }
  ul { padding-left: 20px; }
  .memo-body { background: #fff; }
  .limitations { background: #fff8eb; border-top: 1px solid #f2d8ad; border-bottom: 1px solid #f2d8ad; }
  footer { padding: 20px 40px 34px; color: var(--muted); font-size: 12px; }
  @media print {
    body { background: white; }
    main { width: 100%; margin: 0; border: 0; border-radius: 0; box-shadow: none; }
    header { background: #111827 !important; color: white !important; print-color-adjust: exact; -webkit-print-color-adjust: exact; }
    section { break-inside: avoid; }
    a { color: inherit; text-decoration: none; }
  }
  @media (max-width: 760px) { main { width: 100%; margin: 0; border-radius: 0; } .summary-grid { grid-template-columns: 1fr 1fr; } section, header, footer { padding-left: 20px; padding-right: 20px; } }
</style>
</head>
<body>
<main>
  <header>
    <div class="eyebrow">VeriVC printable investment memo</div>
    <h1>${escapeHtml(review.profile.company_name)}</h1>
    <p>${escapeHtml(review.profile.tagline)}</p>
    <div class="summary-grid">
      <div class="metric"><span>Recommendation</span><strong>${escapeHtml(review.recommendation.state)}</strong></div>
      <div class="metric"><span>Weighted readiness</span><strong>${weightedSummary.weighted_readiness_score}/100</strong></div>
      <div class="metric"><span>Base readiness</span><strong>${review.recommendation.readiness_score}/100</strong></div>
      <div class="metric"><span>Confidence</span><strong>${escapeHtml(review.recommendation.confidence)}</strong></div>
    </div>
  </header>
  <section class="limitations">
    <h2>Human-review boundary</h2>
    <p>Generated ${escapeHtml(generatedAt)}. This memo is decision support for human diligence. It does not authorize, transfer, wire, or commit capital. Factual conclusions should be checked against cited evidence IDs and primary documents.</p>
    <ul>${rows(review.recommendation.reasons)}${reviewerOverrideCount ? `<li>${reviewerOverrideCount} reviewer override(s) are preserved in the claim audit trail.</li>` : ""}</ul>
  </section>
  <section class="memo-body">${memoHtml}</section>
  <section>
    <h2>Fund scoring profile</h2>
    <p>${escapeHtml(weightedSummary.explanation)}</p>
    <table><thead><tr><th>Positive dimension</th><th>Score</th><th>Weight</th><th>Contribution</th></tr></thead><tbody>${weightedSummary.top_positive_weighted_dimensions.map((item) => `<tr><td>${escapeHtml(item.dimension.replaceAll("_", " "))}</td><td>${item.score}</td><td>${item.weight}</td><td>${item.contribution}</td></tr>`).join("")}</tbody></table>
  </section>
  <section>
    <h2>Claim-evidence appendix</h2>
    <table><thead><tr><th>ID</th><th>Status</th><th>Confidence</th><th>Claim</th><th>Evidence</th></tr></thead><tbody>${topClaims.map((claim) => `<tr><td>${claim.claim_id}</td><td><span class="badge ${statusClass(claim.status)}">${claim.status}</span></td><td>${claim.confidence}</td><td>${escapeHtml(claim.claim_text)}</td><td>Supports: ${escapeHtml(claim.supporting_evidence_ids.join(", ") || "none")}<br/>Contradicts: ${escapeHtml(claim.contradicting_evidence_ids.join(", ") || "none")}</td></tr>`).join("")}</tbody></table>
  </section>
  <section>
    <h2>Evidence appendix</h2>
    <table><thead><tr><th>ID</th><th>Source</th><th>Reliability</th><th>Excerpt</th></tr></thead><tbody>${evidence.map((item) => `<tr><td>${item.evidence_id}</td><td>${escapeHtml(item.source_type)}</td><td>${escapeHtml(item.reliability_level)}</td><td>${escapeHtml(item.excerpt.slice(0, 420))}</td></tr>`).join("")}</tbody></table>
  </section>
  <footer>VeriVC preserves evidence, contradictions, missing information, and human overrides for traceable partner review.</footer>
</main>
</body>
</html>`;
}
