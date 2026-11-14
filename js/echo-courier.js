(function () {
  "use strict";

  const DELAY = 2.7;
  const SECTOR_TIME = 36;
  const BEST_KEY = "jh270-echo-courier-best-v1";
  const PALETTES = {
    dark: {
      lime: "#c7fa73", cyan: "#71dfd4", amber: "#f3bd62", pink: "#f48e9b",
      background: "#090e0e", grid: "#17261e", fieldText: "#51644f",
      scanRgb: "244,142,155", scanWarning: "#a25d66", homeRing: "#43643b",
      homeGlow: "rgba(199,250,115,.11)", homeGlowEdge: "rgba(199,250,115,0)",
      homeThread: "rgba(199,250,115,.32)", trail: "rgba(113,223,212,.14)",
      echoReady: "rgba(113,223,212,.5)", echoCharging: "rgba(113,223,212,.16)",
      stunnedFill: "#163b35", glitchFill: "#3b1e28", playerCore: "#243222"
    },
    light: {
      lime: "#31572c", cyan: "#146d67", amber: "#99520c", pink: "#a63a4d",
      background: "#f4efe4", grid: "#ded8c9", fieldText: "#6c7160",
      scanRgb: "166,58,77", scanWarning: "#a35f6b", homeRing: "#8b9b78",
      homeGlow: "rgba(49,87,44,.11)", homeGlowEdge: "rgba(49,87,44,0)",
      homeThread: "rgba(49,87,44,.45)", trail: "rgba(20,109,103,.23)",
      echoReady: "rgba(20,109,103,.65)", echoCharging: "rgba(20,109,103,.3)",
      stunnedFill: "#d8e9e2", glitchFill: "#f0d6d8", playerCore: "#f4efe4"
    }
  };
  const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
  const distance = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);

  function segmentDistance(point, start, end) {
    const dx = end.x - start.x;
    const dy = end.y - start.y;
    const length = dx * dx + dy * dy;
    const t = length ? clamp(((point.x - start.x) * dx + (point.y - start.y) * dy) / length, 0, 1) : 0;
    return Math.hypot(point.x - start.x - t * dx, point.y - start.y - t * dy);
  }

  function create(container) {
    const abort = new AbortController();
    const signal = abort.signal;
    const root = document.createElement("section");
    root.className = "echo-game";
    root.setAttribute("aria-label", "Echo Courier, an original game by Jinhong270");
    root.innerHTML = '<div class="echo-hud"><div class="echo-stat"><span>SIGNAL SCORE</span><strong data-score>000</strong></div><div class="echo-stat"><span>CARGO</span><strong data-cargo>0 / 6</strong></div><div class="echo-stat"><span>INTEGRITY</span><strong data-health>●●●●</strong></div><div class="echo-stat"><span data-sector>SECTOR 01 / 03</span><strong data-time>36s</strong></div></div><div class="echo-arena"><canvas class="echo-canvas" tabindex="0" aria-label="Pilot with WASD or arrow keys, or drag on the field. Space swaps with your echo. P pauses."></canvas><p class="echo-message" aria-live="polite"></p></div><div class="echo-controls"><p><strong>WASD / arrows / drag</strong> · pilot &nbsp; <strong>SPACE</strong> · echo &nbsp; <strong>P</strong> · pause</p><button type="button" class="echo-swap" disabled>Echo charging</button><button type="button" class="echo-pause" disabled>Pause</button></div><div class="echo-overlay"><div class="echo-panel"></div></div><p class="echo-sr" role="status" aria-live="polite"></p>';
    container.replaceChildren(root);
    const canvas = root.querySelector("canvas");
    const ctx = canvas.getContext("2d");
    const arena = root.querySelector(".echo-arena");
    const overlay = root.querySelector(".echo-overlay");
    const panel = root.querySelector(".echo-panel");
    const message = root.querySelector(".echo-message");
    const live = root.querySelector(".echo-sr");
    const scoreNode = root.querySelector("[data-score]");
    const cargoNode = root.querySelector("[data-cargo]");
    const healthNode = root.querySelector("[data-health]");
    const sectorNode = root.querySelector("[data-sector]");
    const timeNode = root.querySelector("[data-time]");
    const swapButton = root.querySelector(".echo-swap");
    const pauseButton = root.querySelector(".echo-pause");
    const keys = new Set();
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let theme = document.documentElement.dataset.theme === "dark" ? "dark" : "light";
    let colors = PALETTES[theme];
    let best = 0;
    try { best = Math.max(0, Number(localStorage.getItem(BEST_KEY)) || 0); } catch (error) {}
    let state = "intro";
    let destroyed = false;
    let frame = 0;
    let lastFrame = 0;
    let worldWidth = 900;
    let width = 900;
    let height = 500;
    let worldHeight = 540;
    let scale = 1;
    let time = 0;
    let sectorTime = SECTOR_TIME;
    let sector = 1;
    let score = 0;
    let delivered = 0;
    let echoCatches = 0;
    let cargo = 0;
    let capacity = 6;
    let health = 4;
    let pickupRadius = 24;
    let cooldown = 3.6;
    let echoReady = DELAY;
    let invincible = 0;
    let messageUntil = 0;
    let combo = 1;
    let lastBank = -20;
    let spawnClock = 0;
    let scanClock = 4.5;
    let player = { x: worldWidth / 2, y: worldHeight / 2 };
    let home = { x: worldWidth / 2, y: worldHeight / 2 };
    let echo = { ...player };
    let history = [];
    let packets = [];
    let glitches = [];
    let scans = [];
    let particles = [];
    let labels = [];
    let swapFlash = null;
    let pointer = null;
    let hudValue = "";

    function listen(target, event, callback, options) {
      target.addEventListener(event, callback, { ...options, signal });
    }

    function syncTheme() {
      const next = document.documentElement.dataset.theme === "dark" ? "dark" : "light";
      if (next === theme || destroyed) return;
      theme = next;
      colors = PALETTES[theme];
      hudValue = "";
      updateHud();
      draw();
    }

    function setMessage(text, seconds) {
      if (message.textContent !== text) message.textContent = text;
      messageUntil = time + (seconds || 3);
    }

    function announce(text) {
      live.textContent = text;
    }

    function showPanel(html) {
      panel.innerHTML = html;
      overlay.hidden = false;
      const first = panel.querySelector("button");
      if (first) first.focus({ preventScroll: true });
    }

    function stopLoop() {
      cancelAnimationFrame(frame);
      frame = 0;
      keys.clear();
      pointer = null;
    }

    function startLoop() {
      if (destroyed || state !== "playing" || frame) return;
      lastFrame = performance.now();
      frame = requestAnimationFrame(tick);
    }

    function intro() {
      showPanel('<p class="echo-eyebrow">JINHONG270 ORIGINAL · ONE PILOT, TWO MOMENTS</p><h2>ECHO <span>COURIER</span></h2><p class="echo-subtitle">TRANSMISSION 270 &nbsp; / &nbsp; A shortcut through your own past.</p><p class="echo-description">The network is losing its memories. Bring the scattered signals home. Your echo follows 2.7 seconds behind — swap places and turn the route between you into a signal-catching thread.</p><ol class="echo-rules"><li><b>01 / RECOVER</b>Collect amber diamonds. Bring a full load to the HOME ring for bigger rewards.</li><li><b>02 / REWIND</b>Press Space to swap with your echo. The thread catches signals and stuns glitches.</li><li><b>03 / OUTSMART</b>Avoid pink glitches and warned scanner lanes. Survive 3 sectors; choose your upgrades.</li></ol><div class="echo-start-row"><button type="button" class="echo-primary" data-action="start">Enter the network →</button><small>About 2 minutes · personal best ' + Math.floor(best) + '<br>Move: WASD / arrows / drag · Echo: Space</small></div>');
      draw();
    }

    function randomPosition() {
      const margin = 46;
      let point;
      for (let i = 0; i < 12; i++) {
        point = { x: margin + Math.random() * (worldWidth - margin * 2), y: margin + Math.random() * (worldHeight - margin * 2) };
        if (distance(point, home) > 100) break;
      }
      return point;
    }

    function addPacket(point) {
      if (packets.length >= 32) return;
      const position = point || randomPosition();
      packets.push({ x: position.x, y: position.y, phase: Math.random() * Math.PI * 2 });
    }

    function addGlitch() {
      const position = randomPosition();
      if (distance(position, player) < 150) position.x = player.x < worldWidth / 2 ? worldWidth - 45 : 45;
      glitches.push({ ...position, angle: Math.random() * Math.PI * 2, stun: 0, speed: 29 + sector * 7 + Math.random() * 9 });
    }

    function start() {
      stopLoop();
      state = "playing";
      time = 0;
      sectorTime = SECTOR_TIME;
      sector = 1;
      score = 0;
      delivered = 0;
      echoCatches = 0;
      cargo = 0;
      capacity = 6;
      health = 4;
      pickupRadius = 24;
      cooldown = 3.6;
      echoReady = DELAY;
      invincible = 1;
      combo = 1;
      lastBank = -20;
      spawnClock = 0;
      scanClock = 4.5;
      home = { x: worldWidth / 2, y: worldHeight / 2 };
      player = { ...home };
      echo = { ...home };
      history = [{ t: 0, ...player }];
      packets = [];
      glitches = [];
      scans = [];
      particles = [];
      labels = [];
      swapFlash = null;
      for (let i = 0; i < 18; i++) addPacket();
      for (let i = 0; i < 3; i++) addGlitch();
      overlay.hidden = true;
      pauseButton.disabled = false;
      pauseButton.textContent = "Pause";
      setMessage("Collect amber signals. Return to HOME to bank your cargo.", 6);
      announce("New route started. Collect signals and return to HOME.");
      updateHud();
      canvas.focus({ preventScroll: true });
      startLoop();
    }

    function burst(x, y, color, count) {
      const amount = reduced ? Math.min(3, count) : count;
      for (let i = 0; i < amount; i++) {
        const angle = Math.random() * Math.PI * 2;
        const speed = 25 + Math.random() * 110;
        particles.push({ x, y, vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed, life: .35 + Math.random() * .35, color });
      }
      if (particles.length > 140) particles.splice(0, particles.length - 140);
    }

    function label(text, x, y, color) {
      labels.push({ text, x, y, color, life: 1.3 });
      if (labels.length > 8) labels.shift();
    }

    function bank() {
      if (!cargo) return;
      combo = time - lastBank < 11 ? Math.min(combo + 1, 4) : 1;
      const gain = Math.round(cargo * (8 + cargo * 2) * (1 + (combo - 1) * .25));
      score += gain;
      delivered += cargo;
      label("+" + gain + (combo > 1 ? "  CHAIN ×" + combo : "  DELIVERED"), home.x, home.y - 56, "lime");
      burst(home.x, home.y, "lime", 22);
      announce(cargo + " signals delivered. Score " + score + ".");
      cargo = 0;
      lastBank = time;
      setMessage("Transmission restored. Bank again within 11s to build a delivery chain.", 3.5);
    }

    function pickup(index, threaded) {
      const item = packets[index];
      cargo += 1;
      if (threaded) echoCatches += 1;
      burst(item.x, item.y, threaded ? "cyan" : "amber", 6);
      packets.splice(index, 1);
      if (cargo === capacity) setMessage("Cargo full. Follow the dotted line HOME.", 4);
    }

    function swap() {
      if (state !== "playing" || time < echoReady || history.length < 2) return;
      const startPoint = { ...player };
      const endPoint = { ...echo };
      if (distance(startPoint, endPoint) < 18) {
        setMessage("Move first — your echo is where you were 2.7 seconds ago.", 2.5);
        return;
      }
      let caught = 0;
      for (let i = packets.length - 1; i >= 0 && cargo < capacity; i--) {
        if (segmentDistance(packets[i], startPoint, endPoint) < pickupRadius + 10) {
          pickup(i, true);
          caught += 1;
        }
      }
      glitches.forEach(glitch => {
        if (segmentDistance(glitch, startPoint, endPoint) < 42) {
          glitch.stun = 3;
          burst(glitch.x, glitch.y, "cyan", 8);
        }
      });
      player.x = endPoint.x;
      player.y = endPoint.y;
      echoReady = time + cooldown;
      invincible = Math.max(invincible, .65);
      swapFlash = { start: startPoint, end: endPoint, life: .45 };
      history.push({ t: time, ...player });
      burst(startPoint.x, startPoint.y, "cyan", 14);
      burst(endPoint.x, endPoint.y, "lime", 14);
      if (caught) {
        label("THREAD +" + caught, player.x, player.y - 27, "cyan");
        setMessage("Echo thread recovered " + caught + " signal" + (caught === 1 ? "" : "s") + ".", 2);
      }
      pointer = null;
      updateHud();
    }

    function hit() {
      if (invincible > 0 || distance(player, home) < 52) return;
      health -= 1;
      invincible = 1.6;
      const dropped = Math.ceil(cargo / 2);
      cargo -= dropped;
      for (let i = 0; i < dropped; i++) {
        const angle = Math.PI * 2 * i / Math.max(1, dropped);
        addPacket({ x: clamp(player.x + Math.cos(angle) * 52, 30, worldWidth - 30), y: clamp(player.y + Math.sin(angle) * 52, 30, worldHeight - 30) });
      }
      burst(player.x, player.y, "pink", 18);
      label("−1 INTEGRITY", player.x, player.y - 24, "pink");
      announce("Integrity " + health + " of 4. " + dropped + " signals dropped.");
      setMessage("Signal disrupted. Your dropped cargo can be recovered.", 3);
      if (health <= 0) finish(false);
    }

    function addScan() {
      const vertical = Math.random() > .5;
      const limit = vertical ? worldWidth : worldHeight;
      const position = clamp((vertical ? player.x : player.y) + (Math.random() - .5) * 95, 60, limit - 60);
      scans.push({ vertical, position, age: 0, warning: Math.max(.95, 1.5 - sector * .12), width: 48 + sector * 5 });
    }

    function updateEcho() {
      history.push({ t: time, ...player });
      const target = time - DELAY;
      while (history.length > 2 && history[1].t <= target) history.shift();
      const a = history[0];
      const b = history[1] || a;
      const fraction = b.t > a.t ? clamp((target - a.t) / (b.t - a.t), 0, 1) : 0;
      echo.x = a.x + (b.x - a.x) * fraction;
      echo.y = a.y + (b.y - a.y) * fraction;
    }

    function update(dt) {
      time += dt;
      sectorTime -= dt;
      invincible = Math.max(0, invincible - dt);
      let dx = Number(keys.has("arrowright") || keys.has("d")) - Number(keys.has("arrowleft") || keys.has("a"));
      let dy = Number(keys.has("arrowdown") || keys.has("s")) - Number(keys.has("arrowup") || keys.has("w"));
      if (!dx && !dy && pointer) {
        dx = pointer.x - player.x;
        dy = pointer.y - player.y;
        if (Math.hypot(dx, dy) < 5) dx = dy = 0;
      }
      const length = Math.hypot(dx, dy);
      if (length) {
        const step = Math.min(pointer && !keys.size ? length : Infinity, (220 - cargo * 2.2) * dt);
        player.x = clamp(player.x + dx / length * step, 18, worldWidth - 18);
        player.y = clamp(player.y + dy / length * step, 22, worldHeight - 22);
      }
      updateEcho();
      for (let i = packets.length - 1; i >= 0 && cargo < capacity; i--) {
        if (distance(player, packets[i]) < pickupRadius) pickup(i, false);
      }
      if (distance(player, home) < 46) bank();
      glitches.forEach(glitch => {
        glitch.stun = Math.max(0, glitch.stun - dt);
        if (glitch.stun) return;
        const target = distance(player, home) < 85 ? { x: home.x + Math.cos(time * .5 + glitch.angle) * 150, y: home.y + Math.sin(time * .5 + glitch.angle) * 125 } : player;
        const vx = target.x - glitch.x;
        const vy = target.y - glitch.y;
        const len = Math.hypot(vx, vy) || 1;
        glitch.x += vx / len * glitch.speed * dt;
        glitch.y += vy / len * glitch.speed * dt;
        if (distance(glitch, player) < 21) hit();
      });
      for (let i = scans.length - 1; i >= 0; i--) {
        const scan = scans[i];
        scan.age += dt;
        if (scan.age > scan.warning + .7) { scans.splice(i, 1); continue; }
        if (scan.age >= scan.warning && Math.abs((scan.vertical ? player.x : player.y) - scan.position) < scan.width / 2 + 10) hit();
      }
      if (state !== "playing") return;
      spawnClock -= dt;
      if (spawnClock <= 0) {
        spawnClock = .8;
        if (packets.length < 18 + sector * 2) addPacket();
      }
      scanClock -= dt;
      if (scanClock <= 0) {
        scanClock = Math.max(1.65, 4.3 - sector * .75);
        addScan();
        if (sector === 3 && Math.random() > .6) addScan();
      }
      particles.forEach(item => { item.x += item.vx * dt; item.y += item.vy * dt; item.life -= dt; });
      particles = particles.filter(item => item.life > 0);
      labels.forEach(item => { item.y -= dt * 18; item.life -= dt; });
      labels = labels.filter(item => item.life > 0);
      if (swapFlash) { swapFlash.life -= dt; if (swapFlash.life <= 0) swapFlash = null; }
      if (time > messageUntil) {
        const hint = cargo === capacity ? "CARGO FULL · RETURN HOME" : time < DELAY ? "YOUR ECHO IS FORMING…" : "BUILD A ROUTE · SWAP THROUGH SIGNALS · BRING THEM HOME";
        if (message.textContent !== hint) message.textContent = hint;
      }
      updateHud();
      if (state === "playing" && sectorTime <= 0) {
        bank();
        if (sector >= 3) finish(true);
        else upgrades();
      }
    }

    function updateHud() {
      const remaining = Math.max(0, Math.ceil(echoReady - time));
      const value = [score, cargo, capacity, health, sector, Math.ceil(sectorTime), remaining, state].join("|");
      if (value === hudValue) return;
      hudValue = value;
      scoreNode.textContent = String(score).padStart(3, "0");
      cargoNode.textContent = cargo + " / " + capacity;
      cargoNode.style.color = cargo === capacity ? colors.amber : "";
      healthNode.textContent = "●".repeat(Math.max(0, health)) + "○".repeat(4 - Math.max(0, health));
      healthNode.style.color = health <= 1 ? colors.pink : "";
      healthNode.setAttribute("aria-label", health + " of 4 integrity");
      sectorNode.textContent = "SECTOR 0" + sector + " / 03";
      timeNode.textContent = Math.max(0, Math.ceil(sectorTime)) + "s";
      swapButton.disabled = state !== "playing" || remaining > 0;
      swapButton.textContent = remaining ? "Echo in " + remaining + "s" : "↔ Echo swap · SPACE";
    }

    function upgrades() {
      state = "upgrade";
      stopLoop();
      updateHud();
      showPanel('<p class="echo-eyebrow">SECTOR 0' + sector + ' RESTORED · CHOOSE YOUR NEXT EDGE</p><h2>Rewrite <span>the rules.</span></h2><p class="echo-description">All carried signals have been delivered. The next sector is noisier. Pick one upgrade for the rest of this run.</p><div class="echo-upgrades"><button type="button" data-upgrade="thread"><b>01 / QUICK ECHO</b><span>Swap 0.8 seconds sooner. More shortcuts, more signal-catching threads.</span></button><button type="button" data-upgrade="cargo"><b>02 / DEEP POCKETS</b><span>Carry 3 extra signals. Full loads multiply your delivery reward.</span></button><button type="button" data-upgrade="magnet"><b>03 / SOFT LANDING</b><span>Repair 1 integrity and widen your pickup range by 12.</span></button></div>');
      announce("Sector " + sector + " complete. Score " + score + ". Choose an upgrade.");
    }

    function chooseUpgrade(kind) {
      if (state !== "upgrade") return;
      if (kind === "thread") cooldown = Math.max(1.6, cooldown - .8);
      if (kind === "cargo") capacity += 3;
      if (kind === "magnet") { health = Math.min(4, health + 1); pickupRadius += 12; }
      sector += 1;
      sectorTime = SECTOR_TIME;
      player = { ...home };
      echo = { ...home };
      history = [{ t: time, ...player }];
      echoReady = time + DELAY;
      invincible = 1.5;
      scans = [];
      glitches = [];
      for (let i = 0; i < 2 + sector * 2; i++) addGlitch();
      scanClock = 3;
      state = "playing";
      overlay.hidden = true;
      setMessage("Sector 0" + sector + ". Your echo is your escape route.", 4);
      pauseButton.textContent = "Pause";
      updateHud();
      canvas.focus({ preventScroll: true });
      startLoop();
    }

    function finish(completed) {
      state = "finished";
      stopLoop();
      const record = score > best;
      if (record) {
        best = score;
        try { localStorage.setItem(BEST_KEY, String(best)); } catch (error) {}
      }
      const rank = completed ? score >= 1800 ? "Ghost in the network" : score >= 900 ? "Master of echoes" : score >= 270 ? "Signal keeper" : "A spark survives" : "Every echo leaves a trace";
      pauseButton.disabled = true;
      updateHud();
      showPanel('<p class="echo-eyebrow">' + (completed ? 'ALL THREE SECTORS RESTORED' : 'CONNECTION LOST · THE NETWORK REMEMBERS') + '</p><h2>' + (completed ? 'You brought<br><span>the light back.</span>' : 'One more<br><span>impossible route?</span>') + '</h2><p class="echo-subtitle">' + rank + (record ? ' · NEW PERSONAL BEST' : '') + '</p><div class="echo-result"><div><b>' + score + '</b><span>SIGNAL SCORE</span></div><div><b>' + delivered + '</b><span>SIGNALS SAVED</span></div><div><b>' + echoCatches + '</b><span>THREAD CATCHES</span></div></div><p class="echo-description">' + (echoCatches ? 'Your past self did more than follow. It helped bring the network home.' : 'Try a wider route: leave signals between you and your echo, then press Space to catch them along the thread.') + '</p><div class="echo-start-row"><button type="button" class="echo-primary" data-action="start">Run a new route →</button><small>Personal best ' + Math.floor(best) + ' · A new network every run</small></div>');
      announce((completed ? "Run complete. " : "Connection lost. ") + "Score " + score + ". " + rank + ".");
    }

    function pause() {
      if (state !== "playing" || destroyed) return;
      state = "paused";
      stopLoop();
      updateHud();
      pauseButton.textContent = "Resume";
      showPanel('<p class="echo-eyebrow">TRANSMISSION ON HOLD</p><h2>Take <span>a breath.</span></h2><p class="echo-description">Your route is safe. Remember: build a wide path, then swap with your 2.7-second-old echo to catch everything along the thread.</p><div class="echo-start-row"><button type="button" class="echo-primary" data-action="resume">Resume transmission →</button><button type="button" data-action="start">Start a new run</button></div>');
      draw();
    }

    function resume() {
      if (state !== "paused" || destroyed || document.hidden) return;
      state = "playing";
      overlay.hidden = true;
      pauseButton.textContent = "Pause";
      updateHud();
      canvas.focus({ preventScroll: true });
      startLoop();
    }

    function diamond(x, y, radius, color, fill) {
      ctx.beginPath();
      ctx.moveTo(x, y - radius);
      ctx.lineTo(x + radius, y);
      ctx.lineTo(x, y + radius);
      ctx.lineTo(x - radius, y);
      ctx.closePath();
      ctx.strokeStyle = color;
      ctx.fillStyle = color;
      if (fill) ctx.fill(); else ctx.stroke();
    }

    function draw() {
      if (!ctx || destroyed) return;
      ctx.setTransform(canvas.width / width, 0, 0, canvas.height / height, 0, 0);
      ctx.fillStyle = colors.background;
      ctx.fillRect(0, 0, width, height);
      ctx.save();
      ctx.scale(scale, scale);
      ctx.lineWidth = 1 / scale;
      ctx.strokeStyle = colors.grid;
      ctx.beginPath();
      for (let x = 0; x < worldWidth; x += 45) { ctx.moveTo(x, 0); ctx.lineTo(x, worldHeight); }
      for (let y = 0; y < worldHeight; y += 45) { ctx.moveTo(0, y); ctx.lineTo(worldWidth, y); }
      ctx.stroke();
      ctx.font = "10px monospace";
      ctx.fillStyle = colors.fieldText;
      ctx.textAlign = "left";
      ctx.fillText("JH270 // MEMORY NETWORK", 18, worldHeight - 16);
      ctx.textAlign = "right";
      ctx.fillText("Δt 2.70s", worldWidth - 18, worldHeight - 16);

      scans.forEach(scan => {
        const firing = scan.age >= scan.warning;
        const alpha = firing ? .23 : .05 + .07 * Math.sin(scan.age * 13) ** 2;
        ctx.fillStyle = "rgba(" + colors.scanRgb + "," + alpha + ")";
        ctx.strokeStyle = firing ? colors.pink : colors.scanWarning;
        ctx.lineWidth = firing ? 2 : 1;
        ctx.setLineDash(firing ? [] : [6, 7]);
        if (scan.vertical) {
          ctx.fillRect(scan.position - scan.width / 2, 0, scan.width, worldHeight);
          ctx.strokeRect(scan.position - scan.width / 2, -2, scan.width, worldHeight + 4);
        } else {
          ctx.fillRect(0, scan.position - scan.width / 2, worldWidth, scan.width);
          ctx.strokeRect(-2, scan.position - scan.width / 2, worldWidth + 4, scan.width);
        }
        ctx.setLineDash([]);
        if (!firing) {
          ctx.font = "bold 12px monospace";
          ctx.fillStyle = colors.pink;
          ctx.textAlign = "center";
          ctx.fillText("!", scan.vertical ? scan.position : 22, scan.vertical ? 24 : scan.position + 4);
        }
      });

      const pulse = reduced ? 0 : Math.sin(time * 2) * 4;
      const glow = ctx.createRadialGradient(home.x, home.y, 15, home.x, home.y, 85);
      glow.addColorStop(0, colors.homeGlow);
      glow.addColorStop(1, colors.homeGlowEdge);
      ctx.fillStyle = glow;
      ctx.beginPath(); ctx.arc(home.x, home.y, 85, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = colors.homeRing;
      ctx.lineWidth = 1;
      ctx.beginPath(); ctx.arc(home.x, home.y, 49 + pulse, 0, Math.PI * 2); ctx.stroke();
      ctx.strokeStyle = colors.lime;
      ctx.setLineDash([4, 8]);
      ctx.beginPath(); ctx.arc(home.x, home.y, 43, -time * .15, Math.PI * 2 - time * .15); ctx.stroke();
      ctx.setLineDash([]);
      ctx.font = "10px monospace";
      ctx.fillStyle = colors.lime;
      ctx.textAlign = "center";
      ctx.fillText("HOME", home.x, home.y + 4);
      if (cargo) {
        ctx.strokeStyle = colors.homeThread;
        ctx.setLineDash([3, 8]);
        ctx.beginPath(); ctx.moveTo(player.x, player.y); ctx.lineTo(home.x, home.y); ctx.stroke();
        ctx.setLineDash([]);
      }

      if (history.length > 1) {
        ctx.beginPath();
        history.forEach((item, index) => { if (index === 0) ctx.moveTo(item.x, item.y); else ctx.lineTo(item.x, item.y); });
        ctx.strokeStyle = colors.trail;
        ctx.lineWidth = 2;
        ctx.stroke();
        ctx.strokeStyle = time >= echoReady ? colors.echoReady : colors.echoCharging;
        ctx.lineWidth = 1;
        ctx.setLineDash([6, 8]);
        ctx.beginPath(); ctx.moveTo(player.x, player.y); ctx.lineTo(echo.x, echo.y); ctx.stroke();
        ctx.setLineDash([]);
        diamond(echo.x, echo.y, 12, colors.cyan, false);
        ctx.font = "9px monospace";
        ctx.fillStyle = colors.cyan;
        ctx.fillText("−2.7s", echo.x, echo.y - 20);
      }

      packets.forEach(item => {
        const bob = reduced ? 0 : Math.sin(time * 2.5 + item.phase) * 2;
        ctx.globalAlpha = .12;
        diamond(item.x, item.y + bob, 14, colors.amber, true);
        ctx.globalAlpha = 1;
        diamond(item.x, item.y + bob, 6, colors.amber, true);
      });

      glitches.forEach(glitch => {
        ctx.save();
        ctx.translate(glitch.x, glitch.y);
        ctx.rotate(reduced ? glitch.angle : time * (glitch.stun ? -.5 : 1) + glitch.angle);
        ctx.lineWidth = 1.5;
        ctx.strokeStyle = glitch.stun ? colors.cyan : colors.pink;
        ctx.fillStyle = glitch.stun ? colors.stunnedFill : colors.glitchFill;
        ctx.beginPath(); ctx.moveTo(0, -12); ctx.lineTo(11, 8); ctx.lineTo(-11, 8); ctx.closePath(); ctx.fill(); ctx.stroke();
        ctx.restore();
        if (glitch.stun) {
          ctx.fillStyle = colors.cyan;
          ctx.font = "8px monospace";
          ctx.fillText("STUN", glitch.x, glitch.y - 19);
        }
      });

      if (swapFlash) {
        ctx.globalAlpha = swapFlash.life / .45;
        ctx.strokeStyle = colors.cyan;
        ctx.lineWidth = reduced ? 3 : 12 * swapFlash.life;
        ctx.beginPath(); ctx.moveTo(swapFlash.start.x, swapFlash.start.y); ctx.lineTo(swapFlash.end.x, swapFlash.end.y); ctx.stroke();
        ctx.globalAlpha = 1;
      }

      ctx.globalAlpha = invincible > 0 && Math.floor(time * 12) % 2 ? .55 : 1;
      if (!reduced) { ctx.shadowColor = colors.lime; ctx.shadowBlur = 13; }
      diamond(player.x, player.y, 10, colors.lime, true);
      ctx.shadowBlur = 0;
      ctx.fillStyle = colors.playerCore;
      ctx.fillRect(player.x - 2, player.y - 2, 4, 4);
      ctx.globalAlpha = 1;
      if (cargo) {
        for (let i = 0; i < cargo; i++) {
          const angle = (Math.PI * 2 * i / capacity) - Math.PI / 2;
          ctx.fillStyle = colors.amber;
          ctx.beginPath(); ctx.arc(player.x + Math.cos(angle) * 19, player.y + Math.sin(angle) * 19, 2, 0, Math.PI * 2); ctx.fill();
        }
      }
      particles.forEach(item => {
        ctx.globalAlpha = Math.min(1, item.life * 2);
        ctx.fillStyle = colors[item.color];
        ctx.fillRect(item.x - 1, item.y - 1, 3, 3);
      });
      ctx.globalAlpha = 1;
      labels.forEach(item => {
        ctx.globalAlpha = Math.min(1, item.life * 2);
        ctx.fillStyle = colors[item.color];
        ctx.font = "bold 12px monospace";
        ctx.fillText(item.text, clamp(item.x, 90, worldWidth - 90), item.y);
      });
      ctx.globalAlpha = 1;
      ctx.restore();
    }

    function tick(now) {
      frame = 0;
      if (destroyed || state !== "playing") return;
      const dt = Math.min(.04, Math.max(0, (now - lastFrame) / 1000));
      lastFrame = now;
      update(dt);
      draw();
      if (state === "playing") frame = requestAnimationFrame(tick);
    }

    function resize() {
      const rect = arena.getBoundingClientRect();
      if (!rect.width || !rect.height) return;
      const previousHeight = worldHeight;
      const previousWidth = worldWidth;
      worldWidth = rect.width < 600 ? 540 : 900;
      width = rect.width;
      height = rect.height;
      scale = width / worldWidth;
      worldHeight = height / scale;
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      const ratio = worldHeight / previousHeight;
      const ratioX = worldWidth / previousWidth;
      [player, echo, ...history, ...packets, ...glitches, ...particles, ...labels].forEach(item => { item.x *= ratioX; item.y *= ratio; });
      scans.forEach(scan => { scan.position *= scan.vertical ? ratioX : ratio; });
      home.x = worldWidth / 2;
      home.y = worldHeight / 2;
      if (swapFlash) {
        swapFlash.start.x *= ratioX; swapFlash.end.x *= ratioX;
        swapFlash.start.y *= ratio; swapFlash.end.y *= ratio;
      }
      pointer = null;
      draw();
    }

    function pointerPosition(event) {
      const rect = canvas.getBoundingClientRect();
      return { x: clamp((event.clientX - rect.left) / scale, 18, worldWidth - 18), y: clamp((event.clientY - rect.top) / scale, 22, worldHeight - 22), id: event.pointerId };
    }

    listen(root, "click", event => {
      const target = event.target.closest("button");
      if (!target) return;
      if (target.dataset.action === "start") start();
      if (target.dataset.action === "resume") resume();
      if (target.dataset.upgrade) chooseUpgrade(target.dataset.upgrade);
      if (target === swapButton) { swap(); canvas.focus({ preventScroll: true }); }
      if (target === pauseButton) { if (state === "paused") resume(); else pause(); }
    });
    listen(root, "keydown", event => {
      if (event.altKey || event.ctrlKey || event.metaKey) return;
      const key = event.key.toLowerCase();
      if (key === "p" && !event.repeat) {
        event.preventDefault();
        if (state === "paused") resume(); else pause();
        return;
      }
      if (state !== "playing") return;
      if (["arrowup", "arrowdown", "arrowleft", "arrowright", "w", "a", "s", "d"].includes(key)) {
        event.preventDefault();
        keys.add(key);
        pointer = null;
      }
      if (key === " " && event.target.tagName !== "BUTTON") {
        event.preventDefault();
        if (!event.repeat) swap();
      }
    });
    listen(window, "keyup", event => keys.delete(event.key.toLowerCase()));
    listen(canvas, "pointerdown", event => {
      if (state !== "playing" || pointer || (event.pointerType === "mouse" && event.button !== 0)) return;
      event.preventDefault();
      canvas.focus({ preventScroll: true });
      pointer = pointerPosition(event);
      canvas.setPointerCapture(event.pointerId);
    });
    listen(canvas, "pointermove", event => {
      if (!pointer || pointer.id !== event.pointerId) return;
      pointer = pointerPosition(event);
    });
    ["pointerup", "pointercancel", "lostpointercapture"].forEach(type => listen(canvas, type, event => {
      if (pointer && pointer.id === event.pointerId) pointer = null;
    }));
    listen(window, "jh270-theme", syncTheme);
    listen(window, "blur", pause);
    listen(document, "visibilitychange", () => { if (document.hidden) pause(); });
    const observer = new ResizeObserver(resize);
    observer.observe(arena);
    resize();
    if (ctx) intro();
    else showPanel('<h2>Canvas unavailable</h2><p class="echo-description">This browser cannot draw the game. Try a current browser with canvas support.</p>');

    return {
      pause,
      resume,
      destroy() {
        if (destroyed) return;
        destroyed = true;
        stopLoop();
        abort.abort();
        observer.disconnect();
        root.remove();
        history = packets = glitches = scans = particles = labels = [];
      }
    };
  }

  window.JH270Game = Object.freeze({ create });
})();
