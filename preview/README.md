# Preview site

The live site files for the **PL Infra Prompt Library**.

- `index.html` — the library app: filter, search, sort, copy, **upvote**, an in-page **Prompting Guide** tab, a display-name identity, dark mode, an **Add a prompt** modal (local drafting + `prompts.json` export), and a popularity leaderboard.
- `add-prompt.html` — the submission form (opens a pre-filled GitHub issue → PR). The canonical way to contribute a prompt to the shared library.
- `reference.html` — redirects to the in-page Prompting Guide (`index.html#guide`); kept so old links resolve. The previous standalone page is preserved as `reference.html.bak`.

## Local preview

```bash
cd preview
python3 -m http.server 8000
# open http://localhost:8000
```

Or `npx serve .`, or VS Code's Live Server.

## Deploy to GitHub Pages

1. In the repo's **Settings → Pages**:
   - **Source:** Deploy from a branch
   - **Branch:** `main` / `/preview`
2. Wait ~30–60 seconds.
3. Live at `https://<your-org>.github.io/<repo-name>/`.

**One config change before deploy:** open `add-prompt.js` and set `GITHUB_REPO` to your actual repo path (e.g., `"protocol/pl-infra-prompt-library"`). Without this, the submission form will open issues against a placeholder URL.

## Files

| File | Purpose |
|------|---------|
| `index.html` | The library app (single page: browse + guide + add-prompt modal). |
| `reference.html` | Redirect shim → `index.html#guide`. |
| `add-prompt.html` | Submission form (issue → PR flow). |
| `styles.css` | Design tokens + layout + components. Edit the `--brand-*` ramp to re-theme. |
| `app.js` | Filter, search, sort, voting, leaderboard, identity, theme, copy, add/edit modal, JSON export. Reads `window.PROMPTS` (from `prompts.js`). |
| `add-prompt.js` | Form validation + GitHub-issue routing. Edit `GITHUB_REPO` constant before deploy. |
| `prompts.json` | **The library data — source of truth.** The Action updates this when a submission is merged. |
| `prompts.js` | Auto-generated mirror of `prompts.json` as `window.PROMPTS`, so the site works over `file://` without a server. **Regenerate whenever `prompts.json` changes** (see below). |

### Keeping `prompts.js` in sync with `prompts.json`

`prompts.js` is just `window.PROMPTS = <contents of prompts.json>;`. After editing `prompts.json`, regenerate it:

```bash
cd preview
node -e "const d=require('fs').readFileSync('prompts.json','utf8');require('fs').writeFileSync('prompts.js','// Auto-generated from prompts.json — the source of truth.\n// Regenerate when prompts.json changes.\nwindow.PROMPTS = '+d.trim()+';\n')"
```
