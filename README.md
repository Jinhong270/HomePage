# jh270.com

Retro homepage for Jinhong270. Plain HTML, CSS, and JavaScript; no runtime dependencies or build step.

- `/` introduces the work and displays public GitHub repositories. The featured ECHO COURIER card opens `/game/` in the same tab. Other repository cards open their own pages on this site.
- `/game/` is the dedicated ECHO COURIER page at `https://www.jh270.com/game/`.
- `/repo/?name=<repository>` shows one public repository without leaving the site: details, languages, README, the commit list, and every commit's changed files. The link at the top, GitHub icon plus `Jinhong270/<repository>`, is the way out to GitHub.
- `/terminal/` is a guest shell for `guest@jh270.com`. Commands are printed, not executed. `/game` or `/game echo` navigates to `/game/` in the same tab.

A first visit uses the device's light or dark setting. The control at the top right switches between day and night. All pages share the same theme initialization. The game card, page, menus, and signal field follow that theme, including changes while a run is active or paused.

## ECHO COURIER · 270

A signal-rescue game built for this homepage. Your echo follows your exact route from 2.7 seconds ago. Swap back to it to sweep up signals along the connecting thread and stun pursuing glitches. Bring cargo to HOME: fuller deliveries earn more, and quick consecutive deliveries build a chain. Survive three 36-second sectors and choose an upgrade between them.

- Move with WASD, arrow keys, or by holding and dragging on the field.
- Press Space or the Echo button to swap. Move away from your echo first.
- Press P or Pause to pause; leaving the tab also pauses the game.
- Use the page controls to enter full screen or return to the homepage or terminal.
- Your personal best stays in this browser's local storage. Storage being unavailable does not prevent play.

The game loads only on `/game/`. It uses local canvas rendering with a capped pixel ratio and adjusts to the visible arena. Leaving the page releases animation frames, input listeners, and resize observation, or pauses the run when the browser keeps the page in its back/forward cache. Intro, pause, upgrade, and result screens do not run an animation loop. There are no embedded third-party games or game network requests.

## Data and rendering

The browser reads public GitHub data from `api.github.com` when the repository list approaches the viewport. Requests share in-flight work and use a five-minute session cache with a bounded memory cache. Repository lists and commit file details follow pagination. GitHub rate-limit errors show the reset time when provided; profile failures offer a retry. The playable project remains available if GitHub cannot load. Legacy arcade repositories are omitted from the homepage showcase; their GitHub repositories are unchanged.

Repository search reuses card elements. README output is built as DOM text and safe links, with limits for very large documents. The home clock and boot animation stop while the page is hidden. Terminal output, history, and queued commands are bounded.

## Local development

Serve the folder with any static HTTP server, for example:

```sh
python -m http.server 4173 --bind 127.0.0.1
```

Open `http://127.0.0.1:4173/`. No installation is required to serve the site. Node.js 20 or newer runs the automated checks:

```sh
node --test
```

The tests cover GitHub caching, errors and pagination, game rules and lifecycle, terminal game navigation, and game page redirects, full screen, and recovery. Browser checks should cover homepage and terminal navigation to `/game/`, keyboard and touch input, full screen, and portrait/landscape layouts.
