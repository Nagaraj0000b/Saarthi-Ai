# Phase 07: Performance Optimization - Context

**Gathered:** 2026-04-03
**Status:** Ready for planning

<domain>
## Phase Boundary

Optimize Jetpack Compose recompositions and state management for Android screens. This includes ensuring all state is collected with lifecycle awareness, data models are stable, and large screens are refactored to minimize unnecessary UI updates.
</domain>

<decisions>
## Implementation Decisions

### State Collection Strategy
- **D-01:** Migrate all to `collectAsStateWithLifecycle`. This is the standard Android best practice and is already used in 90% of screens. Ensure consistency across the remaining screens (e.g., RecommendationListScreen).

### Data Model Immutability
- **D-02:** Use `@Immutable` / `@Stable` annotations. This is a simpler approach that works well with the Compose compiler and avoids the need to refactor all List types to ImmutableList.

### Recomposition Granularity
- **D-03:** Extract smaller Composables. Isolating recomposition to specific parts of the screen (especially in large screens like Dashboard) provides better long-term architecture than relying extensively on `derivedStateOf`.

### List Performance
- **D-04:** Enforce unique keys in `LazyColumn` items. This standard Compose best practice will prevent recreation of items during scroll or reorder in lists like WorkLogs, Earnings, and Reports.

### Claude's Discretion
None explicitly requested.

### Folded Todos
None.
</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Project Specifications
- `PROJECT.md` — High-level goals for Milestone v3.0 (Frontend Polish & Production Readiness).
- `REQUIREMENTS.md` § Phase 7 — Specific requirements: POL-03 (State Management), POL-04 (Immutability).
- `.gsd/ROADMAP.md` — Phase 7 success criteria: No unnecessary recompositions, lifecycle-aware state collection.

### Best Practices
No external specs referenced during discussion.
</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- Most screens already use `collectAsStateWithLifecycle` (e.g., `DashboardScreen`, `EarningsScreen`, `WorkLogsScreen`).

### Established Patterns
- State is collected in ViewModels using `StateFlow`.
- No `@Immutable` or `@Stable` annotations are currently used in data models.

### Integration Points
- Refactoring will primarily target large Composables like `DashboardScreen` and lists in `WorkLogsScreen`, `EarningsScreen`, and `ReportsScreen`.
</code_context>

<specifics>
## Specific Ideas
No specific requirements — open to standard approaches based on the decisions above.
</specifics>

<deferred>
## Deferred Ideas
None — discussion stayed within phase scope.
</deferred>

---

*Phase: 07-performance-optimization*
*Context gathered: 2026-04-03*
