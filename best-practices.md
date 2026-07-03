# Prompting best practices

Distilled from the [PLCS Legal Team AI Prompting briefing (March 2026)](https://docs.google.com/presentation/d/1bIIN_YtjdJwcXryjANSBUuxXe7-f6hz-GntOHkcSl3M/edit) and generalized for use across teams.

> An AI tool is only as good as the instruction you give it. A vague prompt gets a generic answer. A precise, context-rich prompt gets a polished, ready-to-use response. The difference is your prompt.

---

## 1. Where AI is already winning

Most teams are already using AI for one or more of these. Naming them out loud helps you spot where else AI can plug in:

- **Contracts + agreements** — draft, review, redline, summarize; extract key terms and flag unusual clauses.
- **Response drafting** — professional emails, letters, replies; routine through sensitive.
- **Diligence + KYC** — determine document requirements, draft response emails, manage certification letters.
- **Special projects** — research, summarize, draft memos, produce first-pass deliverables for complex work.
- **Process + admin** — checklists, templates, trackers, process documentation for repeatable workflows.
- **Proofreading + polish** — refine tone, check consistency, restructure arguments, catch errors before send.

---

## 2. The Golden Prompting Formula

**ROLE + CONTEXT + TASK + FORMAT = Great Output**

| Component | Question it answers | Example |
|-----------|---------------------|---------|
| **ROLE** | Who should the AI be? | "You are a legal counsel specializing in vendor agreements..." |
| **CONTEXT** | What's the situation? | "We received a request from Counterparty X asking for..." |
| **TASK** | What exactly do you need? | "Draft a response providing only the required documents..." |
| **FORMAT** | How should it look? | "Respond in 3 paragraphs, professional tone, under 200 words." |

Most of us do this intuitively. Doing it consistently is what separates a great prompt from a mediocre one.

---

## 3. A reusable template for high-stakes prompts

For complex, repeatable work — diligence reviews, multi-step analyses, anything you'll run more than once — use this three-step structure:

**Step 1 — SCOPE**

> As an `(EXPERT_TYPE)` with a background in `(EXPERTISE_TYPES)`, and in consideration of the following context `(INDUSTRIES, COUNTRIES, BUSINESS_CONTEXT, PRIOR_ANALYSIS)`, analyze the following `(CONTENT_SOURCES)` for `(DESIRED_PATTERNS)`. While analyzing, alert the following `(HUMAN_ROLES)` via the following `(ALERT_METHODS AND ANALYSIS_CONTEXT)` when specific human expertise could meaningfully improve analysis. Once the analysis is complete, store it in the `(ANALYSIS_REPOSITORY)`.

**Step 2 — RIGOR**

> Document and retain your sources, citations, and reasoning for all actions associated with each step.

**Step 3 — INTERNAL PROCESS IMPROVEMENT**

> Recommend improvements to this workflow such as qualitative inclusion of more context and content source for more accurate and desired outcomes. Make recommendations on how analysis is conducted so that overall analyses trend up in quality over time. Include any specific recommendations for improving analysis efficiency, context richness, and the preservation of accurate data provenance and citation.

Save the populated version back to the library when you find one that works well. The library compounds in value over time.

---

## 4. Good vs. Great prompts

Three quick before/after examples.

### Contract review

- **Weak:** "Review this contract."
- **Strong:** "You are a legal counsel for a financial firm. Review this vendor agreement and list the top 3 deviations from our standard terms, flagging each as Low/Medium/High risk. One sentence per item."

### Email response

- **Weak:** "Help me respond to this email."
- **Strong:** "You are drafting on behalf of a senior attorney. The counterparty requests a deadline extension. Decline professionally but offer an alternative date. Formal tone, under 100 words."

### Diligence / KYC request

- **Weak:** "Help me respond to this KYC request."
- **Strong:** "You are a legal ops specialist. A fund administrator requests KYC docs. We provide only: [list]. Draft a professional reply with exactly these items, noting anything unavailable. Under 150 words."

The weak versions produce generic output that is often missing required info, includes info we shouldn't share, and needs heavy editing. The strong versions are ready-to-send in two minutes.

---

## 5. Six techniques that separate power users

**1. Be specific about constraints.** Tell the AI what NOT to include. *"Do not share our EIN, bank details, or ownership structure unless explicitly required."*

**2. Reference attached documents.** Use `@` (or the equivalent attachment mechanism in your tool) and say *"Using the attached [document name], draft..."* This grounds the AI in your actual content.

**3. Iterate, don't restart.** If the output is close but not right, say *"Revise paragraph 2 to be more formal"* or *"Shorten this to 3 bullet points."* Build on what's good. Also: when you discover a better way to ask mid-conversation, tell the model to update its working instructions and restate them so you can save the new version back to the library.

**4. Specify your audience.** *"This goes to a sophisticated institutional investor"* vs. *"This is for a fund admin's compliance team."* The AI calibrates tone and depth accordingly.

**5. Ask for a plan first.** For complex tasks: *"Before drafting, list the key points you'll cover and flag any gaps in the information I've given you."* Approve the outline, then say *"Proceed."* Bonus: ask the model to suggest improvements to your prompt before it runs — it is unusually good at spotting underspecification in its own instructions.

**6. Request sources.** Ask the AI to cite its sources so you can quickly identify where (if at all) it is hallucinating. Useful framings:

- *"Cite the section number for every claim about the contract."*
- *"For every number you give me, cite the tab and cell range from the workbook."*
- *"If you are uncertain about a citation, say so explicitly rather than guessing."*
- *"Don't invent citations — if you don't have a source, mark the claim `[UNCITED]`."*

---

## 6. Match the model to the task

Generic guidance — adapt to the models your team actually uses:

- **Top-tier reasoning model** (e.g., Claude Opus) — heavy analysis, contract review, complex reasoning. Use when accuracy beats speed.
- **Workhorse model** (e.g., Claude Sonnet) — most drafting, summarization, day-to-day work. The default for the library.
- **Fast / cheap model** (e.g., Claude Haiku) — high-volume classification, routing, quick checks where you'd run the same prompt many times.

---

## 7. Always avoid

- Pasting confidential data into non-approved tools that have not been vetted by your org's security or legal team.
- Sending AI output without human review.
- Vague asks — use precise verbs: *draft, summarize, extract, compare.*
- Assuming context carries over — reset each session or create a Project.

---

## 8. Building the habit

Better prompts → better outputs → more time for high-value work. Two small actions that make this real:

1. Pick one technique from this guide and apply it to a real task this week.
2. When you find a prompt that works well, add it to your team's library so others benefit.
