# Crowd recordings

The crowd you hear is cut from one recording: **"Football game recorded on the neutral section
inside the crowd"** (Austria v Sweden, European Championship qualifier) by Work With Sounds /
Torsten Nilsson, [Creative Commons Attribution 4.0][src]. The steady murmur around 2:40 became the
background loop, and the sustained roar around 1:17 became the goal reaction.

[src]: https://commons.wikimedia.org/wiki/File:WWS_FootballAustriavs.Sweden.ogg

The audio files themselves are not committed (they are large and re-downloadable); the generated
`sound/recordings.js` is. To rebuild from scratch:

1. Download the source file above into `source/`.
2. Cut a steady stretch and a roar into `stadium-ambience-loop.wav` and `goal-reaction-cheer.wav`.
3. Run `python3 build_sounds.py`, then `python3 build_site.py`.

Any other recording works too: `build_sounds.py` picks the background from a file whose name contains
stadium/ambience/ambient, and the reaction from one containing goal/reaction/cheer.
