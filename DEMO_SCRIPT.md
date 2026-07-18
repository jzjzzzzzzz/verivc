# VeriVC 3–5 Minute Demo Script

## 1. Open

Open the local app and say:

> Most AI investment tools generate opinions. VeriVC verifies the evidence behind them.

Explain that the user is a VC, accelerator reviewer, angel, or judge reviewing many startups quickly without losing traceability.

## 2. Show dashboard

Point to:

- New Review
- two deterministic demo companies
- evidence-before-opinion principles

Say that the demo works without paid APIs.

## 3. Load the polished risky startup

Click **Aurelia AI — polished but risky**.

Show:

- readiness score
- restrained recommendation: `decline_based_on_current_evidence`
- medium/low confidence driven by contradictions rather than language quality

## 4. Open claims

Go to **Claims** and filter or scroll to contradicted claims.

Expand the MRR/customer claim. Show:

- original pitch claim says `$82K MRR`, 23 enterprise customers, 92% pilot conversion
- evidence says `$31K MRR`, six paying customers, unpaid pilots
- status is `contradicted`
- missing evidence lists primary revenue/customer documents

## 5. Show competitor contradiction

Expand the “no direct competitors” claim.

Show that another source lists Gong, Outreach, Salesloft, Apollo, and Clay as adjacent competitors. Emphasize that VeriVC does not accept “no competitors” at face value.

## 6. Show founder questions

Return to **Overview** and highlight generated questions:

- reconcile traction metrics
- identify competitors and why the company wins
- prove production readiness with technical artifacts
- provide legal/regulatory diligence context

## 7. Show memo

Open **Memo** and show the Markdown export.

Point out that important facts use evidence IDs or are labelled as gaps/limitations.

## 8. Compare with the stronger startup

Return to dashboard and load **GrainLoop — less flashy, better supported**.

Show:

- recommendation: `proceed_with_conditions`
- better business model and traction evidence
- fewer red flags
- conditions still required before partner review

## 9. Close

End with:

> VeriVC helps investors review faster without confusing confident language with verified evidence.

## 10. Second-iteration add-on demo

After showing the evidence vault, add a new manual evidence item:

- Title: `Updated Stripe export`
- Source type: `financial_document`
- Reliability: `primary`
- Excerpt: `Updated Stripe export confirms $31K MRR across six paying customers; 17 pilots remain unpaid.`

Click **Add evidence + rerun analysis** and show that VeriVC relinks the graph instead of appending an untraceable note.

Then click **Export audit JSON** to show the full review package, and return to the dashboard to show the local review library.

## 11. Audit import round trip

1. Open a review and click **Export audit JSON**.
2. Return to the dashboard.
3. In **Review library**, click **Choose JSON** and select the exported file.
4. Show that the review reopens with claims, evidence, recommendation, and memo intact.
5. Explain that this is useful for partner review handoff and later audit replay.

## 12. PDF deck extraction

Click **New Review**, choose a text-based PDF pitch deck, and show the extraction status. Point out that the deck text field is filled with `Page N:` excerpts, then run the review and open a deck-sourced claim to show a source reference such as `Pitch deck page 6`. Explain that scanned decks still require pasted excerpts or primary documents.

## 13. GitHub public snapshot

On **New Review**, enter a public GitHub repository URL and click **Analyze GitHub**. Show that VeriVC captures stars, forks, README/license status, language mix, and latest commit metadata as evidence. Then point out the limitation text: GitHub activity helps technical diligence but does not prove product quality or production readiness.

## 14. Fund profile weighting

Open GrainLoop, then switch the **Fund scoring profile** selector between:

- Balanced early-stage
- B2B SaaS accelerator
- Technical angel

Show that the readiness score and weighted positives change, but the claim-evidence graph and base recommendation remain traceable. Open the memo and point out the appended fund scoring profile section.
