# Learning log

## 2026-08-31 — Live sharing must be read-only and revocable

- Issue: a downloaded spreadsheet becomes stale immediately, while sharing the internal workspace would expose edit controls and financial data.
- Correction: create a separate public read-only inventory view scoped to one team group, backed by the same live listing data. Use a random `xiaokashanghang` link code and allow the link to be closed from the internal inventory page.
- Reusable lesson: share a minimal projection of live data, not the operational back office; every external link should have a narrow scope and a revocation path.

## 2026-08-31 — Shared teams require durable scope records

- Issue: per-user filters prevent coworkers from operating from the same source of truth, while unrestricted team views expose data across unrelated teams.
- Correction: record a team group on users and newly created operational records, scope non-owner access to that group, and make the loss flow parse pasted source facts before its explicit save action.
- Reusable lesson: collaboration permissions must be attached to durable records at creation time; derive previews automatically, but keep the financial write as a reviewable confirmation.

## 2026-08-30 — Separate financial facts by business purpose

- Issue: mixing sold-order margin with leftover-asset loss in one daily ledger hides both the real sales profit and the source of the loss.
- Correction: add a standalone loss ledger. Each record stores its date, order number, AW, full-durability six-head, six-armor, and 45-bag counts; the server calculates merchant price, original price, and loss. Monthly profit subtracts the separately stored monthly loss.
- Reusable lesson: store source facts, rules, and financial summaries in separate layers. A traceable cost must never depend on a temporary browser-only number or manual mental arithmetic.

## 2026-08-29 — Quote calculation release check

- Issue: automatic calculations were tied to an earlier UI state, so edits to ratios could leave the displayed quote stale or absent.
- Correction: make the calculation action explicit and calculate from the current form state each time.
- Reusable lesson: for money-affecting workflows, use a clear final calculation step and test the complete input-to-result path, rather than relying on hidden reactive updates.

## 2026-08-30 — Cloud calculation versus cloud persistence

- Issue: the page displayed calculations but its listing action was not connected to the database, so the workflow could appear complete without creating an internal record.
- Correction: separate the non-persistent calculation step from one explicit, authenticated “seller agreed, list to WPS” action that creates the cloud order.
- Reusable lesson: in any workflow involving money or commitments, clearly distinguish preview from the single audited action that changes shared records.

## 2026-08-30 — Serverless authentication budget

- Issue: registration reached the database but stopped before the first write because the password-derivation work exceeded the Cloudflare Pages execution budget.
- Correction: use a bounded PBKDF2 workload suited to the serverless runtime and show a clear user-facing error if a non-JSON infrastructure error occurs.
- Reusable lesson: authentication controls must be verified in the actual hosting runtime; a secure-looking local implementation is not sufficient if its cost exceeds the platform limit.

## 2026-08-30 — Role-based workspace navigation

- Issue: quoting, inventory, ledger, and administration controls appeared together, making the next action unclear and increasing the chance of accidental actions.
- Correction: separate the same workflows into role-aware work areas, with a concise overview first and a team-management area visible only to the super administrator.
- Reusable lesson: when a tool has several independent workflows, organize the interface around a user's current job and permissions, then verify each navigation route without changing live records.

## 2026-08-30 — AI-assisted customer replies

- Issue: conversational AI can make unsupported pricing promises or reveal internal worker economics when given unrestricted business context.
- Correction: keep calculation deterministic, provide the model only a regenerated customer-safe quote, and require the employee to copy and review the draft before sending.
- Reusable lesson: use AI for language and classification, while keeping financial decisions and irreversible actions in explicit rule-based workflows with a human checkpoint.

## 2026-08-30 — Temporary serverless AI service

- Issue: a hosted AI feature was needed before the planned domestic server could be formally deployed.
- Correction: keep the customer-facing AI adapter server-side in the existing Pages Function, store its API key only as an encrypted environment secret, and make the adapter replaceable during later migration.
- Reusable lesson: for temporary infrastructure, isolate provider-specific code behind one service boundary and preserve the financial workflow unchanged so a later hosting migration is a deployment task, not a business-logic rewrite.

## 2026-08-30 — High-frequency customer support first release

- Issue: a model-backed assistant cannot serve immediately when its provider credential or messaging-channel integration is not yet configured.
- Correction: release a deterministic reply layer for the small set of repetitive, low-risk customer questions, and make sensitive cases explicitly hand off to a human.
- Reusable lesson: begin automation with bounded, reviewable rules for repetitive work; add generative AI only where it improves coverage without weakening human control over money, commitments, or disputes.

## 2026-08-30 — Single-source inventory views

- Issue: a visual inventory table can drift from the actionable listing library if staff must enter the same order twice.
- Correction: derive every display column from the active listing record and refresh it through the same load path used after listing, sale, and deletion.
- Reusable lesson: for operational summaries, render from the source of truth rather than maintaining a parallel manual table.

## 2026-08-30 — Human-written quantities and scoped management views

- Issue: business inputs arrive in Chinese numeral forms and an owner needs oversight without granting team-wide visibility to every role.
- Correction: normalize common Chinese and financial numerals before money calculations, keep inventory filters client-side on an owner-only complete dataset, and preserve per-user server-side access controls for everyone else.
- Reusable lesson: accept human-friendly input at the edge, but keep calculations and permission checks deterministic at the system boundary.
