# VeriVC 3–5 Minute Demo Script

## 1. Open

Open the local app and say:

> Most AI investment tools generate opinions. VeriVC verifies the evidence behind them.

Explain that the user is a VC, accelerator reviewer, angel, or judge reviewing many startups quickly without losing traceability.

## 2. Show dashboard

Point to:

- New Review
- two deterministic demo companies
- Compare demos
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

## 12. Local share payload handoff

Open a review, go to **Memo**, and click **Copy share payload**. Return to the dashboard, paste the `verivc-share:v1:` text into the import panel, and click **Import share payload**. Explain that this is an offline partner-review handoff for the same validated audit package, not cloud collaboration, encryption, or authorization to invest.

## 13. PDF deck extraction

Click **New Review**, choose a text-based PDF pitch deck, and show the extraction status. Point out that the deck text field is filled with `Page N:` excerpts, then run the review and open a deck-sourced claim to show a source reference such as `Pitch deck page 6`. Explain that scanned decks still require pasted excerpts or primary documents.

## 14. GitHub public snapshot

On **New Review**, enter a public GitHub repository URL and click **Analyze GitHub**. Show that VeriVC captures stars, forks, README/license status, language mix, and latest commit metadata as evidence. Then point out the limitation text: GitHub activity helps technical diligence but does not prove product quality or production readiness.

## 15. Reviewer claim override

Open a contradicted or insufficient claim. In **Reviewer override**, change the status or confidence, add a reason such as `Partner reviewed updated Stripe export; claim is partially supported pending signed customer list`, and save. Show that the override appears in the claim history, memo, and audit JSON. Explain that adding new evidence and rerunning is still the path for rule-based rescoring.

## 16. Print-ready memo export

Open **Memo** and click **Download HTML**. Explain that the file is a standalone partner-review memo with print styles, recommendation summary, fund profile, claim-evidence appendix, evidence appendix, and reviewer override log. Mention that audit JSON remains the full machine-readable record.

## 17. Side-by-side demo comparison

Return to the dashboard and click **Compare demos**. Show that Aurelia AI is more polished but has more contradictions and severe red flags, while GrainLoop has stronger evidence completeness and fewer contradictions. Use the line `Evidence beats polish` to summarize the core product message.

## 18. Fund profile weighting

Open GrainLoop, then switch the **Fund scoring profile** selector between:

- Balanced early-stage
- B2B SaaS accelerator
- Technical angel

Show that the readiness score and weighted positives change, but the claim-evidence graph and base recommendation remain traceable. Open the memo and point out the appended fund scoring profile section.

## 19. Partner review checklist

Open Aurelia AI and point to the **Partner review checklist** at the top of Overview. Show that the checklist is **blocked** because material contradictions and weak evidence coverage remain unresolved. Then open GrainLoop and show the higher checklist completion score with more ready gates. Emphasize that this is a handoff readiness checklist, not an autonomous investment approval.

## 20. Memo evidence coverage indicators

Open **Memo** and show **Memo evidence coverage** above the memo body. Expand a weak or inference-only section and point out that VeriVC lists the exact claim IDs, evidence IDs, contradictions, unsupported claims, and missing information behind that memo section. Then click **Download HTML** and explain that the exported partner memo preserves the same coverage appendix.

## 21. Manual claim editor

Open **Claims** and expand **Add reviewer claim**. Add a legal or traction diligence claim from a reviewer note, then show the new `CL-REV-*` claim in the explorer. Next expand an existing claim and use **Edit claim metadata** to clarify wording or materiality. Point out that evidence links remain visible, the memo gains a `Reviewer Claim Edit Log`, and the audit JSON/share payload preserve the human edit trail.

## 22. Manual evidence linker

Open **Evidence**, expand **Manual claim link** on an evidence card, select a claim, choose whether the evidence supports or contradicts it, and save with a reviewer note. Then open the claim in **Claims** and show that the support/contradiction evidence ID is now attached. Return to **Memo** to show memo coverage and the `Reviewer Evidence Link Log`, explaining that the graph changed transparently rather than hiding a human judgment.

## 23. Refresh derived analysis after human graph edits

After adding a manual claim or manual evidence link, click **Refresh derived analysis** in the review workspace action bar. Show that scorecards, red flags, founder questions, recommendation, and memo rebuild from the current claim/evidence graph, while `Reviewer Override Log`, `Reviewer Claim Edit Log`, and `Reviewer Evidence Link Log` remain visible. Emphasize that refresh is explicit human-supervised recomputation, not autonomous investment approval.

## 24. Audit timeline

Open the new **Audit Timeline** tab after running a demo or making a manual edit. Show the summary counters for human actions, risk-relevant evidence, and refreshes. Expand a reviewer override, manual claim edit, evidence link, or refresh event and point out the related claim IDs and evidence IDs. Close with: `VeriVC does not just output a memo; it preserves how the memo was produced.`

## 25. Last Refresh Diff

After making an override or manual evidence link, click **Refresh derived analysis**. Point to **Last refresh diff** near the top of the workspace and read the summary aloud: recommendation movement, readiness delta, changed scorecards, red flags added or resolved, and question/missing-info deltas. Then download HTML memo and show that the same refresh diff is preserved in the partner export.

## 26. Analysis freshness indicator

After a reviewer override or manual evidence link, point to the decision band freshness badge. Show that VeriVC marks the analysis as needing refresh until **Refresh derived analysis** is clicked. Explain that this prevents silent mismatch between human-edited evidence graphs and exported conclusions.
