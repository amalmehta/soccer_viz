"""Bundle library/plays/*.json into library/clips.js (ordered by file name, which starts with the year).

Usage: python3 tools/build_library.py   (then python3 build_site.py to refresh the website)
"""
import json
import pathlib

ROOT = pathlib.Path(__file__).resolve().parent.parent
files = sorted((ROOT / "library" / "plays").glob("*.json"))
plays = [json.loads(f.read_text(encoding="utf-8")) for f in files]
body = ",\n".join(json.dumps(p, ensure_ascii=False, separators=(",", ":")) for p in plays)
out = (
    "// Iconic clips for the Birdseye FC library, bundled from library/plays/*.json (one play per file).\n"
    "// Positions, kits and player looks are approximate reconstructions; commentary is original.\n"
    f"window.BirdseyeClips = [\n{body}\n];\n"
)
(ROOT / "library" / "clips.js").write_text(out, encoding="utf-8")
print(f"Bundled {len(plays)} plays into library/clips.js ({len(out) // 1024} KB)")
