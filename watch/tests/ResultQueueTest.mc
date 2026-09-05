import Toybox.Lang;
import Toybox.Test;
import Toybox.Application.Storage;

//! Clears any persisted queue and forces ResultQueue to reload from
//! storage, so each test starts from a known-empty queue regardless of
//! what earlier tests (or earlier app runs) left behind.
function resetResultQueueForTest() as Void {
    Storage.deleteValue(ResultQueue.STORAGE_KEY);
    ResultQueue.load();
}

//! Builds a minimal, distinguishable queue entry.
function makeEntry(code as String, rc as String, hole as Number) as Dictionary {
    return {
        "code" => code,
        "rc" => rc,
        "hole" => hole,
        "ranks" => ["p1", "p2"] as Array<Object>
    };
}

//! Field-by-field comparison of two entries (Dictionary has no built-in
//! equals), including a deep check of the "ranks" array.
function entriesEqual(a as Dictionary, b as Dictionary) as Boolean {
    if (!(a.get("code") as String).equals(b.get("code") as String)) {
        return false;
    }
    if (!(a.get("rc") as String).equals(b.get("rc") as String)) {
        return false;
    }
    if (!((a.get("hole") as Number) == (b.get("hole") as Number))) {
        return false;
    }
    // toString() comparison is enough for the flat rank lists this module
    // stores and returns without ever inspecting.
    return (a.get("ranks") as Array<Object>).toString().equals((b.get("ranks") as Array<Object>).toString());
}

//! enqueue() followed by peek() returns an entry with the same contents —
//! the basic round trip through the in-memory queue.
(:test)
function resultQueueEnqueueThenPeekReturnsSameEntry(logger as Test.Logger) as Boolean {
    resetResultQueueForTest();

    var entry = makeEntry("ABCD", "hole-winner", 7);
    ResultQueue.enqueue(entry);

    var peeked = ResultQueue.peek();
    logger.debug("peeked = " + peeked);
    if (peeked == null) {
        return false;
    }
    return entriesEqual(peeked as Dictionary, entry);
}

//! size() reflects enqueues and drops as they happen.
(:test)
function resultQueueSizeReflectsEnqueuesAndDrops(logger as Test.Logger) as Boolean {
    resetResultQueueForTest();

    if (ResultQueue.size() != 0) {
        return false;
    }

    ResultQueue.enqueue(makeEntry("ABCD", "hole-winner", 1));
    ResultQueue.enqueue(makeEntry("ABCD", "hole-winner", 2));
    if (ResultQueue.size() != 2) {
        logger.debug("size after two enqueues = " + ResultQueue.size());
        return false;
    }

    ResultQueue.dropFirst();
    logger.debug("size after one drop = " + ResultQueue.size());
    return ResultQueue.size() == 1;
}

//! The reboot case: an entry enqueued in this process must still be there
//! after the in-memory queue is discarded and reloaded from
//! Application.Storage, simulating the watch app being killed and
//! restarted with the phone still out of range.
(:test)
function resultQueueSurvivesSaveLoadCycle(logger as Test.Logger) as Boolean {
    resetResultQueueForTest();

    var entry = makeEntry("WXYZ", "nearest-pin", 12);
    ResultQueue.enqueue(entry);

    // Simulate an app restart: drop the in-memory copy entirely and reload
    // from the persisted store, exactly like a freshly-started process
    // would with no other in-memory state to fall back on.
    ResultQueue._queue = null;
    ResultQueue.load();

    if (ResultQueue.size() != 1) {
        logger.debug("size after reload = " + ResultQueue.size());
        return false;
    }

    var reloaded = ResultQueue.peek();
    logger.debug("reloaded = " + reloaded);
    if (reloaded == null) {
        return false;
    }
    return entriesEqual(reloaded as Dictionary, entry);
}

//! peek() and dropFirst() on an empty queue are harmless: peek() is null,
//! and dropFirst() does not throw or change size.
(:test)
function resultQueueEmptyPeekIsNullAndDropIsHarmless(logger as Test.Logger) as Boolean {
    resetResultQueueForTest();

    if (ResultQueue.peek() != null) {
        return false;
    }

    ResultQueue.dropFirst();
    logger.debug("size after drop on empty = " + ResultQueue.size());
    return ResultQueue.size() == 0 && ResultQueue.peek() == null;
}

//! Past MAX_SIZE, enqueue drops the oldest entry rather than refusing the
//! newest or growing without bound.
(:test)
function resultQueueBoundedDropsOldestNotNewest(logger as Test.Logger) as Boolean {
    resetResultQueueForTest();

    var total = ResultQueue.MAX_SIZE + 1;
    for (var hole = 1; hole <= total; hole += 1) {
        ResultQueue.enqueue(makeEntry("ABCD", "hole-winner", hole));
    }

    if (ResultQueue.size() != ResultQueue.MAX_SIZE) {
        logger.debug("size = " + ResultQueue.size());
        return false;
    }

    // Entry for hole 1 was the oldest and should have been dropped; hole 2
    // is now the oldest survivor. Entry for the last hole enqueued (the
    // newest) must still be present.
    var oldestSurvivor = ResultQueue.peek() as Dictionary;
    logger.debug("oldest survivor hole = " + oldestSurvivor.get("hole"));
    if ((oldestSurvivor.get("hole") as Number) != 2) {
        return false;
    }

    for (var i = 0; i < ResultQueue.MAX_SIZE - 1; i += 1) {
        ResultQueue.dropFirst();
    }
    var newest = ResultQueue.peek() as Dictionary;
    logger.debug("newest = " + newest.get("hole"));
    return (newest.get("hole") as Number) == total;
}

//! At exactly MAX_SIZE, nothing is dropped — the bound only kicks in once
//! MAX_SIZE is exceeded, not at it.
(:test)
function resultQueueAtExactlyMaxSizeDropsNothing(logger as Test.Logger) as Boolean {
    resetResultQueueForTest();

    for (var hole = 1; hole <= ResultQueue.MAX_SIZE; hole += 1) {
        ResultQueue.enqueue(makeEntry("ABCD", "hole-winner", hole));
    }

    if (ResultQueue.size() != ResultQueue.MAX_SIZE) {
        logger.debug("size = " + ResultQueue.size());
        return false;
    }

    // The oldest entry (hole 1) must still be the one at the front — it
    // was never dropped.
    var oldest = ResultQueue.peek() as Dictionary;
    logger.debug("oldest = " + oldest.get("hole"));
    return (oldest.get("hole") as Number) == 1;
}

//! enqueue() must not store the caller's dictionary by reference, and
//! peek() must not hand back the dictionary living in the queue: mutating
//! either copy afterward must not change what the queue holds.
(:test)
function resultQueueCopiesOnTheWayInAndOut(logger as Test.Logger) as Boolean {
    resetResultQueueForTest();

    var original = makeEntry("ABCD", "hole-winner", 3);
    ResultQueue.enqueue(original);

    // Mutate the dictionary already passed to enqueue().
    original.put("hole", 999);
    (original.get("ranks") as Array<Object>).add("intruder");

    var firstPeek = ResultQueue.peek() as Dictionary;
    if ((firstPeek.get("hole") as Number) != 3) {
        logger.debug("hole after mutating the enqueued dict = " + firstPeek.get("hole"));
        return false;
    }
    if ((firstPeek.get("ranks") as Array<Object>).size() != 2) {
        logger.debug("ranks after mutating the enqueued dict = " + firstPeek.get("ranks"));
        return false;
    }

    // Mutate what peek() just returned.
    firstPeek.put("hole", 111);
    (firstPeek.get("ranks") as Array<Object>).add("intruder2");

    var secondPeek = ResultQueue.peek() as Dictionary;
    if ((secondPeek.get("hole") as Number) != 3) {
        logger.debug("hole after mutating a peeked dict = " + secondPeek.get("hole"));
        return false;
    }
    return (secondPeek.get("ranks") as Array<Object>).size() == 2;
}

//! enqueue() must leave the in-memory queue exactly as it was before the
//! call, not holding an entry that storage never actually accepted.
//!
//! The failure is forced through `ResultQueue._forceSaveFailureForTest`
//! rather than by actually exhausting the Object Store: a genuinely
//! oversized entry was tried first, and on this device it surfaced as a
//! fatal, uncatchable Out-Of-Memory error rather than the catchable
//! Lang.StorageFullException it was meant to stand in for — not something
//! a unit test can rely on. This module-variable seam is what the task
//! brief calls "a monkey-patched module variable".
(:test)
function resultQueueFailedSaveDoesNotCorruptInMemoryState(logger as Test.Logger) as Boolean {
    resetResultQueueForTest();

    var kept = makeEntry("ABCD", "hole-winner", 1);
    ResultQueue.enqueue(kept);

    ResultQueue._forceSaveFailureForTest = true;
    var threw = false;
    try {
        ResultQueue.enqueue(makeEntry("HUGE", "nearest-pin", 2));
    } catch (ex instanceof ResultQueue.ForcedSaveFailure) {
        threw = true;
    } finally {
        ResultQueue._forceSaveFailureForTest = false;
    }

    if (!threw) {
        logger.debug("expected enqueue to fail while save() is forced to throw");
        return false;
    }

    if (ResultQueue.size() != 1) {
        logger.debug("size after failed save = " + ResultQueue.size());
        return false;
    }
    var survivor = ResultQueue.peek() as Dictionary;
    return entriesEqual(survivor, kept);
}

//! Same failure handling, but for dropFirst(): a failed save() must leave
//! the queue exactly as it was before the drop.
(:test)
function resultQueueFailedSaveDoesNotCorruptDropFirst(logger as Test.Logger) as Boolean {
    resetResultQueueForTest();

    ResultQueue.enqueue(makeEntry("ABCD", "hole-winner", 1));
    ResultQueue.enqueue(makeEntry("ABCD", "hole-winner", 2));

    ResultQueue._forceSaveFailureForTest = true;
    var threw = false;
    try {
        ResultQueue.dropFirst();
    } catch (ex instanceof ResultQueue.ForcedSaveFailure) {
        threw = true;
    } finally {
        ResultQueue._forceSaveFailureForTest = false;
    }

    if (!threw) {
        logger.debug("expected dropFirst to fail while save() is forced to throw");
        return false;
    }

    if (ResultQueue.size() != 2) {
        logger.debug("size after failed drop = " + ResultQueue.size());
        return false;
    }
    var oldest = ResultQueue.peek() as Dictionary;
    return (oldest.get("hole") as Number) == 1;
}
