"""Make defenders who are caught behind the play actually chase.

A defender a few metres behind a counter-attack should be sprinting, not jogging. Some clip files
had them drifting home at 2-3 m/s, which reads on screen as nobody bothering. This walks each play,
finds a defending player who is close behind the ball while the attack runs at goal but moving
slower than a run, and re-times the rest of their route so they cover it at a chase. They still end
where they ended — arriving earlier and holding the spot — so any position the data recorded is kept.

Usage: python3 tools/quicken_chases.py [--write] [library/plays/*.json]
"""
import argparse
import json
import math
import pathlib
import subprocess
import sys

ROOT = pathlib.Path(__file__).resolve().parent.parent
CHASE, SLOW, NEAR = 5.4, 3.5, 12.0      # target chase speed, what counts as dawdling, how close to the ball


def path_pos(path, t):
    """Where a player is at time t, along the curve the app draws (Catmull-Rom)."""
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
    f = lambda p0, p1, p2, p3: 0.5 * (2 * p1 + (-p0 + p2) * u + (2 * p0 - 5 * p1 + 4 * p2 - p3) * u * u +
                                      (-p0 + 3 * p1 - 3 * p2 + p3) * u * u * u)
    return f(a[1], b[1], c[1], d[1]), f(a[2], b[2], c[2], d[2])


def ball_at(play, t):
    """The ball, close enough for this: straight lines between keyframes, at the carrier's feet."""
    keys = play["ball"]
    spot = lambda k, tt: path_pos(next(p for p in play["players"] if p["id"] == k["with"])["path"], tt) \
        if k.get("with") else (k["x"], k["y"])
    if t <= keys[0]["t"]:
        return spot(keys[0], t)
    if t >= keys[-1]["t"]:
        return spot(keys[-1], t)
    i = 0
    while i < len(keys) - 2 and t > keys[i + 1]["t"]:
        i += 1
    a, b = keys[i], keys[i + 1]
    if a.get("with") and a.get("with") == b.get("with"):
        return spot(a, t)
    pa, pb = spot(a, a["t"]), spot(b, b["t"])
    u = (t - a["t"]) / max(b["t"] - a["t"], 1e-6)
    return pa[0] + (pb[0] - pa[0]) * u, pa[1] + (pb[1] - pa[1]) * u


def dawdle_window(play, player):
    """When this player is loitering just behind an attack that is running at goal."""
    start = end = None
    t = 0.0
    while t < play["duration"]:
        here, later = path_pos(player["path"], t), path_pos(player["path"], t + 0.1)
        speed = math.dist(here, later) / 0.1
        ball, ball_next = ball_at(play, t), ball_at(play, t + 0.1)
        moving = math.dist(ball, ball_next) / 0.1
        behind = ball[0] - here[0]
        if moving > 3 and ball[0] > 40 and 2 < behind < NEAR and speed < SLOW:
            start = t if start is None else start
            end = t + 0.1
        t = round(t + 0.1, 2)
    if start is None or end - start < 1.2 or start < 1.0 or start > play["duration"] - 2.0:
        return (None, None)
    return start, end


def quicken(player, t0, duration):
    """Re-time the route from t0: the same line, walked at a chase, then held where it ended."""
    path = player["path"]
    keys = [k for k in path if k[0] > t0]
    if len(keys) < 1:
        return False
    start = [t0, *path_pos(path, t0)]
    trail = [start] + [list(k) for k in keys]
    moved, changed = 0.0, False
    for a, b in zip(trail, trail[1:]):
        moved += math.dist(a[1:], b[1:])
    span = trail[-1][0] - t0
    if span < 0.5 or moved / span >= CHASE * 0.85:
        return False
    # Walk the same line, but at the chase speed, and hold the far end
    out = [k for k in path if k[0] <= t0] or [[0, *path_pos(path, 0)]]
    if out[-1][0] < t0:
        out.append([round(t0, 2), round(start[1], 2), round(start[2], 2)])
    walked, i = 0.0, 0
    for a, b in zip(trail, trail[1:]):
        leg = math.dist(a[1:], b[1:])
        walked += leg
        when = round(t0 + walked / CHASE, 2)
        if when >= duration:
            break
        if when - out[-1][0] < 0.15:      # keyframes any closer are one moment to the app
            out[-1] = [out[-1][0], round(b[1], 2), round(b[2], 2)]
            changed = True
            continue
        out.append([when, round(b[1], 2), round(b[2], 2)])
        changed = True
        i += 1
    if not changed:
        return False
    last = trail[-1]
    if out[-1][0] < duration - 0.2:
        out.append([round(duration, 2), round(last[1], 2), round(last[2], 2)])   # hold the finish
    player["path"] = out
    return True


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--write", action="store_true", help="save the changes (otherwise just report)")
    ap.add_argument("files", nargs="*", default=None)
    args = ap.parse_args()
    files = args.files or sorted(str(f) for f in (ROOT / "library" / "plays").glob("*.json"))

    for f in files:
        play = json.loads(pathlib.Path(f).read_text(encoding="utf-8"))
        carrier = {k.get("with") for k in play["ball"] if k.get("with")}
        fixed = []
        for pl in play["players"]:
            # Only named defenders: unnamed players are moved by the app's own off-ball engine,
            # and the attacking side trailing the play is not what looks wrong
            if pl["id"] in carrier or pl.get("star") or pl.get("gk"):
                continue
            if not pl.get("name") or pl["team"] != "B":
                continue
            t0, t1 = dawdle_window(play, pl)
            if t0 is None:
                continue
            if quicken(pl, max(0.0, t0 - 0.3), play["duration"]):
                fixed.append(f"{pl['id']}@{t0:.1f}s")
        if fixed:
            print(f"{pathlib.Path(f).name:<34} {', '.join(fixed)}")
            if args.write:
                pathlib.Path(f).write_text(json.dumps(play, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    if args.write:
        print("\nRe-checking:")
        subprocess.run(["node", str(ROOT / "tools" / "check_plays.js"), *files])


if __name__ == "__main__":
    main()
