import Toybox.Lang;
import Toybox.Graphics;
import Toybox.WatchUi;

//! Draws `text` centered on `dc`, word-wrapped to fit inside the round
//! display rather than clipped by the bezel — FONT_MEDIUM at full width
//! ran text straight off the edge of a real fenix847mm screen (confirmed
//! in the simulator), so wrapping is measured, not guessed at fixed line
//! breaks. Shared by every full-screen status message in this file
//! (RoundListView's states and PlaceholderView).
//! @param dc Device context
//! @param text The message to show; existing "\n"s force a break, long
//!     runs between them wrap on word boundaries
function drawCenteredMessage(dc as Dc, text as String) as Void {
    var font = Graphics.FONT_SMALL;
    dc.setColor(Graphics.COLOR_WHITE, Graphics.COLOR_BLACK);
    dc.clear();

    // Comfortably inside the circular bezel for a handful of centered lines.
    var maxWidth = (dc.getWidth() * 0.74).toNumber();
    var lines = wrapMessage(dc, text, font, maxWidth);
    var lineHeight = dc.getFontHeight(font);
    var top = (dc.getHeight() / 2) - ((lines.size() * lineHeight) / 2) + (lineHeight / 2);

    for (var i = 0; i < lines.size(); i += 1) {
        dc.drawText(
            dc.getWidth() / 2,
            top + (i * lineHeight),
            font,
            lines[i],
            Graphics.TEXT_JUSTIFY_CENTER | Graphics.TEXT_JUSTIFY_VCENTER
        );
    }
}

//! Splits `text` on its "\n" breaks, then word-wraps each paragraph so no
//! line exceeds `maxWidth` pixels at `font`, measured with the real font
//! metrics rather than a fixed character count.
function wrapMessage(dc as Dc, text as String, font as Graphics.FontType, maxWidth as Number) as Array<String> {
    var lines = [] as Array<String>;
    var paragraphs = splitOn(text, "\n");
    for (var p = 0; p < paragraphs.size(); p += 1) {
        var words = splitOn(paragraphs[p], " ");
        var current = "";
        for (var w = 0; w < words.size(); w += 1) {
            var candidate = current;
            if (current.length() == 0) {
                candidate = words[w];
            } else {
                candidate = current + " " + words[w];
            }
            if (current.length() == 0 || dc.getTextWidthInPixels(candidate, font) <= maxWidth) {
                current = candidate;
            } else {
                lines.add(current);
                current = words[w];
            }
        }
        lines.add(current);
    }
    return lines;
}

//! Monkey C's String has no split() — splits `text` on single-character
//! separator `sep`.
function splitOn(text as String, sep as String) as Array<String> {
    var result = [] as Array<String>;
    var rest = text;
    while (true) {
        var idx = rest.find(sep);
        if (idx == null) {
            result.add(rest);
            return result;
        }
        result.add(rest.substring(0, idx) as String);
        rest = rest.substring((idx as Number) + sep.length(), rest.length()) as String;
    }
    return result;
}

//! Landing screen when no round is selected yet: fetches the open rounds
//! from `GET /api/w/rounds` and lets the golfer pick one. Once a round is
//! picked, its configuration is fetched and cached (RoundStore) and the
//! app lands on PlaceholderView, standing in for HoleView (task 9).
//!
//! A blank screen on a tee box is the worst outcome — the golfer can't
//! tell whether the app is broken, the phone is out of range, or there
//! are genuinely no rounds open. This view deliberately distinguishes
//! three situations on screen, each calling for a different action:
//!   - not configured        -> fill in the settings on the phone
//!   - could not reach server -> wait for phone connectivity, then retry
//!   - no rounds open        -> start a round on the phone
//! A populated list switches straight into a WatchUi.Menu2 (see
//! samples/Menu2Sample) for selection; this view itself only ever shows a
//! single status message.
class RoundListView extends WatchUi.View {

    private var _message as String = "Loading rounds…";
    private var _started as Boolean = false;

    //! Constructor
    public function initialize() {
        View.initialize();
    }

    //! Update the view
    //! @param dc Device context
    public function onUpdate(dc as Dc) as Void {
        drawCenteredMessage(dc, _message);
    }

    //! Kicks off the round-list fetch the first time the view is shown.
    //! @param dc Device context (unused; no layout resource is loaded)
    public function onShow() as Void {
        if (_started) {
            return;
        }
        _started = true;
        start();
    }

    //! Checks configuration locally before ever calling the network, so
    //! "not configured" is never confused with "could not reach server".
    //! (ApiClient's own NOT_CONFIGURED short-circuit code, -1, deliberately
    //! shares its value with a genuine transport-failure code, because
    //! ResultQueue's retry policy only needs permanent-vs-transient — this
    //! view needs the finer distinction, so it checks first instead.)
    private function start() as Void {
        if (ApiClient.baseUrl() == null || ApiClient.watchToken() == null) {
            showMessage("Not set up.\nEnter the API base URL and watch token in the Garmin Connect app.");
            return;
        }

        ApiClient.listRounds(method(:onRoundsFetched));
    }

    //! ApiClient.listRounds callback.
    //! @param responseCode HTTP status, or a negative transport code
    //! @param data {rounds: [{code, n, d}]} on success
    public function onRoundsFetched(responseCode as Number, data as Dictionary or String or Null) as Void {
        if (responseCode != 200 || !(data instanceof Dictionary)) {
            showMessage("Could not reach the server.\nCheck the phone's connection, then retry.");
            return;
        }

        var rounds = data.get("rounds");
        if (!(rounds instanceof Array) || rounds.size() == 0) {
            showMessage("No rounds open.\nStart a round on the phone.");
            return;
        }

        (rounds as Array).sort(new RoundDateComparator());
        WatchUi.switchToView(new RoundMenu(rounds as Array), new RoundMenuDelegate(), WatchUi.SLIDE_IMMEDIATE);
    }

    //! Replaces the on-screen message and repaints.
    //! @param text The message to show, "\n"-separated for multiple lines
    private function showMessage(text as String) as Void {
        _message = text;
        WatchUi.requestUpdate();
    }
}

//! Orders rounds newest first by their "d" (date) field. Dates are ISO
//! "YYYY-MM-DD" strings (see watch/README.md's verified wire shape), so
//! lexicographic comparison is chronological comparison.
class RoundDateComparator {

    //! Constructor
    public function initialize() {
    }

    //! @param a A round dictionary ({code, n, d})
    //! @param b A round dictionary ({code, n, d})
    //! @return Negative if `a` is newer than `b`, positive if older, 0 if equal
    public function compare(a as Object, b as Object) as Number {
        var dateA = (a as Dictionary).get("d") as String;
        var dateB = (b as Dictionary).get("d") as String;
        return dateB.compareTo(dateA);
    }
}

//! The selectable list of open rounds, newest first. Each item's label is
//! the round name ("n"), its sub-label the date ("d"), and its identifier
//! the round code ("code") the rest of the app keys everything on.
class RoundMenu extends WatchUi.Menu2 {

    //! Constructor
    //! @param rounds [{code, n, d}], already sorted newest first
    public function initialize(rounds as Array) {
        Menu2.initialize({:title => "Rounds"});
        for (var i = 0; i < rounds.size(); i += 1) {
            var round = rounds[i] as Dictionary;
            var code = round.get("code") as String;
            var name = round.get("n") as String;
            var date = round.get("d") as String;
            addItem(new WatchUi.MenuItem(name, date, code, null));
        }
    }
}

//! Handles picking a round from RoundMenu: fetches and caches its
//! configuration, then lands on PlaceholderView. A failed fetch returns
//! to a fresh RoundListView rather than stranding the golfer on a dead
//! screen — that re-runs the same not-configured/unreachable/empty
//! classification and gives a way forward again.
class RoundMenuDelegate extends WatchUi.Menu2InputDelegate {

    private var _code as String?;

    //! Constructor
    public function initialize() {
        Menu2InputDelegate.initialize();
    }

    //! Handle an item being selected
    //! @param item The selected round's MenuItem
    public function onSelect(item as MenuItem) as Void {
        _code = item.getId() as String;
        WatchUi.switchToView(new $.PlaceholderView(item.getLabel()), null, WatchUi.SLIDE_IMMEDIATE);
        ApiClient.fetchRound(_code as String, method(:onConfigFetched));
    }

    //! ApiClient.fetchRound callback.
    //! @param responseCode HTTP status, or a negative transport code
    //! @param data The round's {round, hole_count, players, challenges} on success
    public function onConfigFetched(responseCode as Number, data as Dictionary or String or Null) as Void {
        if (responseCode != 200 || !(data instanceof Dictionary)) {
            WatchUi.switchToView(new $.RoundListView(), null, WatchUi.SLIDE_IMMEDIATE);
            return;
        }

        RoundStore.setSelectedCode(_code);
        RoundStore.setConfig(data as Dictionary);

        var name = (data as Dictionary).get("round");
        if (!(name instanceof String)) {
            name = _code;
        }
        WatchUi.switchToView(new $.PlaceholderView(name as String), null, WatchUi.SLIDE_IMMEDIATE);
    }
}

//! Stands in for HoleView (task 9), which does not exist yet. Names the
//! selected round so the golfer has confirmation the right one is active,
//! whether reached fresh off a selection or straight from app launch with
//! a round already persisted in RoundStore.
class PlaceholderView extends WatchUi.View {

    private var _roundName as String;

    //! Constructor
    //! @param roundName The selected round's display name
    public function initialize(roundName as String) {
        View.initialize();
        _roundName = roundName;
    }

    //! Update the view
    //! @param dc Device context
    public function onUpdate(dc as Dc) as Void {
        drawCenteredMessage(dc, "Round selected:\n" + _roundName);
    }
}
