# Phase 1: Dataset Generation - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-04-02
**Phase:** 01-dataset-generation
**Areas discussed:** Dataset Balance, Environmental Nullification Approach

---

## Dataset Balance

| Option | Description | Selected |
|--------|-------------|----------|
| Equal per category | Each of the 5 categories gets 20% of rows, then divided equally among its platforms. | ✓ |
| Equal per platform | Each platform (Uber, Swiggy, etc.) gets the exact same number of rows. | |
| Realistic weighting | Weight heavily towards the most popular gigs (Ride Hailing, Delivery). | |

**User's choice:** Equal per category

| Option | Description | Selected |
|--------|-------------|----------|
| 20,000 rows | Keep 20,000 rows (Recommended for current model size) | |
| 50,000 rows | Increase to 50,000 rows (Better for 5 categories but larger model size) | ✓ |

**User's choice:** 50,000 rows

---

## Environmental Nullification Approach

| Option | Description | Selected |
|--------|-------------|----------|
| Ignore modifiers | Keep real weather values in row, but ensure rate multiplier is 1.0 (Model learns it doesn't matter) | ✓ |
| Overwrite features | Force weather to 'Clear' and traffic to 'clear' for all remote jobs during generation | |

**User's choice:** Ignore modifiers

---

## Claude's Discretion

Code structure and refactoring inside `generate_dataset.py` to support these changes cleanly.
Minor adjustments to ensure the new 5 categories are perfectly balanced to 50,000 total rows.

## Deferred Ideas

None