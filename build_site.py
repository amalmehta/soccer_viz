"""Build the standalone Birdseye FC website into docs/.

The site is the same app as birdseye.html, as a normal web page that installs as an app
(web app manifest + icons) and keeps working offline (service worker). Features that need
Claude (animating new plays, feedback) are hidden.

Usage:  python3 build_site.py
Deploy: commit docs/ and push — GitHub Pages serves it from the main branch /docs folder.
        Any other static host works too: drag docs/ onto https://app.netlify.com/drop
"""
import hashlib
import json
import pathlib
import shutil

ROOT = pathlib.Path(__file__).resolve().parent
SITE = ROOT / "docs"
ASSETS = ["looks/arcade.js", "looks/broadcast.js", "looks/stadium3d.js", "sound/crowd.js", "library/clips.js"]
INK, GRASS, BALL, GROUND = "#11241A", "#3E9A5A", "#FFC53D", "#EBF0EA"
TAGLINE = "Famous goals and classic moves, drawn from above."

ICON_SVG = f"""<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
<rect x="2" y="2" width="60" height="60" rx="14" fill="{GRASS}" stroke="{INK}" stroke-width="3"/>
<line x1="32" y1="6" x2="32" y2="58" stroke="#fff" stroke-width="2.5"/>
<circle cx="32" cy="32" r="9" fill="none" stroke="#fff" stroke-width="2.5"/>
<circle cx="45" cy="21" r="6" fill="{BALL}" stroke="{INK}" stroke-width="2"/>
</svg>
"""


def draw_png_icons(folder):
    """PNG icons for installing the app (browsers want 192 and 512 px). Needs Pillow."""
    try:
        from PIL import Image, ImageDraw
    except ImportError:
        print("  Pillow not installed: skipping PNG icons (the app still works, but may not offer install)")
        return []

    def icon(size, maskable):
        img = Image.new("RGBA", (size, size), GRASS if maskable else (0, 0, 0, 0))
        d = ImageDraw.Draw(img)
        s = size / 64
        if not maskable:
            box = [2 * s, 2 * s, 62 * s, 62 * s]
            if hasattr(d, "rounded_rectangle"):  # Pillow 8.2+
                d.rounded_rectangle(box, radius=14 * s, fill=GRASS, outline=INK, width=round(3 * s))
            else:
                d.rectangle(box, fill=GRASS, outline=INK, width=round(3 * s))
        k = 0.8 if maskable else 1  # maskable icons keep the artwork inside the safe zone
        c = lambda v: size / 2 + (v - 32) * s * k
        w = max(1, round(2.5 * s * k))
        d.line([c(32), c(6), c(32), c(58)], fill="white", width=w)
        d.ellipse([c(23), c(23), c(41), c(41)], outline="white", width=w)
        d.ellipse([c(39), c(15), c(51), c(27)], fill=BALL, outline=INK, width=max(1, round(2 * s * k)))
        return img

    made = []
    for name, size, maskable in [("icon-192.png", 192, False), ("icon-512.png", 512, False), ("icon-512-maskable.png", 512, True)]:
        icon(size, maskable).save(folder / name)
        made.append(f"icons/{name}")
    return made


def main():
    src = (ROOT / "birdseye.html").read_text(encoding="utf-8")
    split = src.index('<header class="top">')
    head_part, body_part = src[:split], src[split:]

    shutil.rmtree(SITE, ignore_errors=True)
    for rel in ASSETS:
        (SITE / rel).parent.mkdir(parents=True, exist_ok=True)
        shutil.copy2(ROOT / rel, SITE / rel)
    (SITE / "icons").mkdir(parents=True)
    (SITE / "icons" / "icon.svg").write_text(ICON_SVG, encoding="utf-8")
    pngs = draw_png_icons(SITE / "icons")

    # Script URLs carry a hash of the assets, so browsers never reuse an old copy after a rebuild
    asset_version = hashlib.sha1(b"".join((ROOT / rel).read_bytes() for rel in ASSETS)).hexdigest()[:10]
    for rel in ASSETS:
        head_part = head_part.replace(f'src="{rel}"', f'src="{rel}?v={asset_version}"')
        body_part = body_part.replace(f'src="{rel}"', f'src="{rel}?v={asset_version}"')

    manifest = {
        "name": "Birdseye FC",
        "short_name": "Birdseye FC",
        "description": TAGLINE,
        "start_url": ".",
        "scope": ".",
        "display": "standalone",
        "background_color": GROUND,
        "theme_color": INK,
        "icons": [{"src": "icons/icon.svg", "sizes": "any", "type": "image/svg+xml"}]
        + [
            {"src": p, "sizes": "192x192" if "192" in p else "512x512", "type": "image/png", **({"purpose": "maskable"} if "maskable" in p else {})}
            for p in pngs
        ],
    }
    (SITE / "manifest.webmanifest").write_text(json.dumps(manifest, indent=2), encoding="utf-8")
    (SITE / ".nojekyll").write_text("", encoding="utf-8")  # GitHub Pages: serve the files as they are

    index = f"""<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="color-scheme" content="light dark">
<meta name="description" content="{TAGLINE}">
<meta name="theme-color" content="{INK}">
<link rel="manifest" href="manifest.webmanifest">
<link rel="icon" href="icons/icon.svg" type="image/svg+xml">
<link rel="apple-touch-icon" href="icons/icon-192.png">
<meta name="apple-mobile-web-app-capable" content="yes">
<style>body{{margin:0}}[hidden]{{display:none!important}}img{{max-width:100%}}.gen[hidden]+.lib{{border-top:0;padding-top:0}}</style>
<script>window.BIRDSEYE_STANDALONE = true;</script>
{head_part}</head>
<body>
{body_part}
<script>
  if ("serviceWorker" in navigator) {{
    window.addEventListener("load", () => navigator.serviceWorker.register("sw.js").catch(() => {{}}));
  }}
</script>
</body>
</html>
"""
    (SITE / "index.html").write_text(index, encoding="utf-8")

    shell = ["./", "index.html", "manifest.webmanifest", "icons/icon.svg", *pngs, *ASSETS]
    version = hashlib.sha1(b"".join((SITE / (p if p != "./" else "index.html")).read_bytes() for p in shell)).hexdigest()[:10]
    sw = f"""// Birdseye FC offline support. App files are cached when the app installs and refreshed in the
// background; fonts and libraries from CDNs are cached the first time they load.
const CACHE = "birdseye-{version}";
const SHELL = {json.dumps(shell)};

self.addEventListener("install", event => {{
  // Fetch fresh copies (not the browser's HTTP cache) so a new build never installs stale files
  event.waitUntil(
    caches.open(CACHE)
      .then(cache => cache.addAll(SHELL.map(url => new Request(url, {{ cache: "reload" }}))))
      .then(() => self.skipWaiting())
  );
}});

self.addEventListener("activate", event => {{
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
}});

self.addEventListener("fetch", event => {{
  const request = event.request;
  if (request.method !== "GET") return;
  if (new URL(request.url).origin === location.origin) {{
    // App files: answer from the cache straight away, update it from the network
    event.respondWith(caches.open(CACHE).then(async cache => {{
      const cached = await cache.match(request, {{ ignoreSearch: true }});
      const fresh = fetch(request, {{ cache: "no-cache" }})
        .then(response => {{ if (response.ok) cache.put(request, response.clone()); return response; }})
        .catch(() => cached);
      return cached || fresh;
    }}));
  }} else {{
    // CDN fonts and libraries: network first, cached copy when offline
    event.respondWith(
      fetch(request)
        .then(response => {{ const copy = response.clone(); caches.open(CACHE).then(cache => cache.put(request, copy)); return response; }})
        .catch(() => caches.match(request))
    );
  }}
}});
"""
    (SITE / "sw.js").write_text(sw, encoding="utf-8")

    total = sum(f.stat().st_size for f in SITE.rglob("*") if f.is_file())
    print(f"Built {SITE} ({total // 1024} KB, cache version {version})")
    for f in sorted(SITE.rglob("*")):
        if f.is_file():
            print("  ", f.relative_to(SITE))


if __name__ == "__main__":
    main()
