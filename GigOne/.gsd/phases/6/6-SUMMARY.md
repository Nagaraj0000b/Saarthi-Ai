---
phase: 06-hours-extraction
plan: 01
subsystem: Voice Chat
tags:
  - langgraph
  - hours-extraction
  - state-machine
depends_on:
  requires:
    - 05-earnings-extraction
  provides:
    - hours extraction node
    - multi-turn 5-step flow
  affects:
    - ml_engine/voice_chat_v2/nodes.py
    - ml_engine/voice_chat_v2/graph.py
tech_stack:
  added: []
  patterns:
    - Node retry fallback
key_files:
  created:
    - test_phase6.py
  modified:
    - ml_engine/voice_chat_v2/nodes.py
    - ml_engine/voice_chat_v2/graph.py
decisions:
  - Reuse the existing /api/chat-v2/raw-extract endpoint to pull hours instead of building a new logic branch.
  - Advance the conversation to final_summarization automatically when hours are detected and verified.
metrics:
  tasks_completed: 3
  total_tasks: 3
  duration_minutes: 2
  completion_date: 2023-11-06T12:00:00Z
---

# Phase 06 Plan 01: Hours Extraction Flow Summary

Successfully implemented the `hours_node` to handle the final extraction step in the 5-turn voice chat workflow.

## Overview

The system now naturally progresses from asking for earnings to extracting the hours the worker spent on the platform. After hours are captured, it seamlessly transitions into the `final_summarization` state, ending the extraction loop. The existing `raw-extract` node backend endpoint was used to keep logic consistent.

## Accomplishments

- Added `hours_node` to `nodes.py` to fetch, verify, and store `hours_worked`.
- Updated `graph.py` router to direct `hours_extraction` state to the new `hours_node`.
- Wrote `test_phase6.py` script simulating a fully robust 5-turn session with negative test paths (empty input, invalid input) handling retry flows specifically for hours extraction.

## Deviations from Plan

None - plan executed exactly as written.

## Self-Check: PASSED
- `test_phase6.py` passes all positive and negative scenarios.
- Commits completed individually.
- No remaining empty stubs found for variables flowing into UI.
