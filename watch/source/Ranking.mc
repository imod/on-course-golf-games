import Toybox.Lang;

//! Pure ranking and tie logic for the watch's result-entry flow.
//!
//! Mirrors two things on the web app exactly, because the same round is
//! scored through both clients and they must never disagree:
//!   - `tap` / `pendingPoints` in `src/app/r/[code]/LiveRound.tsx` (the
//!     three-state tap rule below).
//!   - `resolvePoints` in `src/lib/scoring.ts` (rank-consuming ties: a
//!     group of N players consumes N ranks, so points beyond the first
//!     member of a tie are skipped, not reused).
//!
//! `groups` is an `Array<Array<String>>` of player ids in finishing order:
//! each inner array is one place, and a place with more than one id is a
//! tie. This module never touches storage, network, or UI — it only
//! transforms and reads that shape.
module Ranking {

    //! Shallow-copies a single group (Array<String>) so callers never get
    //! back a group that aliases the input.
    function copyGroup(group as Array<String>) as Array<String> {
        return group.slice(0, null) as Array<String>;
    }

    //! Finds the index of the group containing playerId, or -1.
    //! (Monkey C's Array has no findIndex — this is the plain loop for it.)
    function indexOfGroupContaining(groups as Array<Array<String> >, playerId as String) as Number {
        for (var i = 0; i < groups.size(); i += 1) {
            if (groups[i].indexOf(playerId) != -1) {
                return i;
            }
        }
        return -1;
    }

    //! Applies one tap of `playerId` to `groups` and returns new groups.
    //! `groups` is never mutated.
    //!
    //! - not present: appended as a new, trailing place.
    //! - present, alone in their group, not first place, allowTies: merged
    //!   into the previous place.
    //! - present, alone in their group, and either first place or ties are
    //!   not allowed: that place is removed.
    //! - present in a group of several: just that player is removed from
    //!   the group; the group itself is dropped if that empties it.
    //!
    //! The result never contains an empty group.
    function tap(groups as Array<Array<String> >, playerId as String, allowTies as Boolean) as Array<Array<String> > {
        var groupIndex = indexOfGroupContaining(groups, playerId);

        if (groupIndex == -1) {
            var result = [] as Array<Array<String> >;
            for (var i = 0; i < groups.size(); i += 1) {
                result.add(copyGroup(groups[i]));
            }
            result.add([playerId] as Array<String>);
            return result;
        }

        var group = groups[groupIndex];

        if (group.size() > 1) {
            // Already tied: this tap removes just this player from the tie.
            var result = [] as Array<Array<String> >;
            for (var i = 0; i < groups.size(); i += 1) {
                if (i == groupIndex) {
                    var filtered = [] as Array<String>;
                    for (var j = 0; j < group.size(); j += 1) {
                        if (!group[j].equals(playerId)) {
                            filtered.add(group[j]);
                        }
                    }
                    if (filtered.size() > 0) {
                        result.add(filtered);
                    }
                } else {
                    result.add(copyGroup(groups[i]));
                }
            }
            return result;
        }

        if (groupIndex == 0 || !allowTies) {
            // Alone in first place, or ties are not allowed for this game:
            // remove the place entirely.
            var result = [] as Array<Array<String> >;
            for (var i = 0; i < groups.size(); i += 1) {
                if (i != groupIndex) {
                    result.add(copyGroup(groups[i]));
                }
            }
            return result;
        }

        // Alone in a later place with ties allowed: join the previous place.
        var result = [] as Array<Array<String> >;
        for (var i = 0; i < groups.size(); i += 1) {
            if (i == groupIndex - 1) {
                var merged = copyGroup(groups[i]);
                merged.add(playerId);
                result.add(merged);
            } else if (i != groupIndex) {
                result.add(copyGroup(groups[i]));
            }
        }
        return result;
    }

    //! Converts `groups` to the wire payload shape: a group of one becomes
    //! a bare player id string, a group of several becomes an array of ids.
    function toRanks(groups as Array<Array<String> >) as Array<Object> {
        var result = [] as Array<Object>;
        for (var i = 0; i < groups.size(); i += 1) {
            var group = groups[i];
            if (group.size() == 1) {
                result.add(group[0]);
            } else {
                result.add(copyGroup(group));
            }
        }
        return result;
    }

    //! Returns the points playerId's place is worth under `points`
    //! (indexed by rank - 1, 0 beyond the end of the list — matching
    //! `resolvePoints` in src/lib/scoring.ts exactly, including how a tie
    //! consumes the ranks it spans), or null if playerId is not in
    //! `groups` at all.
    function pointsFor(groups as Array<Array<String> >, playerId as String, points as Array<Number>) as Number or Null {
        var rank = 1;
        for (var i = 0; i < groups.size(); i += 1) {
            var group = groups[i];
            if (group.indexOf(playerId) != -1) {
                if (rank - 1 < points.size()) {
                    return points[rank - 1];
                }
                return 0;
            }
            rank += group.size();
        }
        return null;
    }
}
