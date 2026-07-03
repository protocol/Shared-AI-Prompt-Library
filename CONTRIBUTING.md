# Contributing to the prompt library

This document covers what each prompt entry should contain and the workflow for adding new ones.

## Prompt entry schema

Every prompt added to the library should include the following fields.

| Field | Required? | Description |
|-------|-----------|-------------|
| **Title** | Yes | Short, descriptive name (e.g., "NDA first-pass triage"). |
| **Category** | Yes | One of: Legal, Finance, Operations, Product, Research, Comms, Cross-functional. |
| **Use case** | Yes | When to use this prompt — one or two sentences. |
| **Intended audience** | Yes | Who this is for (e.g., legal team, ops, anyone). |
| **Recommended model** | Yes | e.g., Claude Opus for analysis; Sonnet for drafting; Haiku for high-volume classification. |
| **Inputs required** | Yes | What the user must supply (document, list, context) before running. |
| **Prompt text** | Yes | The actual prompt, verbatim. Use placeholders like `{{document}}` for variable inputs. |
| **Example output** | Yes | Abbreviated example so contributors can see what "good" looks like. |
| **Author / owner** | Yes | Who created or maintains this prompt. |
| **Last updated** | Yes | Date of most recent edit. |
| **Status** | Yes | Draft \| Approved \| Deprecated. |
| **Sensitivity** | Yes | L1 \| L2 \| L3 \| L4 — see `sensitivity-framework.md`. |
| **Tags** | Yes | Free-form tags for search (e.g., contracts, NDA, summarization, EU). |
| **Notes** | Optional | Caveats, gotchas, links to related prompts. |

### Optional fields (add as needed)

- **Connectors / tools used** — e.g., Gmail, Google Drive, Notion, Slack.
- **Skill or plugin it pairs with** — if you have one.
- **Version history** — useful for high-value prompts you iterate on.

## How to add a prompt

1. Pick a category section. Use **Cross-functional** if it doesn't fit cleanly.
2. Copy the entry template from `prompt-library-template.md` and fill it in.
3. Set **Status** to **Draft**.
4. Ask one colleague (ideally outside your function) to test the prompt and confirm it produces useful output.
5. Once validated, change **Status** to **Approved** and announce it in your team channel.
6. Revisit your prompts quarterly. Update **Last updated**; move stale prompts to the Archive.

## Promotion criteria (Draft → Approved)

A prompt is ready to be promoted when:

- It has run successfully on at least two different inputs.
- The example output reflects the kind of result a teammate should actually expect.
- The sensitivity tier is set and matches the data the prompt is designed to consume.
- A second person (not the author) has tested it and confirmed it works.

## Deprecation

Prompts get retired when:

- A better version exists in the library.
- The underlying workflow has changed (e.g., new tool, new template).
- The model or tool it depends on is no longer available.

When deprecating, move the entry to the Archive with a one-line note explaining why and (if relevant) which prompt replaces it.

## Style

- Prompts should be **verbatim** — what you'd actually paste into the model.
- Use placeholders (`{{thing}}`) for variable inputs rather than hard-coding examples.
- Keep example outputs short — three to five lines is usually enough to communicate the shape.
- Cite the model version you tested with if behavior is model-sensitive.

## Code of conduct

- Never include real confidential data in example inputs or outputs. Use synthetic or fully redacted placeholders.
- Credit prompts you adapt from other teams in your repo's Notes field.
- If a prompt depends on a paid tool or specific account, say so in Notes.
