package com.gigone.saarthi.util

import kotlinx.coroutines.flow.MutableSharedFlow
import kotlinx.coroutines.flow.asSharedFlow

/**
 * EventBus for triggering cross-ViewModel data refreshes.
 * E.g., DashBoard finishes a check-in -> triggers Earnings & WorkLogs to refresh in background.
 */
object EventBus {
    private val _refreshDataEvent = MutableSharedFlow<Unit>(replay = 0, extraBufferCapacity = 1)
    val refreshDataEvent = _refreshDataEvent.asSharedFlow()

    fun triggerRefresh() {
        _refreshDataEvent.tryEmit(Unit)
    }
}
