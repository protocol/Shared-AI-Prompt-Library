# [Team Name] AI Prompt Library

*v0.1 (Draft) — [Date] — Owner: [Name]*

---

## 1. Purpose & scope

This document is the canonical home for AI prompts shared across [Team Name]. It exists so we (a) avoid reinventing prompts across teammates, (b) keep a record of what works, and (c) raise the floor on prompt quality.

How to use this document:

- Treat each prompt entry as a reusable building block. Copy, adapt, and credit.
- Add new prompts under the appropriate category. If a prompt spans categories, file it under the primary use case and add tags for the others.
- Mark a prompt as **Draft** when first added; promote to **Approved** after at least one other person has tested it.
- Retire prompts that are stale, redundant, or no longer reflect best practice — move them to the Archive section.

Organization note: we use category sections rather than separate documents per function, so prompts that bridge functions stay discoverable. Each prompt carries a Category tag and additional Tags for cross-cutting use cases.

See `CONTRIBUTING.md` for the entry schema, `sensitivity-framework.md` for the L1–L4 data-handling tiers, and `best-practices.md` for prompting techniques.

---

## 2. Prompt entry template

Copy this block when adding a new prompt:

| Field | Value |
|-------|-------|
| Title | |
| Category | Legal \| Finance \| Operations \| Product \| Research \| Comms \| Cross-functional |
| Use case | |
| Intended audience | |
| Recommended model | |
| Inputs required | |
| Prompt text | |
| Example output | |
| Author / owner | |
| Last updated | |
| Status | Draft |
| Sensitivity | L1 \| L2 \| L3 \| L4 (see `sensitivity-framework.md`) |
| Tags | |
| Notes | |

---

## 3. Legal

*Contracts, NDAs, compliance checks, vendor diligence, legal research.*

### Seed prompts

*(Add your team's prompts here. See `examples/example-contract-review.md` for a fully populated entry.)*

---

## 4. Finance

*Budget analysis, invoice processing, reconciliations, financial reporting.*

### Seed prompts

*(Add prompts here.)*

---

## 5. Operations

*Process documentation, meeting briefings, status updates, project planning. See `examples/example-meeting-briefing.md` for a fully populated entry.*

### Seed prompts

*(Add prompts here.)*

---

## 6. Product

*Spec drafting, user research synthesis, roadmap analysis, release notes.*

### Seed prompts

*(Add prompts here.)*

---

## 7. Research

*Literature review, summarization, technical analysis, citation tracing.*

### Seed prompts

*(Add prompts here.)*

---

## 8. Comms

*Internal updates, external announcements, blog posts, social. See `examples/example-internal-comms.md` for a fully populated entry.*

### Seed prompts

*(Add prompts here.)*

---

## 9. Cross-functional

*Prompts that don't fit cleanly in one category. Tag with all relevant functions so they stay findable. Examples to consider adding:*

- "Explain this Slack thread to me as if I'd been out for a week."
- "Summarize this long email thread and extract action items by owner."
- "Diff two versions of a doc and explain what changed and why it might matter."
- "Generate three alternative phrasings of this sentence, ranging from neutral to assertive."

---

## 10. Archive

*Move retired or deprecated prompts here with a one-line note on why they were retired. Don't delete — the archive is useful institutional memory.*

*(empty)*
