-- A bad-point game is scored the same way as any other — the difference is
-- only in how its points are totalled: they pool into their own standing
-- where the lowest total wins, never into the normal one.
alter table challenges add column bad_points boolean not null default false;

-- Copied onto the round like name, points and allow_ties are, so changing
-- the catalog never rewrites a round that has already been played.
alter table round_challenges add column bad_points boolean not null default false;
