# jh270.com

Retro homepage for Jinhong270.

- `/` introduces the work and, in the browser, reads the public GitHub profile. Each repository card opens its own page on this site.
- `/repo/?name=<repository>` shows one public repository without leaving the site: details, languages, README, the commit list, and every commit's changed files. The link at the top, GitHub icon plus `Jinhong270/<repository>`, is the way out to GitHub.
- `/terminal/` is a guest shell for `guest@jh270.com`. Commands are printed, not executed. `/game` embeds Snake, 2048, and Tetris.

A first visit uses the device's light or dark setting. The control at the top right switches between day and night.

Embedded games are sized by the visible game panel, not by the screen, and no size is put in the game URL. Once a game has loaded, and again whenever the panel changes, such as rotating a phone or entering full screen, the terminal sends the panel size in CSS pixels with `postMessage`, shaped `{ type: "jh270:viewport", game, width, height, dpr }`. A game can ask for the current size at any time by posting `{ type: "jh270:viewport-request" }` to its parent. Inside the panel, a game's own `innerWidth` and `innerHeight` already report the same size.

GitHub data is read by the visitor's browser from `api.github.com` and kept for five minutes in that tab's session storage. GitHub allows 60 unauthenticated requests per hour for each IP address. When that limit is reached, the page says when it resets.

Serve this folder as a static site, or open `index.html` in a browser.
