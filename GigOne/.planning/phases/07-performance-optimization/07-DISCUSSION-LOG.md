# Phase 07: Performance Optimization - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-04-03
**Phase:** 07-performance-optimization
**Areas discussed:** State Collection Strategy, Data Model Immutability, Recomposition Granularity, List Performance

---

## State Collection Strategy

| Option | Description | Selected |
|--------|-------------|----------|
| Migrate all to collectAsStateWithLifecycle (Recommended) | Standard Android best practice, already used in 90% of screens. Easy to adopt everywhere. | ✓ |
| Create a custom extension/wrapper | Creates a centralized wrapper to enforce consistency but adds abstraction. | |

**User's choice:** Migrate all to collectAsStateWithLifecycle (Recommended)
**Notes:** Automatically selected based on user intent to proceed.

---

## Data Model Immutability

| Option | Description | Selected |
|--------|-------------|----------|
| Use @Immutable / @Stable annotations (Recommended) | Simple and works well with Compose compiler. Good for existing data classes. | ✓ |
| Migrate to kotlinx.collections.immutable | Stronger guarantees but requires refactoring all List types to ImmutableList. | |

**User's choice:** Use @Immutable / @Stable annotations (Recommended)
**Notes:** Automatically selected based on user intent to proceed.

---

## Recomposition Granularity

| Option | Description | Selected |
|--------|-------------|----------|
| Extract smaller Composables (Recommended) | Isolates recomposition to specific parts of the screen. Better long-term architecture. | ✓ |
| Use derivedStateOf extensively | Keeps large components but optimizes state reads. Faster to implement. | |

**User's choice:** Extract smaller Composables (Recommended)
**Notes:** Automatically selected based on user intent to proceed.

---

## List Performance

| Option | Description | Selected |
|--------|-------------|----------|
| Enforce unique keys in LazyColumn items (Recommended) | Standard Compose best practice to prevent recreation during scroll/reorder. | ✓ |
| Implement memoized filtering / diffing | Custom logic to prevent UI updates unless list data genuinely changes. | |

**User's choice:** Enforce unique keys in LazyColumn items (Recommended)
**Notes:** Automatically selected based on user intent to proceed.

---

## Claude's Discretion

None explicitly requested.

## Deferred Ideas

None discussed.