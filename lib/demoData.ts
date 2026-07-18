import type { Evidence, StartupInput } from "./types";

const now = "2026-07-19T00:00:00.000+08:00";

export interface DemoCompany {
  id: "aurelia" | "grainloop";
  label: string;
  summary: string;
  input: StartupInput;
  evidence: Evidence[];
}

export const demoCompanies: DemoCompany[] = [
  {
    id: "aurelia",
    label: "Aurelia AI — polished but risky",
    summary:
      "A premium AI sales assistant pitch with big market language, but contradictory traction and weak technical proof.",
    input: {
      companyName: "Aurelia AI",
      websiteUrl: "https://demo.verivc.local/aurelia-ai",
      githubUrl: "https://github.com/demo/aurelia-ai",
      sector: "AI / Sales Automation",
      stage: "Seed",
      pitch:
        "Aurelia AI is an autonomous revenue agent for enterprise SaaS teams. We eliminate SDR busywork with production-ready AI agents that find accounts, write outreach, book meetings, and sync CRM notes. The market is a $50B opportunity and we have no direct competitors because our proprietary reasoning moat is unique. We grew revenue 40% month over month, reached $82K MRR, signed 23 enterprise customers including Fortune 500 teams, and converted 92% of pilots. We are raising $2M to scale GTM and expand the engineering team.",
      notes:
        "Founder note says January MRR was $82K, while a later investor update says May MRR is $31K after churn. Three pilots are described as paid in the pitch but unpaid in the uploaded notes. One paragraph also mentions Gong, Outreach, Salesloft, Apollo, and Clay as adjacent competitors.",
      pastedEvidence:
        "Investor update excerpt: May MRR is $31K across six paying customers; 17 additional pilots are unpaid design partners. Pipeline includes two Fortune 500 innovation teams but no signed enterprise master agreement yet. Repository snapshot: last commit 2025-11-04, README is a product vision stub, no deployment instructions, no license, and only one contributor. Customer reference excerpt: Useful workflow prototype, but we still manually approve every email before it goes out.",
      investmentThesis:
        "Prefer seed companies with credible early customer pull, transparent metrics, and a defensible wedge in workflow automation.",
    },
    evidence: [
      {
        evidence_id: "EV-AUR-001",
        source_type: "founder_note",
        title: "Investor update: May 2026 traction snapshot",
        url_or_file: "founder_pasted_notes.txt",
        excerpt:
          "May MRR is $31K across six paying customers; 17 additional pilots are unpaid design partners.",
        captured_at: now,
        reliability_level: "primary",
        relevance: "high",
        supports_claim_ids: [],
        contradicts_claim_ids: [],
        limitations: ["Founder-provided update has not been reconciled against bank statements or contracts."],
      },
      {
        evidence_id: "EV-AUR-002",
        source_type: "manual_evidence",
        title: "Pitch notes mention adjacent competitors",
        url_or_file: "reviewer_notes.txt",
        excerpt:
          "Adjacent competitors named by the founder include Gong, Outreach, Salesloft, Apollo, and Clay.",
        captured_at: now,
        reliability_level: "medium",
        relevance: "high",
        supports_claim_ids: [],
        contradicts_claim_ids: [],
        limitations: ["Competitor list is not a full market map."],
      },
      {
        evidence_id: "EV-AUR-003",
        source_type: "github",
        title: "GitHub snapshot for demo/aurelia-ai",
        url_or_file: "https://github.com/demo/aurelia-ai",
        excerpt:
          "Repository has one contributor, last commit on 2025-11-04, README is a product vision stub, no deployment instructions, and no license file.",
        captured_at: now,
        reliability_level: "medium",
        relevance: "medium",
        supports_claim_ids: [],
        contradicts_claim_ids: [],
        limitations: ["Repository may not include private production services or infrastructure."],
      },
      {
        evidence_id: "EV-AUR-004",
        source_type: "customer_reference",
        title: "Customer reference call excerpt",
        excerpt:
          "Useful workflow prototype, but we still manually approve every email before it goes out.",
        captured_at: now,
        reliability_level: "high",
        relevance: "high",
        supports_claim_ids: [],
        contradicts_claim_ids: [],
        limitations: ["Single reference; not representative of all pilots."],
      },
      {
        evidence_id: "EV-AUR-005",
        source_type: "demo_snapshot",
        title: "Website positioning snapshot",
        url_or_file: "https://demo.verivc.local/aurelia-ai",
        excerpt:
          "Landing page states: autonomous sales execution platform for enterprise revenue teams.",
        captured_at: now,
        reliability_level: "low",
        relevance: "medium",
        supports_claim_ids: [],
        contradicts_claim_ids: [],
        limitations: ["Marketing copy is founder-authored and not independent validation."],
      },
    ],
  },
  {
    id: "grainloop",
    label: "GrainLoop — less flashy, better supported",
    summary:
      "A pragmatic agtech workflow product with modest claims, clearer customer evidence, and inspectable execution artifacts.",
    input: {
      companyName: "GrainLoop",
      websiteUrl: "https://demo.verivc.local/grainloop",
      githubUrl: "https://github.com/demo/grainloop",
      sector: "Agtech / Supply Chain SaaS",
      stage: "Pre-seed",
      pitch:
        "GrainLoop helps regional grain cooperatives coordinate pickup scheduling, quality documents, and buyer communication. The first product is a mobile-friendly operations dashboard and SMS workflow for co-op managers. We serve grain elevators and small cooperatives that still coordinate harvest logistics through spreadsheets and phone calls. We charge $600 per location per month after a 60-day onboarding period. We have 8 paying locations across 3 cooperatives, $14.4K MRR, 94% weekly active manager usage during harvest weeks, and two signed letters of intent for expansion. The founding team has ten years of co-op operations experience and previously built logistics software. We are raising $750K to hire one full-stack engineer and expand sales in the Midwest.",
      notes:
        "Founder provided anonymized Stripe export, three customer reference summaries, a product walkthrough transcript, and a public repository containing the SMS scheduler integration sample. TAM is described as a bottom-up regional beachhead, not a global number.",
      pastedEvidence:
        "Stripe export excerpt: 8 active subscriptions at $600/location/month plus onboarding fees; current recurring revenue $14,400. Customer reference: reduced missed pickups and made quality paperwork easier to find. Repository snapshot: 214 commits, 4 contributors, README with local setup, MIT license, tests for scheduling rules, last commit 2026-06-28. LOI summary: two current cooperatives intend to add 5 locations after harvest if uptime remains above 99%.",
      investmentThesis:
        "Prefer evidence-backed workflow software with narrow wedge, paid customer pull, and clear path from services to scalable SaaS.",
    },
    evidence: [
      {
        evidence_id: "EV-GRN-001",
        source_type: "financial_document",
        title: "Anonymized Stripe export summary",
        url_or_file: "stripe_export_summary.csv",
        excerpt:
          "8 active subscriptions at $600/location/month plus onboarding fees; current recurring revenue $14,400.",
        captured_at: now,
        reliability_level: "primary",
        relevance: "high",
        supports_claim_ids: [],
        contradicts_claim_ids: [],
        limitations: ["Anonymized export still requires direct account verification before investment."],
      },
      {
        evidence_id: "EV-GRN-002",
        source_type: "customer_reference",
        title: "Customer reference summaries",
        excerpt:
          "Three cooperative managers reported fewer missed pickups and easier retrieval of quality paperwork during harvest weeks.",
        captured_at: now,
        reliability_level: "high",
        relevance: "high",
        supports_claim_ids: [],
        contradicts_claim_ids: [],
        limitations: ["Small sample size and seasonal usage pattern."],
      },
      {
        evidence_id: "EV-GRN-003",
        source_type: "github",
        title: "GitHub snapshot for demo/grainloop",
        url_or_file: "https://github.com/demo/grainloop",
        excerpt:
          "Repository has 214 commits, 4 contributors, README with local setup, MIT license, scheduling-rule tests, and last commit on 2026-06-28.",
        captured_at: now,
        reliability_level: "medium",
        relevance: "high",
        supports_claim_ids: [],
        contradicts_claim_ids: [],
        limitations: ["Public sample may not cover the complete production system."],
      },
      {
        evidence_id: "EV-GRN-004",
        source_type: "manual_evidence",
        title: "Expansion LOI summary",
        url_or_file: "loi_summary.pdf",
        excerpt:
          "Two current cooperatives intend to add 5 locations after harvest if uptime remains above 99%.",
        captured_at: now,
        reliability_level: "medium",
        relevance: "medium",
        supports_claim_ids: [],
        contradicts_claim_ids: [],
        limitations: ["Letters of intent are non-binding and conditional."],
      },
      {
        evidence_id: "EV-GRN-005",
        source_type: "founder_note",
        title: "Founder market beachhead note",
        excerpt:
          "Initial wedge is regional grain cooperatives in the Midwest; market estimate is built from locations reachable through state cooperative associations.",
        captured_at: now,
        reliability_level: "medium",
        relevance: "medium",
        supports_claim_ids: [],
        contradicts_claim_ids: [],
        limitations: ["Bottom-up model inputs require independent checking."],
      },
    ],
  },
];

export function getDemoCompany(id: DemoCompany["id"]): DemoCompany {
  const demo = demoCompanies.find((company) => company.id === id);
  if (!demo) throw new Error(`Unknown demo company: ${id}`);
  return demo;
}
