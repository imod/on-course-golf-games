create type challenge_scope as enum ('per_hole', 'per_round');
create type round_status as enum ('open', 'finished');

create table challenges (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text not null default '',
  points int[] not null,
  scope challenge_scope not null default 'per_hole',
  allow_ties boolean not null default false,
  archived boolean not null default false,
  created_at timestamptz not null default now(),
  constraint challenges_points_not_empty check (coalesce(array_length(points, 1), 0) >= 1)
);

create table players (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  archived boolean not null default false,
  created_at timestamptz not null default now()
);

create table rounds (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name text not null,
  played_on date not null default current_date,
  hole_count int not null default 18,
  status round_status not null default 'open',
  created_at timestamptz not null default now(),
  constraint rounds_code_shape check (code ~ '^[0-9A-HJKMNP-TV-Z]{10}$'),
  constraint rounds_hole_count check (hole_count between 1 and 36)
);

create table round_players (
  round_id uuid not null references rounds(id) on delete cascade,
  player_id uuid not null references players(id),
  primary key (round_id, player_id)
);

create table round_challenges (
  id uuid primary key default gen_random_uuid(),
  round_id uuid not null references rounds(id) on delete cascade,
  challenge_id uuid references challenges(id),
  name text not null,
  points int[] not null,
  scope challenge_scope not null,
  allow_ties boolean not null,
  holes int[]
);

create table results (
  id uuid primary key default gen_random_uuid(),
  round_id uuid not null references rounds(id) on delete cascade,
  round_challenge_id uuid not null references round_challenges(id) on delete cascade,
  hole int,
  player_id uuid not null references players(id),
  rank int not null,
  points int not null,
  created_at timestamptz not null default now(),
  created_by_device text not null default 'web',
  constraint results_rank_positive check (rank >= 1),
  constraint results_points_not_negative check (points >= 0)
);

create unique index results_unique_entry
  on results (round_challenge_id, hole, player_id)
  nulls not distinct;

create index results_round_idx on results (round_id);
create index round_challenges_round_idx on round_challenges (round_id);

-- A finished round is read-only. Enforced here as well as in the service
-- layer, because this is the guard that stops an old code editing history.
create function guard_finished_round() returns trigger as $$
declare
  current_status round_status;
begin
  select status into current_status
  from rounds
  where id = coalesce(new.round_id, old.round_id);

  if current_status = 'finished' then
    raise exception 'round is finished' using errcode = 'check_violation';
  end if;

  return coalesce(new, old);
end;
$$ language plpgsql;

create trigger results_guard_finished
  before insert or update or delete on results
  for each row execute function guard_finished_round();

-- Anonymous clients never touch these tables: every read and write goes
-- through a Route Handler using the service role key.
alter table challenges enable row level security;
alter table players enable row level security;
alter table rounds enable row level security;
alter table round_players enable row level security;
alter table round_challenges enable row level security;
alter table results enable row level security;
