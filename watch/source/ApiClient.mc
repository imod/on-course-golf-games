import Toybox.Lang;
import Toybox.Communications;
import Toybox.Application.Properties;

//! The watch's only networking code: the three `/api/w/*` calls against the
//! web app. Keys on the wire are compact (`n`, `d`, `rc`, `pts`, ...)
//! because a Fenix parses JSON slowly with little memory — this module
//! passes those keys through exactly as the server defines them and must
//! never "improve" them; a separate, already-shipped web contract depends
//! on the names staying as they are.
//!
//! Every response reaches the caller as `(responseCode, data)`. `200` is
//! success; everything else — `409` (the round finished elsewhere), other
//! `4xx`, `5xx`, or a negative `Communications` transport error — is
//! surfaced with its code intact. This module never collapses those into a
//! single "failed": `ResultQueue`'s retry policy is the thing that has to
//! tell a permanent failure (409, other 4xx) apart from a transient one
//! (5xx, transport) by that code, so passing it through unchanged is the
//! whole job here.
module ApiClient {

    //! Shape every call above hands its result to.
    typedef ResponseCallback as Method(responseCode as Number, data as Dictionary or String or Null) as Void;

    //! `-1` mirrors `Communications.BLE_ERROR`: the generic transport
    //! failure code. Used here for the one failure that never reaches the
    //! network at all — the watch hasn't been configured yet — so callers
    //! don't need a fourth code path beyond 2xx/4xx/5xx/transport.
    const NOT_CONFIGURED as Number = -1;

    //! Reads the API host configured from the phone (Settings > "API base
    //! URL"). Never hardcoded, never typed on the watch. Returns null if
    //! it hasn't been set yet.
    function baseUrl() as String or Null {
        var value = Properties.getValue("apiBaseUrl");
        if (value instanceof String && value.length() > 0) {
            return value;
        }
        return null;
    }

    //! Reads the shared watch token configured from the phone (Settings >
    //! "Watch token"). Returns null if it hasn't been set yet.
    function watchToken() as String or Null {
        var value = Properties.getValue("watchToken");
        if (value instanceof String && value.length() > 0) {
            return value;
        }
        return null;
    }

    //! GET /api/w/rounds -> {rounds: [{code, n, d}]}. Requires the
    //! `x-watch-token` header; the server 401s without a valid one.
    function listRounds(callback as ResponseCallback) as Void {
        get("/api/w/rounds", callback);
    }

    //! GET /api/w/:code -> a round's configuration: {round, hole_count,
    //! players: [{id, n}], challenges: [{id, n, pts, holes}]}. Fetched once
    //! when a round is selected; the caller is responsible for caching it
    //! (see RoundStore) — this module makes the call and nothing else.
    function fetchRound(code as String, callback as ResponseCallback) as Void {
        get("/api/w/" + code, callback);
    }

    //! POST /api/w/:code/result with body {rc, hole, ranks} ->
    //! {ok: true, standings: [{id, p}]} or {ok: false, err}.
    //!
    //! `entry` is a queue entry shaped {code, rc, hole, ranks} — the exact
    //! shape ResultQueue stores and returns from peek(). This function only
    //! reads it; it never mutates the caller's dictionary.
    function submitResult(entry as Dictionary, callback as ResponseCallback) as Void {
        var url = baseUrl();
        var token = watchToken();
        if (url == null || token == null) {
            callback.invoke(NOT_CONFIGURED, null);
            return;
        }

        var code = entry.get("code") as String;
        var body = {
            "rc" => entry.get("rc"),
            "hole" => entry.get("hole"),
            "ranks" => entry.get("ranks")
        } as Dictionary;

        var options = {
            :method => Communications.HTTP_REQUEST_METHOD_POST,
            :headers => {
                "Content-Type" => Communications.REQUEST_CONTENT_TYPE_JSON,
                "x-watch-token" => token
            },
            :responseType => Communications.HTTP_RESPONSE_CONTENT_TYPE_JSON
        };

        Communications.makeWebRequest(url + "/api/w/" + code + "/result", body, options, callback);
    }

    //! Shared GET implementation for listRounds() and fetchRound().
    function get(path as String, callback as ResponseCallback) as Void {
        var url = baseUrl();
        var token = watchToken();
        if (url == null || token == null) {
            callback.invoke(NOT_CONFIGURED, null);
            return;
        }

        var options = {
            :method => Communications.HTTP_REQUEST_METHOD_GET,
            :headers => {
                "x-watch-token" => token
            },
            :responseType => Communications.HTTP_RESPONSE_CONTENT_TYPE_JSON
        };

        Communications.makeWebRequest(url + path, null, options, callback);
    }
}
