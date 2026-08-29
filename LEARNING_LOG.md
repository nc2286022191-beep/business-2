# Learning log

## 2026-08-29 — Quote calculation release check

- Issue: automatic calculations were tied to an earlier UI state, so edits to ratios could leave the displayed quote stale or absent.
- Correction: make the calculation action explicit and calculate from the current form state each time.
- Reusable lesson: for money-affecting workflows, use a clear final calculation step and test the complete input-to-result path, rather than relying on hidden reactive updates.
