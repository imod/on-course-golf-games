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

    //! Writes the in-memory queue to `Application.Storage`.
    function save() as Void {
        Storage.setValue(STORAGE_KEY, _queue as Array<Dictionary>);
    }

    //! Appends `entry` and persists immediately. If this pushes the queue
    //! past `MAX_SIZE`, the oldest entry (or entries) are dropped — never
    //! the one just added.
    function enqueue(entry as Dictionary) as Void {
        ensureLoaded();
        var queue = _queue as Array<Dictionary>;
        queue.add(entry);
        while (queue.size() > MAX_SIZE) {
            queue = queue.slice(1, null) as Array<Dictionary>;
        }
        _queue = queue;
        save();
    }

    //! Returns the oldest entry without removing it, or null if the queue
    //! is empty.
    function peek() as Dictionary or Null {
        ensureLoaded();
        var queue = _queue as Array<Dictionary>;
        if (queue.size() == 0) {
            return null;
        }
        return queue[0];
    }

    //! Number of entries currently queued.
    function size() as Number {
        ensureLoaded();
        return (_queue as Array<Dictionary>).size();
    }

    //! Removes the oldest entry and persists the result. Harmless (a no-op)
    //! on an empty queue.
    function dropFirst() as Void {
        ensureLoaded();
        var queue = _queue as Array<Dictionary>;
        if (queue.size() == 0) {
            return;
        }
        _queue = queue.slice(1, null) as Array<Dictionary>;
        save();
    }
}
