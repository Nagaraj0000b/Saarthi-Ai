---
phase: 08-parallel-integration
verified: 2024-05-24T12:00:00Z
status: gaps_found
score: 2/3 must-haves verified
gaps:
  - truth: "Android app can send audio to the Node backend for the new LangGraph pipeline."
    status: failed
    reason: "The audio reply functionality in Android unconditionally uses the V1 API endpoint, ignoring the V2 toggle switch."
    artifacts:
      - path: "android/app/src/main/java/com/gigone/saarthi/ui/screens/DashboardViewModel.kt"
        issue: "handleMicPressOut() calls chatApi.sendAudioReply() for both V1 and V2, never invoking sendAudioReplyV2()"
    missing:
      - "Add conditional block `if (_useV2Chat.value)` in `handleMicPressOut()` to invoke `chatApi.sendAudioReplyV2(...)`"
human_verification:
  - test: "End-to-End Chat Turn via LangGraph"
    expected: "When V2 toggle is enabled, user speech should be processed by the ML Engine and a suitable response should be heard, driving the conversation forward."
    why_human: "Need to verify real-time voice latency and accurate turn-taking through the ML module."
---

# Phase 8: Parallel Integration Verification Report

**Phase Goal:** Hook up the new LangGraph voice module to the Kotlin app frontend, tested side-by-side with the old chatbot.
**Verified:** 2024-05-24T12:00:00Z
**Status:** gaps_found
**Re-verification:** No

## Goal Achievement

### Observable Truths

| #   | Truth   | Status     | Evidence       |
| --- | ------- | ---------- | -------------- |
| 1   | User can seamlessly toggle between old chatbot and new LangGraph chatbot in the Android UI. | ✓ VERIFIED | Toggle UI added in `DashboardScreen.kt` and bound to `useV2Chat` in `DashboardViewModel.kt`. |
| 2   | Android app can send audio to the Node backend for the new LangGraph pipeline. | ✗ FAILED   | `DashboardViewModel.kt` fails to call `sendAudioReplyV2` during mic press release. |
| 3   | The LangGraph pipeline returns the correct next state and spoken reply. | ✓ VERIFIED | Python endpoint `/chat/turn` accepts and invokes the graph, returning state to Node backend. |

**Score:** 2/3 truths verified

### Required Artifacts

| Artifact | Expected    | Status | Details |
| -------- | ----------- | ------ | ------- |
| `ml_engine/main.py` | LangGraph /chat/turn API endpoint | ✓ VERIFIED | POST endpoint `/chat/turn` implemented and wired to graph app. |
| `server/controllers/chatV2Controller.js` | V2 Node endpoints mapping Android requests to Python LangGraph | ✓ VERIFIED | `startChatV2` and `replyChatV2` map requests to ML Engine via Axios. |
| `android/app/src/main/java/com/gigone/saarthi/ui/screens/DashboardScreen.kt` | V2 toggle UI | ✓ VERIFIED | UI switch visually renders and responds to state. |

### Key Link Verification

| From | To  | Via | Status | Details |
| ---- | --- | --- | ------ | ------- |
| Android App | Node /api/chat-v2/start or /api/chat-v2/reply | ChatApi.kt Retrofit calls | ⚠️ PARTIAL | `start` is wired, but `reply` is orphaned in ViewModel. |
| Node /api/chat-v2/reply | Python ML Engine /chat/turn | HTTP POST request with VoiceChatState | ✓ WIRED | `replyChatV2` correctly calls `127.0.0.1:8000/chat/turn`. |

### Data-Flow Trace (Level 4)

| Artifact | Data Variable | Source | Produces Real Data | Status |
| -------- | ------------- | ------ | ------------------ | ------ |
| `DashboardViewModel.kt` | `_messages` | `sendAudioReply` / `sendAudioReplyV2` | No | ✗ DISCONNECTED — V2 flow drops back to V1 due to missing logic. |
| `chatV2Controller.js` | `reply` / `step` | `/chat/turn` (Python) | Yes | ✓ FLOWING — Valid request proxying logic written. |

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
| -------- | ------- | ------ | ------ |
| None testable standalone without active servers. | N/A | N/A | ? SKIP (no runnable entry points) |

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
| ----------- | ---------- | ----------- | ------ | -------- |
| PHASE-8 | 8-PLAN.md | Parallel Integration | ✗ BLOCKED | Missing Android logic blocks full integration. |

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
| ---- | ---- | ------- | -------- | ------ |
| `DashboardViewModel.kt` | L290+ | Orphaned Method | 🛑 Blocker | LangGraph pipeline never receives user audio. |

### Human Verification Required

1. **End-to-End Chat Turn via LangGraph**
   - **Test:** With V2 switch active, press mic, say a test sentence, wait for response.
   - **Expected:** Expected response from LangGraph state transitions.
   - **Why human:** Verify accurate state management and acceptable audio/turn-taking latency.

### Gaps Summary

The Android frontend UI toggle works, and the backend pipelines are ready. However, the `handleMicPressOut()` method in the Android App ignores the V2 toggle entirely, continually forwarding voice files to the old V1 backend logic. Without a conditional check to use `chatApi.sendAudioReplyV2()`, the LangGraph chatbot is effectively deaf.

---

_Verified: 2024-05-24T12:00:00Z_
_Verifier: the agent (gsd-verifier)_
