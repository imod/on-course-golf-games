import Toybox.Lang;
import Toybox.Test;

//! Deep-compares two Array<String> for equal contents in order.
function stringGroupEquals(a as Array<String>, b as Array<String>) as Boolean {
    if (a.size() != b.size()) {
        return false;
    }
    for (var i = 0; i < a.size(); i += 1) {
        if (!a[i].equals(b[i])) {
            return false;
        }
    }
    return true;
}

//! Deep-compares two Array<Array<String>> (the `groups` shape) for equal
//! contents in order.
function groupsEqual(a as Array<Array<String> >, b as Array<Array<String> >) as Boolean {
    if (a.size() != b.size()) {
        return false;
    }
    for (var i = 0; i < a.size(); i += 1) {
        if (!stringGroupEquals(a[i], b[i])) {
            return false;
        }
    }
    return true;
}

//! Appending three unpicked players in order gives three singleton groups,
//! in the order they were tapped.
(:test)
function rankingTapAppendsThreeInOrder(logger as Test.Logger) as Boolean {
    var groups = [] as Array<Array<String> >;
    groups = Ranking.tap(groups, "a", true);
    groups = Ranking.tap(groups, "b", true);
    groups = Ranking.tap(groups, "c", true);

    var expected = [["a"], ["b"], ["c"]] as Array<Array<String> >;
    logger.debug("groups = " + groups.toString());
    return groupsEqual(groups, expected);
}

//! Tapping a picked, alone player (not first place) with ties allowed joins
//! it to the previous group.
(:test)
function rankingTapAloneJoinsPreviousGroup(logger as Test.Logger) as Boolean {
    var groups = [["a"], ["b"]] as Array<Array<String> >;
    var result = Ranking.tap(groups, "b", true);

    var expected = [["a", "b"]] as Array<Array<String> >;
    logger.debug("result = " + result.toString());
    return groupsEqual(result, expected);
}

//! Tapping a tied player removes just that player and leaves the rest of
//! the groups intact.
(:test)
function rankingTapTiedPlayerRemovesJustThatPlayer(logger as Test.Logger) as Boolean {
    var groups = [["a", "b"], ["c"]] as Array<Array<String> >;
    var result = Ranking.tap(groups, "b", true);

    var expected = [["a"], ["c"]] as Array<Array<String> >;
    logger.debug("result = " + result.toString());
    return groupsEqual(result, expected);
}

//! Removing the middle member of a three-way tie leaves the remaining two
//! in their original order.
(:test)
function rankingTapTiedPlayerFromLargerGroupPreservesOrder(logger as Test.Logger) as Boolean {
    var groups = [["a", "b", "c"]] as Array<Array<String> >;
    var result = Ranking.tap(groups, "b", true);

    var expected = [["a", "c"]] as Array<Array<String> >;
    logger.debug("result = " + result.toString());
    return groupsEqual(result, expected);
}

//! Tapping the sole first-place player removes their group entirely.
(:test)
function rankingTapSoleFirstPlaceRemoves(logger as Test.Logger) as Boolean {
    var groups = [["a"]] as Array<Array<String> >;
    var result = Ranking.tap(groups, "a", true);

    var expected = [] as Array<Array<String> >;
    logger.debug("result = " + result.toString());
    return groupsEqual(result, expected);
}

//! With allowTies false, tapping a picked, alone, non-first player removes
//! the group instead of merging it into the previous one.
(:test)
function rankingTapAloneWithTiesDisallowedRemoves(logger as Test.Logger) as Boolean {
    var groups = [["a"], ["b"]] as Array<Array<String> >;
    var result = Ranking.tap(groups, "b", false);

    var expected = [["a"]] as Array<Array<String> >;
    logger.debug("result = " + result.toString());
    return groupsEqual(result, expected);
}

//! tap() must not mutate its input — the caller's groups are read again on
//! the next render.
(:test)
function rankingTapDoesNotMutateInput(logger as Test.Logger) as Boolean {
    var groups = [["a"], ["b"]] as Array<Array<String> >;
    var untouched = [["a"], ["b"]] as Array<Array<String> >;
    Ranking.tap(groups, "b", true);

    logger.debug("groups = " + groups.toString());
    return groupsEqual(groups, untouched);
}

//! toRanks: a group of one becomes a bare string.
(:test)
function rankingToRanksSingletonIsBareString(logger as Test.Logger) as Boolean {
    var groups = [["a"]] as Array<Array<String> >;
    var ranks = Ranking.toRanks(groups);

    logger.debug("ranks = " + ranks.toString());
    if (ranks.size() != 1) {
        return false;
    }
    return ranks[0].equals("a");
}

//! toRanks: a group of several becomes an array; singles stay bare strings.
(:test)
function rankingToRanksMixedGroups(logger as Test.Logger) as Boolean {
    var groups = [["a"], ["b", "c"]] as Array<Array<String> >;
    var ranks = Ranking.toRanks(groups);

    logger.debug("ranks = " + ranks.toString());
    if (ranks.size() != 2) {
        return false;
    }
    if (!(ranks[0] instanceof Lang.String) || !ranks[0].equals("a")) {
        return false;
    }
    if (!(ranks[1] instanceof Lang.Array)) {
        return false;
    }
    var tie = ranks[1] as Array<String>;
    return stringGroupEquals(tie, ["b", "c"] as Array<String>);
}

//! pointsFor: a tie gives both members the same points, and the rank the
//! tie spans is consumed — with [3,2,1] and [[a,b],[c]], a and b get 3 and
//! c gets 1, not 2.
(:test)
function rankingPointsForTieConsumesRanks(logger as Test.Logger) as Boolean {
    var groups = [["a", "b"], ["c"]] as Array<Array<String> >;
    var points = [3, 2, 1] as Array<Number>;

    var a = Ranking.pointsFor(groups, "a", points);
    var b = Ranking.pointsFor(groups, "b", points);
    var c = Ranking.pointsFor(groups, "c", points);
    logger.debug("a=" + a + " b=" + b + " c=" + c);

    return a == 3 && b == 3 && c == 1;
}

//! pointsFor: a place beyond the points list scores 0, not null — the
//! player is still in the groups, just out of the money.
(:test)
function rankingPointsForBeyondListIsZero(logger as Test.Logger) as Boolean {
    var groups = [["a"], ["b"], ["c"], ["d"]] as Array<Array<String> >;
    var points = [3, 2, 1] as Array<Number>;

    var d = Ranking.pointsFor(groups, "d", points);
    logger.debug("d=" + d);
    return d == 0;
}

//! pointsFor: a player not present in any group gets null.
(:test)
function rankingPointsForAbsentPlayerIsNull(logger as Test.Logger) as Boolean {
    var groups = [["a"], ["b"]] as Array<Array<String> >;
    var points = [3, 2, 1] as Array<Number>;

    var result = Ranking.pointsFor(groups, "z", points);
    logger.debug("result = " + result);
    return result == null;
}
