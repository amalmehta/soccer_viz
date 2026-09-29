"""Turn a goal in StatsBomb's open data into a Birdseye FC play file.

StatsBomb publish a record of every touch in some matches: who, when, where. That is the ball's
real path and the real order of events, so a clip built from it is far closer to what happened than
one reconstructed from memory. Only the player on the ball is tracked, plus everyone visible in the
shot's freeze frame, so the rest of the team is placed once and left to the off-ball engine.

The file it writes is a starting point, not a finished clip: captions, commentary, analysis, lessons,
kit colours and the venue come out as TODO placeholders for a person to write.

Usage:
  python3 tools/import_statsbomb.py --list                      # matches in the open data
  python3 tools/import_statsbomb.py --match 3750191 --list      # goals in one match
  python3 tools/import_statsbomb.py --match 3750191 --goal 2 --check
  python3 tools/import_statsbomb.py --match 18245 --goal 1 --out library/imported/bale.json

Data: StatsBomb open data (github.com/statsbomb/open-data), free to use with attribution under
their user agreement. Downloads are cached in tools/.statsbomb-cache/.
"""
import argparse
import json
import math
import os
import pathlib
import re
import sys
import unicodedata
import urllib.error
import urllib.request

ROOT = pathlib.Path(__file__).resolve().parent.parent
BASE = "https://raw.githubusercontent.com/statsbomb/open-data/master/data"
CACHE = ROOT / "tools" / ".statsbomb-cache"

# StatsBomb's pitch is 120 x 80; ours is 105 x 68
SX, SY = 105 / 120, 68 / 80
MAX_BALL, MAX_RUN = 30.0, 8.5      # m/s: the speeds the play checker allows, with room to spare
GOAL_Y0, GOAL_Y1 = 30.34, 37.66

# Shot techniques and body parts that need one of the app's special poses
TECHNIQUE = {"Volley": "volley", "Half Volley": "volley", "Overhead Kick": "bicycle", "Diving Header": "divingHeader"}


def fetch(path):
    """A file from the open data, cached so repeat runs need no network."""
    local = CACHE / path
    if not local.exists():
        local.parent.mkdir(parents=True, exist_ok=True)
        url = f"{BASE}/{path}"
        try:
            with urllib.request.urlopen(url, timeout=60) as r:
                local.write_bytes(r.read())
        except urllib.error.HTTPError as e:
            sys.exit(f"StatsBomb has no {path} ({e.code}). Check the id with --list.")
    return json.loads(local.read_text(encoding="utf-8"))


def competitions():
    return fetch("competitions.json")


def all_matches():
    """Every match in the open data, newest first."""
    out = []
    for c in competitions():
        for m in fetch(f"matches/{c['competition_id']}/{c['season_id']}.json"):
            out.append(m)
    return sorted(out, key=lambda m: m["match_date"], reverse=True)


def secs(ev):
    """Seconds into the match, so events from either half sort and subtract correctly."""
    h, m, s = ev["timestamp"].split(":")
    return (ev["period"] - 1) * 45 * 60 + int(h) * 3600 + int(m) * 60 + float(s)


def surname(name):
    parts = [p for p in re.split(r"\s+", name) if p]
    return parts[-1] if parts else name


def slug(text):
    """A plain-ASCII id: accents are folded, so Pelé and Modrić become pele and modric."""
    flat = unicodedata.normalize("NFKD", text.lower())
    flat = "".join(c for c in flat if not unicodedata.combining(c))
    return re.sub(r"[^a-z0-9]+", "-", flat).strip("-")


def to_pitch(loc, flip):
    """A StatsBomb location in our metres, with team A always attacking x = 105."""
    x, y = float(loc[0]), float(loc[1])
    if flip:                                   # each team's events are recorded attacking left to right
        x, y = 120 - x, 80 - y
    return round(x * SX, 2), round(y * SY, 2)


def squad(match_id, events):
    """Shirt number, playing name and who keeps goal, for everyone in the squad.

    The lineups file covers substitutes too and carries the name a player is known by (Casemiro,
    Marcelo), which is what belongs on a label. Starting XI events are the fallback.
    """
    out = {}
    try:
        for team in fetch(f"lineups/{match_id}.json"):
            for pl in team["lineup"]:
                positions = [q.get("position", "") for q in pl.get("positions", [])]
                out[pl["player_id"]] = {
                    "num": pl.get("jersey_number"),
                    "name": pl.get("player_nickname") or pl["player_name"],
                    "gk": any("Goalkeeper" in q for q in positions)
                }
    except SystemExit:
        pass
    for ev in events:
        if ev["type"]["name"] != "Starting XI":
            continue
        for slot in ev["tactics"]["lineup"]:
            out.setdefault(slot["player"]["id"], {
                "num": slot.get("jersey_number"),
                "name": slot["player"]["name"],
                "gk": slot["position"]["name"] == "Goalkeeper"
            })
    return out


def goals_in(events):
    return [e for e in events
            if e["type"]["name"] == "Shot" and e["shot"].get("outcome", {}).get("name") == "Goal"]


def sequence_for(events, goal, before):
    """The move that led to the goal: its possession, plus earlier ones while they fit in the window."""
    end = secs(goal)
    start_possession = goal["possession"]
    seq = [e for e in events if e.get("possession") == start_possession and secs(e) <= end]
    while seq and end - secs(seq[0]) < before * 0.55 and start_possession > 1:
        start_possession -= 1
        earlier = [e for e in events if e.get("possession") == start_possession]
        if not earlier or end - secs(earlier[0]) > before:
            break
        seq = earlier + seq
    return [e for e in seq if end - secs(e) <= before]


def catmull(p0, p1, p2, p3, u):
    return 0.5 * (2 * p1 + (-p0 + p2) * u + (2 * p0 - 5 * p1 + 4 * p2 - p3) * u * u +
                  (-p0 + 3 * p1 - 3 * p2 + p3) * u * u * u)


def path_pos(path, t):
    """Where a player is at time t, along the same curve the app draws."""
    n = len(path)
    if n == 1 or t <= path[0][0]:
        return path[0][1], path[0][2]
    if t >= path[-1][0]:
        return path[-1][1], path[-1][2]
    i = 0
    while i < n - 2 and t > path[i + 1][0]:
        i += 1
    a, b, c, d = path[max(i - 1, 0)], path[i], path[i + 1], path[min(i + 2, n - 1)]
    u = (t - b[0]) / (c[0] - b[0])
    return catmull(a[1], b[1], c[1], d[1], u), catmull(a[2], b[2], c[2], d[2], u)


def fastest(path, step=0.1):
    """Top speed along that curve, sampled as the play checker samples it."""
    if len(path) < 2:
        return 0.0
    top, t, prev = 0.0, step, path_pos(path, 0)
    while t <= path[-1][0] + 1e-9:
        here = path_pos(path, t)
        top = max(top, math.dist(prev, here) / step)
        prev, t = here, t + step
    return top


def relax(points, pairs, passes=3):
    """Stretch the timeline until nothing moves faster than a person or a struck ball can.

    Old matches are timed to the nearest second, so a 30 m pass can look instantaneous. `points` is
    the sorted list of times in the play; `pairs` is (start time, end time, distance, max speed).
    Each gap is widened by the largest demand made on it, which keeps every event in order.
    """
    times = list(points)
    for _ in range(passes):
        gaps = [max(1e-3, times[i + 1] - times[i]) for i in range(len(times) - 1)]
        need = [1.0] * len(gaps)
        for t0, t1, dist, vmax in pairs:
            if t1 <= t0 or dist <= 0:
                continue
            i0, i1 = points.index(t0), points.index(t1)
            span = sum(gaps[i0:i1])
            required = dist / vmax
            if span < required:
                factor = required / span
                for i in range(i0, i1):
                    need[i] = max(need[i], factor)
        out = [times[0]]
        for i, g in enumerate(gaps):
            out.append(out[-1] + g * need[i])
        times = out
    return dict(zip(points, times))


def build(match, events, goal, before):
    seq = sequence_for(events, goal, before)
    if len(seq) < 3:
        sys.exit("That goal has too little build-up in the data to make a clip.")
    squads = squad(match["match_id"], events)
    team_a = goal["team"]["name"]                       # the scoring team always attacks x = 105
    home, away = match["home_team"]["home_team_name"], match["away_team"]["away_team_name"]
    team_b = away if team_a == home else home
    t0 = secs(seq[0])
    flip = lambda ev: ev["team"]["name"] != team_a

    players, ball, actions, play_events = {}, [], [], []

    def note_player(pid, name, team, loc, t, flipped, sure=False):
        """Record where a player was. `sure` marks a reading from that player's own event, which
        settles which side they are on: a freeze frame seen first can put them on the wrong team."""
        if not loc:
            return None
        info = squads.get(pid, {})
        known = info.get("name") or name
        p = players.setdefault(pid, {
            "id": slug(surname(known)) or f"p{pid}",
            "team": "A" if team == team_a else "B",
            "num": info.get("num"),
            "name": surname(known),
            "gk": bool(info.get("gk")),
            "keys": []
        })
        if sure:
            p["team"] = "A" if team == team_a else "B"
        x, y = to_pitch(loc, flipped)
        p["keys"].append((round(t, 2), x, y))
        return p["id"]

    for ev in seq:
        t = secs(ev) - t0
        kind = ev["type"]["name"]
        f = flip(ev)
        who = ev.get("player")
        pid = note_player(who["id"], who["name"], ev["team"]["name"], ev.get("location"), t, f, sure=True) if who else None
        dur = float(ev.get("duration") or 0)

        if kind == "Pass" and pid:
            end = ev["pass"].get("end_location")
            here = to_pitch(ev["location"], f)
            ball.append({"t": t, "with": pid, "_pos": here})
            if end:
                ex, ey = to_pitch(end, f)
                arrive = t + (dur or 0)
                rec = ev["pass"].get("recipient")
                if rec:
                    rid = note_player(rec["id"], rec["name"], ev["team"]["name"], end, arrive, f, sure=True)
                    ball.append({"t": arrive, "with": rid, "_pos": (ex, ey),
                                 **({"lofted": True} if ev["pass"].get("height", {}).get("name") == "High Pass" else {})})
                else:
                    ball.append({"t": arrive, "x": ex, "y": ey, "_pos": (ex, ey)})
            play_events.append({"t": t, "type": "pass", "team": "A" if not f else "B"})
        elif kind == "Carry" and pid:
            end = ev["carry"].get("end_location")
            ball.append({"t": t, "with": pid, "_pos": to_pitch(ev["location"], f)})
            if end:
                note_player(who["id"], who["name"], ev["team"]["name"], end, t + max(dur, 0.4), f, sure=True)
                ball.append({"t": t + max(dur, 0.4), "with": pid, "_pos": to_pitch(end, f)})
        elif kind == "Shot" and pid:
            ball.append({"t": t, "with": pid, "_pos": to_pitch(ev["location"], f)})
            end = ev["shot"].get("end_location")
            scored = ev["shot"].get("outcome", {}).get("name") == "Goal"
            flight = dur or 0.6
            if scored:
                ey = min(GOAL_Y1 - 0.4, max(GOAL_Y0 + 0.4, to_pitch(end, f)[1]))
                ball.append({"t": t + flight, "x": 105.4, "y": round(ey, 2), "_pos": (105.4, ey)})
                play_events.append({"t": t + flight, "type": "goal", "team": "A"})
            elif end:
                ex, ey = to_pitch(end, f)
                ball.append({"t": t + flight, "x": ex, "y": ey, "_pos": (ex, ey)})
            play_events.append({"t": t, "type": "shot", "team": "A" if not f else "B"})
            special = TECHNIQUE.get(ev["shot"].get("technique", {}).get("name")) or \
                ("header" if ev["shot"].get("body_part", {}).get("name") == "Head" else None)
            if special:
                actions.append({"t": round(t, 2), "id": pid, "type": special})
            # Everyone the camera could see when the shot was struck: the rest of the shape.
            # The other side of a shot is whichever team did not take it, not always team B.
            other = team_b if ev["team"]["name"] == team_a else team_a
            for frame in ev["shot"].get("freeze_frame", []):
                fp = frame["player"]
                note_player(fp["id"], fp["name"],
                            ev["team"]["name"] if frame["teammate"] else other,
                            frame["location"], t, f)
        elif kind in ("Duel", "Interception", "Block", "Clearance") and pid:
            play_events.append({"t": t, "type": "tackle", "team": "A" if not f else "B"})
        elif kind == "Goal Keeper" and pid:
            if ev["goalkeeper"].get("type", {}).get("name") in ("Shot Saved", "Save", "Penalty Saved"):
                play_events.append({"t": t, "type": "save", "team": "A" if not f else "B"})
        elif kind == "Dribbled Past" and pid:
            pass  # the beaten defender: the position is what matters, and note_player has it

    ball.sort(key=lambda k: k["t"])
    play_events.sort(key=lambda e: e["t"])

    # One ball keyframe per moment: a carry that ends where the next event starts is the same touch
    clean = []
    for k in ball:
        if clean and k["t"] - clean[-1]["t"] < 0.12:
            if k.get("with") and k.get("with") == clean[-1].get("with"):
                clean[-1] = {**k, "t": clean[-1]["t"]}
                continue
            k = {**k, "t": clean[-1]["t"] + 0.12}
        clean.append(k)
    ball = clean
    # One position per player per moment, so nobody teleports between two readings of the same instant
    for p in players.values():
        keys = []
        for t, x, y in sorted(p["keys"]):
            if keys and t - keys[-1][0] < 0.3:
                keys[-1] = (keys[-1][0], x, y)
            else:
                keys.append((t, x, y))
        p["keys"] = keys

    # Timing comes from the ball. Old matches are timed to the nearest second, so a 30 m pass can
    # look instantaneous; each gap is widened until every pass and shot travels at a believable speed.
    # Player positions are only read when someone touches the ball or appears in the shot's freeze
    # frame, and two readings a moment apart can be further apart than anyone could run, so those get
    # pulled back to somewhere reachable. The two settle together, so this runs a few times.
    marks = sorted({round(k["t"], 3) for k in ball} |
                   {round(k[0], 3) for p in players.values() for k in p["keys"]})

    def even_out(keys, max_gap=4.0):
        """Break long waits into steps. A curve drawn through keyframes seconds apart swings wide at
        the joins, which reads as a sudden sprint; walking the straight line keeps it steady."""
        out = [keys[0]]
        for t, x, y in keys[1:]:
            pt, px, py = out[-1]
            steps = int((t - pt) // max_gap)
            for i in range(1, steps + 1):
                u = i / (steps + 1)
                out.append((round(pt + (t - pt) * u, 2), round(px + (x - px) * u, 2), round(py + (y - py) * u, 2)))
            out.append((t, x, y))
        return out

    def reachable(keys, vmax):
        out = [keys[0]]
        for t, x, y in keys[1:]:
            pt, px, py = out[-1]
            reach = vmax * max(0.05, t - pt)
            d = math.dist((px, py), (x, y))
            if d > reach:
                f = reach / d
                x, y = round(px + (x - px) * f, 2), round(py + (y - py) * f, 2)
            out.append((t, x, y))
        return out

    def shifted(shift):
        """Every moment of the original timings, in the stretched ones (events fall between marks)."""
        def at(t):
            t = round(t, 3)
            if t in shift:
                return round(shift[t], 2)
            before = [m for m in marks if m <= t]
            after = [m for m in marks if m >= t]
            if not before:
                return round(shift[marks[0]], 2)
            if not after:
                return round(shift[marks[-1]] + (t - marks[-1]), 2)
            a, b = before[-1], after[0]
            return round(shift[a] + (shift[b] - shift[a]) * (t - a) / (b - a), 2)
        return at

    paths, at = {}, None
    for round_no in range(4):
        demands = []
        for a, b in zip(ball, ball[1:]):
            if a.get("with") and a.get("with") == b.get("with"):
                continue
            pa, pb = a["_pos"], b["_pos"]
            if paths:                                   # after the first pass, use the drawn curves
                if a.get("with"):
                    pa = path_pos(paths[a["with"]], at(a["t"]))
                if b.get("with"):
                    pb = path_pos(paths[b["with"]], at(b["t"]))
            demands.append((round(a["t"], 3), round(b["t"], 3), math.dist(pa, pb), MAX_BALL))
        shift = relax(marks, demands)
        at = shifted(shift)
        paths = {}
        for p in players.values():
            keys = []
            for t, x, y in p["keys"]:
                st = at(t)
                if keys and st - keys[-1][0] < 0.25:
                    keys[-1] = (keys[-1][0], x, y)
                else:
                    keys.append((st, x, y))
            if keys[0][0] > 0:              # everyone is on the pitch from the first frame
                keys.insert(0, (0.0, keys[0][1], keys[0][2]))
            keys = even_out(keys)
            # The app runs players along a curve through their keyframes, which overshoots a straight
            # line, so tighten the limit until the curve itself stays inside a sprint.
            vmax = MAX_RUN
            for _ in range(6):
                path = [[t, x, y] for t, x, y in reachable(keys, vmax)]
                v = fastest(path)
                if v <= 9.0:
                    break
                vmax *= 9.0 / v
            paths[p["id"]] = path

    for p in players.values():
        p["path"] = paths[p["id"]]
    for k in ball:
        k["t"] = at(k["t"])
        k.pop("_pos", None)
    for i in range(1, len(ball)):                       # keyframes any closer are one touch to the app
        ball[i]["t"] = max(ball[i]["t"], round(ball[i - 1]["t"] + 0.08, 2))
    for a in actions:
        a["t"] = at(a["t"])
    for e in play_events:
        e["t"] = at(e["t"])
    for e in play_events:                               # the goal is the moment the ball is in the net
        if e["type"] == "goal":
            net = [k for k in ball if not k.get("with") and k.get("x", 0) >= 105]
            if net:
                e["t"] = min(net, key=lambda k: abs(k["t"] - e["t"]))["t"]
    play_events.sort(key=lambda e: e["t"])

    duration = round(min(30.0, max(6.0, ball[-1]["t"] + 2.5)), 1)
    scorer = slug(surname(squads.get(goal["player"]["id"], {}).get("name") or goal["player"]["name"]))

    out_players = []
    for p in sorted(players.values(), key=lambda q: q["path"][0][0]):
        path = [k for k in p["path"] if k[0] <= duration]
        if not path:
            continue
        if path[0][0] > 0:                   # the checker wants everyone placed from the first frame
            path.insert(0, [0, path[0][1], path[0][2]])
        entry = {"id": p["id"], "team": p["team"], "num": p["num"], "name": p["name"], "path": path}
        if p["gk"]:
            entry["gk"] = True
        if p["id"] == scorer:
            entry["star"] = True
        out_players.append(entry)
    if not any(p.get("star") for p in out_players):
        sys.exit("The scorer has no position in the data, so there is no player to build the clip around.")

    date = match["match_date"]
    year = date[:4]
    comp = match["competition"]["competition_name"]
    stage = (match.get("competition_stage") or {}).get("name", "")
    stadium = (match.get("stadium") or {}).get("name", "")
    minute = f"{goal['minute'] + 1}'"

    return {
        "title": f"TODO: name this goal ({surname(goal['player']['name'])}, {year})",
        "subtitle": " · ".join(x for x in [f"{comp}{', ' + stage.lower() if stage else ''}", stadium, date] if x)[:110],
        "clock": minute,
        "duration": duration,
        "teams": {
            "A": {"name": team_a, "short": team_a[:3].upper(), "color": "#2C5BD6", "color2": "#0F2B7A",
                  "text": "#FFFFFF", "pattern": "plain", "shorts": "#FFFFFF", "socks": "#2C5BD6", "gkColor": "#F2C94C"},
            "B": {"name": team_b, "short": team_b[:3].upper(), "color": "#EE6A55", "color2": "#8A2A1C",
                  "text": "#FFFFFF", "pattern": "plain", "shorts": "#1E2430", "socks": "#EE6A55", "gkColor": "#34C77B"}
        },
        "score": [0, 0],
        "players": out_players,
        "ball": [{k: (round(v, 2) if isinstance(v, float) else v) for k, v in kf.items()} for kf in ball],
        "captions": [{"t": 0, "text": "TODO: write the captions, 3 to 8 of them."}],
        "commentary": [{"t": 0, "text": "TODO: write original commentary, 4 to 9 lines."}],
        "events": play_events,
        "actions": actions,
        "venue": {"time": "day", "roof": "open", "stands": "#2a3550", "accent": "#d9dde3",
                  "track": False, "grass": "#2e7a3c", "mowing": "stripes"},
        "analysis": [
            {"label": "Context", "text": "TODO: the state of the match and why the space was there."},
            {"label": "Key moment", "text": "TODO: the moment the goal turned on."},
            {"label": "The finish", "text": "TODO: how it was finished."}
        ],
        "lessons": [
            {"label": "TODO lesson one", "text": "TODO: a practical coaching point from this play."},
            {"label": "TODO lesson two", "text": "TODO: a practical coaching point from this play."},
            {"label": "TODO lesson three", "text": "TODO: a practical coaching point from this play."}
        ],
        "note": f"Ball path and player positions come from StatsBomb open data (match {match['match_id']}); "
                "players away from the ball are placed from the shot's freeze frame and moved by the app. "
                "Commentary is original, not the broadcast."
    }


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--match", type=int, help="StatsBomb match id")
    ap.add_argument("--goal", type=int, default=1, help="which goal in the match (1 = first)")
    ap.add_argument("--before", type=float, default=22, help="seconds of build-up to include (default 22)")
    ap.add_argument("--out", help="where to write the play file (default library/imported/<name>.json)")
    ap.add_argument("--list", action="store_true", help="list matches, or the goals in --match")
    ap.add_argument("--check", action="store_true", help="run tools/check_plays.js on the result")
    args = ap.parse_args()

    if args.list and not args.match:
        for m in all_matches():
            stage = (m.get("competition_stage") or {}).get("name", "")
            print(f"{m['match_id']:>9}  {m['match_date']}  {m['competition']['competition_name']:<22} "
                  f"{m['home_team']['home_team_name']} v {m['away_team']['away_team_name']}  {stage}")
        return
    if not args.match:
        ap.error("--match is required (use --list to find one)")

    matches = {m["match_id"]: m for m in all_matches()}
    if args.match not in matches:
        sys.exit(f"Match {args.match} is not in the open data. Use --list to see what is.")
    match = matches[args.match]
    events = fetch(f"events/{args.match}.json")
    goals = goals_in(events)
    if not goals:
        sys.exit("No goals recorded in that match.")
    if args.list:
        for i, g in enumerate(goals, 1):
            print(f"{i}. {g['minute']}:{g['second']:02d}  {g['player']['name']} ({g['team']['name']})"
                  f"  {g['shot'].get('technique', {}).get('name', '')}")
        return
    if not 1 <= args.goal <= len(goals):
        sys.exit(f"That match has {len(goals)} goals; --goal must be 1 to {len(goals)}.")

    goal = goals[args.goal - 1]
    play = build(match, events, goal, args.before)
    star = next(pl["id"] for pl in play["players"] if pl.get("star"))
    out = pathlib.Path(args.out) if args.out else \
        ROOT / "library" / "imported" / f"{match['match_date'][:4]}-{star}.json"
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text(json.dumps(play, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")

    named = sum(1 for p in play["players"] if p["name"])
    print(f"Wrote {os.path.relpath(out, ROOT)}")
    print(f"  {goal['player']['name']}, {goal['minute']}' — {play['duration']}s, {len(play['players'])} players "
          f"({named} named), {len(play['ball'])} ball keyframes, {len(play['actions'])} special actions")
    print("  Still to write by hand: title, captions, commentary, analysis, lessons, kit colours, venue, score.")
    if args.check:
        import subprocess
        print()
        subprocess.run(["node", str(ROOT / "tools" / "check_plays.js"), str(out)])


if __name__ == "__main__":
    main()
