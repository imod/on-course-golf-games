import Toybox.Lang;
import Toybox.Application.Storage;

//! Persistent queue of pending result submissions for the watch's retry loop.
//!
//! A Fenix has no internet connection of its own — it relays through the
//! paired phone over BLE, which drops constantly on a golf course. Every
//! submission is written here, through `Application.Storage`, before any
//! network call is attempted, so an entry survives the app closing, the
//! watch rebooting, and the phone being out of range.
//!
//! An entry is `{code, rc, hole, ranks}` — everything needed to retry with
//! no other state. This module never inspects those fields; it only stores
//! and returns whole entries in FIFO order.
//!
//! The server's `POST /api/w/:code/result` replaces rather than appends for
//! a given (challenge, hole), so re-sending an entry after an uncertain
//! failure corrects it instead of duplicating it — that's what makes this
//! queue safe to retry blindly from the front.
module ResultQueue {

    //! Key the whole queue (an Array of entries) is stored under.
    const STORAGE_KEY as String = "resultQueue";

    //! Far beyond a real round (a round is at most a few dozen entries).
    //! Past this, the oldest entry is dropped to make room for the newest,
    //! rather than refusing the newest or growing storage without limit.
    const MAX_SIZE as Number = 200;

    //! In-memory mirror of the persisted queue. Null until the first
    //! load/enqueue, so a fresh app process picks up whatever was
    //! persisted rather than starting from an assumed-empty queue.
    var _queue as Array<Dictionary> or Null = null;

    //! Loads `_queue` from storage if it hasn't been loaded into this
    //! process yet. Every public function goes through this first, so
    //! nothing depends on an explicit load() call having happened.
    function ensureLoaded() as Void {
        if (_queue == null) {
            load();
        }
    }

    //! Loads the queue from `Application.Storage`, replacing whatever is
    //! currently in memory. An absent or malformed stored value is treated
    //! as an empty queue.
    function load() as Void {
        var stored = Storage.getValue(STORAGE_KEY);
        if (stored instanceof Array) {
            _queue = stored as Array<Dictionary>;
        } else {
            _queue = [] as Array<Dictionary>;
        }
    }

    //! Set by a test to make save() fail predictably instead of writing to
    //! Application.Storage. Always false outside of tests, and not part of
    //! the module's public interface — genuinely exhausting the Object
    //! Store to exercise save() failure handling is neither reliable nor
    //! safe to do from a unit test: on this device it risks a fatal,
    //! uncatchable Out-Of-Memory error instead of the catchable
    //! `Lang.StorageFullException` it's meant to stand in for.
    var _forceSaveFailureForTest as Boolean = false;

    //! Thrown by save() when `_forceSaveFailureForTest` is set, standing in
    //! for a real `Application.Storage` failure such as
    //! `Lang.StorageFullException`.
    class ForcedSaveFailure extends Lang.Exception {
        function initialize() {
            Exception.initialize();
            self.mMessage = "forced save failure for test";
        }
    }

    //! Writes the in-memory queue to `Application.Storage`.
    function save() as Void {
        if (_forceSaveFailureForTest) {
            throw new ForcedSaveFailure();
        }
        Storage.setValue(STORAGE_KEY, _queue as Array<Dictionary>);
    }

    //! Deep-enough-copies one entry so neither the caller's dictionary nor
    //! the internal queue ever alias each other: mutating one must never
    //! change the other. Mirrors `Ranking.copyGroup`'s reasoning, extended
    //! to also copy any tie sub-array inside "ranks".
    function copyEntry(entry as Dictionary) as Dictionary {
        return {
            "code" => entry.get("code"),
            "rc" => entry.get("rc"),
            "hole" => entry.get("hole"),
            "ranks" => copyRanks(entry.get("ranks") as Array<Object>)
        } as Dictionary;
    }

    //! Shallow-copies `ranks`, and also copies any element that is itself
    //! an Array (a tie), so no array inside the copy is shared with the
    //! original.
    function copyRanks(ranks as Array<Object>) as Array<Object> {
        var result = [] as Array<Object>;
        for (var i = 0; i < ranks.size(); i += 1) {
            var item = ranks[i];
            if (item instanceof Array) {
                result.add((item as Array<String>).slice(0, null) as Array<String>);
            } else {
                result.add(item);
            }
        }
        return result;
    }

    //! Appends a copy of `entry` and persists immediately. If this pushes
    //! the queue past `MAX_SIZE`, the oldest entry (or entries) are dropped
    //! — never the one just added.
    //!
    //! The in-memory queue is only updated to the new contents once
    //! `save()` has returned without throwing. If `Storage.setValue` throws
    //! (for example `Lang.StorageFullException`), `_queue` is left exactly
    //! as it was before this call and the exception is rethrown — the
    //! module never reports an entry as queued that storage doesn't
    //! actually hold, even to a caller that catches the exception and
    //! continues.
    function enqueue(entry as Dictionary) as Void {
        ensureLoaded();
        var previous = _queue as Array<Dictionary>;
        var updated = previous.slice(0, null) as Array<Dictionary>;
        updated.add(copyEntry(entry));
        while (updated.size() > MAX_SIZE) {
            updated = updated.slice(1, null) as Array<Dictionary>;
        }
        _queue = updated;
        try {
            save();
        } catch (ex) {
            _queue = previous;
            throw ex;
        }
    }

    //! Returns a copy of the oldest entry without removing it, or null if
    //! the queue is empty. A copy, not the entry living in the queue, so a
    //! caller mutating what it gets back cannot corrupt the queue without
    //! going through enqueue()/save().
    function peek() as Dictionary or Null {
        ensureLoaded();
        var queue = _queue as Array<Dictionary>;
        if (queue.size() == 0) {
            return null;
        }
        return copyEntry(queue[0]);
    }

    //! Number of entries currently queued.
    function size() as Number {
        ensureLoaded();
        return (_queue as Array<Dictionary>).size();
    }

    //! Removes the oldest entry and persists the result. Harmless (a no-op,
    //! including no write) on an empty queue.
    //!
    //! Same failure handling as enqueue(): if save() throws, `_queue` is
    //! restored to its pre-drop contents before the exception is rethrown.
    function dropFirst() as Void {
        ensureLoaded();
        var previous = _queue as Array<Dictionary>;
        if (previous.size() == 0) {
            return;
        }
        _queue = previous.slice(1, null) as Array<Dictionary>;
        try {
            save();
        } catch (ex) {
            _queue = previous;
            throw ex;
        }
    }
}
