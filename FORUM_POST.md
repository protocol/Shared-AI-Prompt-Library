# LabOS Forum post — copy / paste source

This file is for the forum post, not the repo itself. Once you've published the repo and deployed the preview, paste the post body (or a tightened version) into the LabOS Forum with the URLs filled in.

---

## GitHub repo metadata

**Repo name (suggested):**

```
ai-prompt-library-template
```

**Repo "About" description (the short blurb at the top of the repo page, ~120 chars):**

> A forkable template for a shared AI prompt library — schema, contribution workflow, sensitivity tiers, best practices, and a live preview.

**Suggested topics (tags) for the repo:**

`ai` · `prompts` · `prompt-engineering` · `prompt-library` · `template` · `team-workflows` · `documentation` · `protocol-labs`

---

## LabOS post

### Title options (pick one)

1. **A forkable AI prompt library template — with a live preview, sensitivity tiers, and the prompting best practices we use.** *(recommended)*
2. **Sharing an AI prompt library template (schema + sensitivity framework + live preview).**
3. **AI Prompt Library Template: turn one-off prompts into a team asset (fork the template, host the preview).**
4. **Stop reinventing prompts: a template + live preview for any team in the network.**

### Suggested post description (the short blurb on the forum index, ~200 chars)

> A forkable template for building a shared AI prompt library: standard schema, contribution workflow, L1–L4 data-sensitivity framework, prompting best practices distilled from a recent legal-team training, and a deployable live preview.

---

### Body

**Sharing a reusable template for building a shared AI prompt library inside any team — repo + live preview included.**

🔗 **Repo:** [github.com/your-org/ai-prompt-library-template](https://github.com/your-org/ai-prompt-library-template) *(replace once published)*
🔗 **Live preview:** [your-org.github.io/ai-prompt-library-template/](https://your-org.github.io/ai-prompt-library-template/) *(replace once deployed to GitHub Pages)*
🔗 **Interim preview (single-file, no server):** https://claude.ai/code/artifact/259162b9-631a-4619-be47-3c68cace19fd *(private by default — share before linking publicly; replace with the Pages URL once deployed)*

---

**The problem**

Most teams in the network are already using AI for real work — contracts, research, drafting, summarization, triage, you name it. But the prompts that actually work tend to live in scattered chats, individual notes apps, and Slack DMs. Three things happen as a result:

- People reinvent prompts that someone on the team has already solved.
- Quality is uneven — some folks have refined their prompting craft over months, others are still typing "review this contract" and getting generic output.
- There's no shared memory of what's been tried, what works, or where data sensitivity made a prompt unsafe to run.

A shared prompt library fixes all three. It turns one-off prompts into a compounding team asset.

**What's in the template**

- **A blank library template** organized by function (Legal, Finance, Operations, Product, Research, Comms, Cross-functional) with a standard entry schema.
- **A contribution workflow** — what fields each entry needs, Draft → Approved promotion criteria, deprecation rules.
- **An L1–L4 sensitivity framework** for tagging prompts by the data they consume, with tool whitelists and approver paths per tier. The rule that matters: *a prompt's tier is set by its inputs, not its outputs.*
- **Best practices** distilled from a recent legal-team prompting briefing — the Golden Formula (Role + Context + Task + Format), a reusable Scope / Rigor / Process Improvement template, six power-user techniques, and what to always avoid.
- **Three worked examples** (contract redline, meeting briefing, leadership update from notes) so adopters see what "good" looks like before they start writing their own.
- **A deployable web preview** — a static HTML site (PL Blue theme, light/dark mode, filterable by category / sensitivity / status, with copy-to-clipboard) that you can publish to GitHub Pages in about 60 seconds. Fork, swap in your team's prompts, and you've got a shareable URL.

**Who it's for**

Any team or working group in the network that uses AI tools regularly and wants to share what works. Operations, legal, finance, capital, research, product, comms — the template is function-agnostic. Particularly useful for lab leads or chiefs of staff who want a low-friction way to capture institutional knowledge about AI use.

**How to use it**

Fork the repo into your team's GitHub org, pick the categories that fit your team, seed it with three to five prompts you already use, drop in the sensitivity framework, and (optionally) deploy the preview site so the rest of your team can browse the library in a UI rather than scrolling markdown. The READMEs walk through both paths. The whole thing is intentionally simple — markdown + static HTML + plain JS, no build step, no dependencies.

**What I'd love feedback on**

I'd love to hear from anyone who tries this:

- Did the category structure work for your team, or did you need to add/remove categories?
- Did the L1–L4 sensitivity framework map cleanly to your existing data classification scheme?
- Are there fields missing from the entry schema that you found yourself wanting?
- Did the best-practices guide land for newer prompters on your team, or is it pitched at the wrong level?
- Did the preview site work as a tool for actually finding and reusing prompts day-to-day, or did you end up back in the markdown?
- Any examples you'd like to see added?

Open an issue or PR on the repo, or reply here. I'll consolidate what comes back and ship a v0.2.

**A few specific use cases I'd love to see**

- Research teams capturing prompts for literature review and citation tracing.
- Product teams capturing prompts for spec drafting and roadmap analysis.
- Engineering teams adapting the schema for code-review and debugging prompts.
- Any team that has a "we use AI for this" workflow that's currently undocumented — this is the format to capture it in.

License: CC BY 4.0 — adapt freely, just credit.

— Theresa Therriault, PL Infra

---

## Hashtags / categories for the forum post

Depending on what LabOS uses — likely something like: `#ai`, `#tools`, `#templates`, `#operations`, `#legal-ops`. Adjust to the actual taxonomy.
