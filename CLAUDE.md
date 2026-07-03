# PL Infra AI Prompt Library — Project Instructions

## What this project is

A shared AI prompt library for PL Infra teams (legal, finance, capital, operations, product, research, comms). The library lives in `preview/prompts.json` and is rendered as a static GitHub Pages site. Users browse prompts, copy them with one click, and submit new ones via a form that opens a GitHub issue — a workflow then turns the issue into a PR.

The source of truth for all prompts is **`preview/prompts.json`**.

---

## Repo structure

| Path | Purpose |
|------|---------|
| `preview/prompts.json` | Prompt library data — the **source of truth**; the only file to edit to add, update, or deprecate prompts |
| `preview/prompts.js` | Auto-generated mirror of `prompts.json` (`window.PROMPTS`) so the site runs over `file://`. Regenerate whenever `prompts.json` changes (see `preview/README.md`) |
| `preview/index.html` | The library app — browse/filter/search/sort, upvote, in-page Prompting Guide tab, add-prompt modal, dark mode |
| `preview/reference.html` | Redirect → `index.html#guide` (the guide is now in-page). Old standalone page preserved as `reference.html.bak` |
| `preview/add-prompt.html` | Submission form (opens a GitHub issue → PR) |
| `preview/app.js` · `add-prompt.js` · `styles.css` | Site behavior and styling. `app.js` reads `window.PROMPTS` |
| `.github/workflows/prompt-from-issue.yml` | Turns `add-prompt` issues into PRs |
| `.github/ISSUE_TEMPLATE/add-prompt.md` | Issue template for manual submission |
| `CONTRIBUTING.md` | Full prompt entry schema and contribution workflow |
| `sensitivity-framework.md` | L1–L4 data sensitivity tiers (full detail) |
| `best-practices.md` | Prompting techniques — the Golden Formula, power-user tips, etc. |
| `prompt-library-template.md` | Markdown template for teams that prefer it over the hosted site |

> `examples/` is deprecated — ignore it.

---

## How to help with common tasks

### Adding or updating a prompt

When asked to add a prompt, always produce a valid JSON entry for `preview/prompts.json`. Use this schema:

```json
{
  "title": "Short, descriptive name",
  "category": "Legal | Finance | Operations | Product | Research | Comms | Cross-functional",
  "use_case": "One or two sentences on when to use it.",
  "intended_audience": "Who this is for.",
  "recommended_model": "e.g., Claude Opus for deep analysis; Sonnet for drafting",
  "inputs_required": "What the user must supply before running.",
  "prompt_text": "Verbatim prompt text. Use {{placeholders}} for variable inputs.",
  "example_output": "3–5 line abbreviated sample showing what good output looks like.",
  "author": "Name / team",
  "last_updated": "YYYY-MM-DD",
  "status": "Draft",
  "sensitivity": "L1 | L2 | L3 | L4",
  "tags": ["tag1", "tag2"],
  "notes": "Optional caveats, gotchas, or related prompts."
}
```

- Always set `status` to `"Draft"` on first add. It becomes `"Approved"` only after a second person has tested it.
- Infer the sensitivity tier from the *inputs* the prompt is designed to consume (not the outputs). When uncertain, go one tier higher.
- Use `{{double_braces}}` for placeholders — not angle brackets or ALL_CAPS.
- Example outputs should show shape, not a full run — 3–5 lines is enough.
- Never include real confidential data in examples. Use synthetic or redacted placeholders.

### Deprecating a prompt

Set `status` to `"Deprecated"` in `prompts.json`. Leave the entry in the file — it becomes institutional memory and the site filters it to an archive view.

### Checking or assigning a sensitivity tier

Reference this table. The rule is: **tier is set by the inputs, not the outputs.**

| Tier | Data type | Tools allowed |
|------|-----------|---------------|
| **L1** | Public — open web, marketing, published regs | Any |
| **L2** | Internal — working docs, OKR notes, anonymized data | Enterprise-approved tools only |
| **L3** | Confidential — named third parties, unredacted contracts, financials, PII | Enterprise-tier with data controls; DRI sign-off |
| **L4** | Restricted — privileged comms, M&A terms, gov IDs, API keys | Human review by default; AI use requires explicit senior legal sign-off |

When in doubt, go one tier higher and note the reasoning in the `notes` field.

### Deploying the site

1. Push to GitHub.
2. Settings → Pages → Source: branch `main`, folder `/preview`.
3. Update `GITHUB_REPO` at the top of `preview/add-prompt.js` to the live repo URL.
4. Settings → Actions → General → enable read/write permissions and allow Actions to create PRs.

### Running locally

```bash
cd preview
python3 -m http.server 8000
# open http://localhost:8000
```

---

## Key principles to apply

The **Golden Prompting Formula**: ROLE + CONTEXT + TASK + FORMAT = Great Output.

When reviewing or improving prompts in the library, check that the prompt text includes all four components. If one is missing, flag it or suggest an addition.

When writing prompt text, use precise verbs: *draft, summarize, extract, compare, flag, classify*. Avoid vague asks.

When the user asks for prompting advice, draw from `best-practices.md` — especially the six power-user techniques and the "Always avoid" list.
