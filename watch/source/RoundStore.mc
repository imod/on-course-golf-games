import Toybox.Lang;
import Toybox.Application.Storage;

//! Persisted state for the round currently in play on the watch: which
//! round is selected, its configuration (fetched once from `GET
//! /api/w/:code` and cached from then on), and the standings from the most
//! recent successful submission.
//!
//! Everything here survives the app closing and the watch rebooting, same
//! reasoning as ResultQueue: a round on a golf course spans hours and the
//! app has no guarantee of staying resident. Unlike ResultQueue, there is
//! no failure-rollback concern — losing a just-written value here just
//! means re-fetching or re-showing stale data, not a lost or duplicated
//! submission — so this module is a plain pass-through to
//! `Application.Storage`, no in-memory mirror.
module RoundStore {

    const CODE_KEY as String = "roundStore.code";
    const CONFIG_KEY as String = "roundStore.config";
    const STANDINGS_KEY as String = "roundStore.standings";

    //! Persists which round is selected, or clears it if `code` is null.
    function setSelectedCode(code as String or Null) as Void {
        Storage.setValue(CODE_KEY, code);
    }

    //! The currently-selected round's code, or null if none is selected.
    function getSelectedCode() as String or Null {
        var value = Storage.getValue(CODE_KEY);
        if (value instanceof String) {
            return value;
        }
        return null;
    }

    //! Persists the round's configuration as returned by
    //! `ApiClient.fetchRound` — {round, hole_count, players, challenges}.
    //! Cached here so it's fetched at most once per selected round.
    function setConfig(config as Dictionary or Null) as Void {
        Storage.setValue(CONFIG_KEY, config);
    }

    //! The cached round configuration, or null if none has been fetched
    //! for the currently-selected round yet.
    function getConfig() as Dictionary or Null {
        var value = Storage.getValue(CONFIG_KEY);
        if (value instanceof Dictionary) {
            return value;
        }
        return null;
    }

    //! Persists the `standings` array from the most recent successful
    //! `ApiClient.submitResult` response, so the last-known standings are
    //! still available after an app restart, before anything new has been
    //! submitted.
    function setStandings(standings as Array or Null) as Void {
        Storage.setValue(STANDINGS_KEY, standings);
    }

    //! The most recently persisted standings, or null if none yet.
    function getStandings() as Array or Null {
        var value = Storage.getValue(STANDINGS_KEY);
        if (value instanceof Array) {
            return value;
        }
        return null;
    }

    //! Clears all persisted round state — e.g. when the user picks a
    //! different round from the list, or the current one finishes.
    function clear() as Void {
        Storage.deleteValue(CODE_KEY);
        Storage.deleteValue(CONFIG_KEY);
        Storage.deleteValue(STANDINGS_KEY);
    }
}
