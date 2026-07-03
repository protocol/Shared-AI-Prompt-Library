# PL Infra Prompt Library

A shared collection of approved AI prompts for PL Infra — legal, finance, capital, operations, product, research, and comms. Live site, contribution-via-form, sensitivity-tier framework, and a reference page for prompting best practices.

**🔗 Live site:** `https://<your-org>.github.io/pl-infra-prompt-library/` *(replace once deployed)*

---

## What this is

The library lives in `preview/prompts.json` and is rendered as a small static site (`preview/index.html`). PL Infra members:

- Browse and filter prompts by category, sensitivity tier, and status.
- Copy any prompt to clipboard with one click.
- **Submit new prompts via the Add a prompt form** — no fork, no git. The form opens a pre-filled GitHub issue; a workflow turns the issue into a pull request for the library maintainer to review and merge. The new prompt appears in the live library on the next deploy.

The repo also includes a Reference page with the Golden Prompting Formula, a reusable template for high-stakes prompts, six power-user techniques, a tool reference, and the "Always avoid" list.

## What's in the repo

| Path | Purpose |
|------|---------|
| `preview/` | The live site — fork target, deployable to GitHub Pages. See `preview/README.md`. |
| `preview/prompts.json` | The library data. This is the source of truth. |
| `preview/prompts.js` | Auto-generated mirror of `prompts.json` (`window.PROMPTS`) so the site runs over `file://`. Regenerate when `prompts.json` changes. |
| `preview/index.html` | The library app — browse, filter, search, upvote, and an in-page Prompting Guide tab. |
| `preview/add-prompt.html` | Submission form (opens a pre-filled GitHub issue → PR). |
| `preview/reference.html` | Redirect → the in-page Prompting Guide. |
| `preview/styles.css` · `app.js` · `add-prompt.js` | Styling and behavior. |
| `.github/workflows/prompt-from-issue.yml` | Action that turns submission issues into PRs. |
| `.github/ISSUE_TEMPLATE/add-prompt.md` | Issue template for manual submission. |
| `CONTRIBUTING.md` | Entry schema and contribution workflow (in markdown). |
| `sensitivity-framework.md` | L1–L4 data-sensitivity tiers (in markdown). |
| `best-practices.md` | Long-form prompting best practices (in markdown). |
| `prompt-library-template.md` | Blank markdown template for teams that prefer markdown over a hosted site. |
| `LICENSE` | CC BY 4.0 — adapt freely, just credit. |

> `examples/` is deprecated — safe to delete the folder entirely.

## Deploy

1. Create a new GitHub repo (suggested name: `pl-infra-prompt-library`) and push this folder.
2. **Settings → Pages**:
   - Source: *Deploy from a branch*
   - Branch: `main` / folder: `/preview`
3. Update `GITHUB_REPO` at the top of `preview/add-prompt.js` to point at the new repo URL.
4. **Settings → Actions → General** → Workflow permissions: *Read and write permissions*, and check *Allow GitHub Actions to create and approve pull requests*. (Needed for the issue→PR workflow.)

That's it. The live site comes up in ~60 seconds. Submissions start working as soon as anyone files an issue with the `add-prompt` label (the form does this automatically).

## Run locally

```bash
cd preview
python3 -m http.server 8000
# open http://localhost:8000
```

## Roadmap (good first improvements)

- Slack / email notification when a new prompt PR opens.
- Per-prompt "request edit" button that opens an issue against an existing prompt.
- Archive section (auto-populated from prompts with `status: Deprecated`).
- Search-by-tag URL routing so prompts can be linked-to directly.

## Credits

Best-practices content adapted from the PLCS Legal Team AI Prompting briefing (March 2026). Design pattern adapted from The North Clause (PL blue palette instead of holiday red/green).
