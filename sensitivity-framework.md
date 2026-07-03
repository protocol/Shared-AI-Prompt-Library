# Sensitivity framework

A four-tier framework for tagging prompts by the data they're designed to consume. Every prompt entry in the library should carry a Sensitivity tag.

**Core principle:** a prompt's sensitivity tier is set by its **inputs**, not its outputs. A summarization prompt is L4 if the document being summarized is privileged, even if the prompt text itself looks harmless.

**Default rule of thumb:** when uncertain, default to one tier higher and downgrade after review.

---

## L1 — Public

| Aspect | Detail |
|--------|--------|
| Data | Published material, marketing copy, public regulations, public grant criteria, anything already on the open web. |
| Approved tools | Any AI tool. |
| Approvals | None. |
| Handling | No restrictions. Outputs may be shared broadly. |

---

## L2 — Internal

| Aspect | Detail |
|--------|--------|
| Data | Team working docs, internal wiki pages, draft memos, OKR notes, non-sensitive Slack content, anonymized vendor names ("Vendor A"), aggregate budget figures. |
| Approved tools | Enterprise AI tools approved by your org (e.g., Claude, Gemini for Workspace, Notion AI, ChatGPT Enterprise). No personal or free-tier accounts. |
| Approvals | None — but use an approved tool. |
| Handling | Don't post outputs externally without review. |

---

## L3 — Confidential

| Aspect | Detail |
|--------|--------|
| Data | Identified third parties, unredacted contracts and NDAs, applicant financials, draft legal memos, financials not yet published, employee comp/PII, applicant identities pre-publication, MNPI-adjacent material. |
| Approved tools | Enterprise-tier tools with appropriate data-handling controls only. Not consumer / free tiers for these inputs. |
| Approvals | Prompt author or matter DRI. Legal sign-off if the data came from outside counsel or is subject to a confidentiality undertaking. |
| Handling | Strip identifiers when the task allows. Don't paste into shared chats viewable beyond need-to-know. Note required redactions in the prompt's Inputs field. |

---

## L4 — Restricted

| Aspect | Detail |
|--------|--------|
| Data | Attorney-client privileged communications, litigation-hold material, regulatory inquiries, M&A or financing-deal terms pre-announcement, raw KYC packages, government IDs, banking / wire credentials, API keys or secrets, agreements with third-party confidentiality provisions that prohibit AI use. |
| Approved tools | Human review by default. AI use requires explicit per-matter sign-off from legal plus confirmation that retention, training opt-out, and data residency posture support the input. |
| Approvals | Senior counsel or your org's privacy / risk owner + the matter DRI. Document the approval in the prompt's Notes field with date and matter ID. |
| Handling | Never paste raw data into a library entry as an example — use synthetic or fully redacted placeholders only. Outputs are confidential by default and never auto-forwarded. |

---

## Parameters that travel with each sensitivity tag

When you tag a prompt with a sensitivity tier, also capture (in the entry's Notes field or a separate row):

- **Tool whitelist** — which tools are acceptable for this prompt.
- **Retention requirement** — e.g., "do not retain raw inputs; clear chat after run."
- **Redaction guidance** — which fields to strip before pasting.
- **Approver / escalation path** — who signs off before running at this tier.
- **Logging** — where, if anywhere, the run should be recorded. Useful for L3 / L4 audit trails.

## Adapting this framework

The four-tier model is a starting point. Adjust based on:

- **Your org's existing data classification scheme.** If your team already uses Public / Internal / Confidential / Restricted (or some equivalent), map this framework onto your scheme rather than introducing a new one.
- **Regulatory regimes that apply to your work.** Teams handling regulated data (HIPAA, GDPR special categories, export-controlled material) may need an additional "L5 — Regulated" tier with bespoke handling rules.
- **Your tooling reality.** The Approved Tools rows assume you have an enterprise AI deployment. Adjust to the tools your org actually pays for.

## Two practical rules of thumb

1. A prompt's tier is set by its **inputs**, not its outputs.
2. Default to **one tier higher** when uncertain, then downgrade if review confirms.
