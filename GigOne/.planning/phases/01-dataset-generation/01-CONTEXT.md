# Phase 1: Dataset Generation - Context

**Gathered:** 2026-04-02
**Status:** Ready for planning

<domain>
## Phase Boundary

Generating an unbiased dataset mapping jobs into 5 new categories with updated environmental impact logic.
</domain>

<decisions>
## Implementation Decisions

### Dataset Balance
- **D-01:** Distribute rows equally per category (each of the 5 categories gets 20% of rows, then divided equally among its platforms).
- **D-02:** Dataset size will be 50,000 rows.

### Environmental Nullification Approach
- **D-03:** Keep real weather/traffic values in row, but ensure rate multiplier is 1.0 for remote/freelance jobs so the model learns it doesn't matter.

### Claude's Discretion
- Code structure and refactoring inside `generate_dataset.py` to support these changes cleanly.
- Minor adjustments to ensure the new 5 categories are perfectly balanced to 50,000 total rows.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Project
- `.planning/PROJECT.md` — Project context and active requirements
- `.planning/ROADMAP.md` — Phase 1 goals and success criteria

### Implementation
- `ml_engine/generate_dataset.py` — Current dataset generation script

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `ml_engine/generate_dataset.py` is the primary asset to modify.

### Established Patterns
- Gaussian noise and rate multipliers for environmental impacts are used in the generator. We will modify the multiplier to 1.0 for specific job types.
- The `JOB_TYPES` mapping will be completely replaced with the new 5 categories.

### Integration Points
- Ensure the newly generated `synthetic_earnings.csv` aligns with the features expected by XGBoost training pipeline.

</code_context>

<specifics>
## Specific Ideas

No specific requirements — open to standard approaches based on these decisions.

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope
</deferred>

---

*Phase: 01-dataset-generation*
*Context gathered: 2026-04-02*