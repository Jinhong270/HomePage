const { test } = require("node:test");
const assert = require("node:assert/strict");
const { readFileSync } = require("node:fs");
const { resolve } = require("node:path");
const vm = require("node:vm");
const { setMaxListeners, getEventListeners } = require("node:events");

const source = readFileSync(resolve(__dirname, "../js/echo-courier.js"), "utf8").replace(/\r\n/g, "\n");
const instrumented = source.replace("      pause,\n      resume,", "      inspect: expression => eval(expression),\n      pause,\n      resume,");

function harness(options = {}) {
  let now = 0;
  let nextFrame = 1;
  let observer;
  const frames = new Map();
  const storage = new Map();
  const nodes = new Map();
  const draws = [];
  const rect = { width: 900, height: 500, left: 0, top: 0 };
  const context = new Proxy({
    fillRect(...args) { draws.push({ type: "rect", color: context.fillStyle, args }); },
    fillText(text) { draws.push({ type: "text", color: context.fillStyle, text }); }
  }, { get(target, key) {
    if (key === "createRadialGradient") return () => ({ addColorStop() {} });
    return key in target ? target[key] : () => {};
  } });
  class Element extends EventTarget {
    constructor(name) { super(); this.name = name; this.style = {}; this.dataset = {}; this.textContent = ""; this.innerHTML = ""; this.tagName = "DIV"; }
    setAttribute(name, value) { this[name] = value; }
    querySelector(selector) {
      if (!nodes.has(selector)) nodes.set(selector, new Element(selector));
      return nodes.get(selector);
    }
    replaceChildren(child) { this.child = child; }
    getBoundingClientRect() { return { ...rect }; }
    getContext() { return options.noCanvas ? null : context; }
    focus() { this.focused = true; }
    setPointerCapture() {}
    remove() { this.removed = true; }
  }
  const document = new Element("document");
  document.documentElement = { dataset: { theme: options.theme || "dark" } };
  document.createElement = () => new Element("root");
  document.hidden = false;
  const window = new Element("window");
  window.matchMedia = () => ({ matches: false });
  window.devicePixelRatio = 3;
  const sandbox = {
    window, document, console,
    AbortController: class extends AbortController {
      constructor() { super(); setMaxListeners(0, this.signal); }
    },
    localStorage: {
      getItem(key) { if (options.noStorage) throw new Error("Storage disabled"); return storage.get(key) || null; },
      setItem(key, value) { if (options.noStorage) throw new Error("Storage disabled"); storage.set(key, value); }
    },
    performance: { now: () => now },
    requestAnimationFrame(callback) { const id = nextFrame++; frames.set(id, callback); return id; },
    cancelAnimationFrame(id) { frames.delete(id); },
    ResizeObserver: class {
      constructor(callback) { this.callback = callback; observer = this; }
      observe() {}
      disconnect() { this.disconnected = true; }
    }
  };
  vm.runInNewContext(instrumented, sandbox, { filename: "echo-courier.js" });
  const container = new Element("container");
  const game = window.JH270Game.create(container);
  return {
    game, frames, nodes, storage, rect, window, document, container, draws,
    theme(value) {
      document.documentElement.dataset.theme = value;
      window.dispatchEvent(new Event("jh270-theme"));
    },
    get observer() { return observer; },
    advance(ms) {
      now += ms;
      const callbacks = [...frames.values()];
      frames.clear();
      callbacks.forEach(callback => callback(now));
    }
  };
}

test("intro and pause stay idle; resume and destroy own one animation loop", () => {
  const h = harness();
  assert.equal(h.frames.size, 0);
  assert.equal(h.game.inspect("state"), "intro");
  h.game.inspect("start()");
  assert.equal(h.frames.size, 1);
  h.advance(16);
  assert.equal(h.frames.size, 1);
  h.game.pause();
  assert.equal(h.frames.size, 0);
  assert.equal(h.game.inspect("state"), "paused");
  h.game.resume();
  h.game.resume();
  assert.equal(h.frames.size, 1);
  h.game.destroy();
  h.game.destroy();
  assert.equal(h.frames.size, 0);
  assert.ok(h.observer.disconnected);
  assert.ok(h.container.child.removed);
  h.game.resume();
  assert.equal(h.frames.size, 0);
});

test("echo interpolates the pilot position exactly 2.7 simulation seconds ago", () => {
  const h = harness();
  h.game.inspect("start(); history = [{t: 0, x: 20, y: 40}, {t: 1, x: 120, y: 80}, {t: 2, x: 220, y: 120}]; time = 3.2; player = {x: 400, y: 200}; updateEcho()");
  assert.ok(Math.abs(h.game.inspect("echo.x") - 70) < 1e-8);
  assert.ok(Math.abs(h.game.inspect("echo.y") - 60) < 1e-8);
  assert.equal(h.game.inspect("history.length"), 4);
  h.game.destroy();
});

test("animation scheduling advances the clock and held movement continuously", () => {
  const h = harness();
  h.game.inspect("start(); packets = []; glitches = []; keys.add('d')");
  for (let i = 0; i < 60; i++) h.advance(1000 / 60);
  assert.ok(Math.abs(h.game.inspect("time") - 1) < 1e-8);
  assert.ok(Math.abs(h.game.inspect("sectorTime") - 35) < 1e-8);
  assert.ok(Math.abs(h.game.inspect("player.x") - 670) < 1e-8);
  assert.equal(h.frames.size, 1);
  h.game.pause();
  h.advance(60000);
  h.game.resume();
  h.advance(1000 / 60);
  assert.ok(Math.abs(h.game.inspect("time") - (1 + 1 / 60)) < 1e-8);
  assert.equal(h.frames.size, 1);
  h.game.destroy();
});

test("echo swap catches only signals along its thread and stuns intersecting glitches", () => {
  const h = harness();
  h.game.inspect("start(); time = 4; echoReady = 0; player = {x: 100, y: 100}; echo = {x: 400, y: 100}; history = [{t: 0, x: 400, y: 100}, {t: 1, x: 100, y: 100}]; packets = [{x: 200, y: 100}, {x: 300, y: 180}]; glitches = [{x: 250, y: 100, stun: 0}]; swap()");
  assert.equal(h.game.inspect("player.x"), 400);
  assert.equal(h.game.inspect("cargo"), 1);
  assert.equal(h.game.inspect("packets.length"), 1);
  assert.equal(h.game.inspect("echoCatches"), 1);
  assert.equal(h.game.inspect("glitches[0].stun"), 3);
  assert.equal(h.game.inspect("echoReady"), 7.6);
  h.game.inspect("echo = {x: 50, y: 100}; swap()");
  assert.equal(h.game.inspect("player.x"), 400);
  h.game.destroy();
});

test("banking rewards full loads and quick chains, then resets the chain", () => {
  const h = harness();
  h.game.inspect("start(); cargo = 6; bank()");
  assert.equal(h.game.inspect("score"), 120);
  assert.equal(h.game.inspect("cargo"), 0);
  assert.equal(h.game.inspect("delivered"), 6);
  h.game.inspect("time = 5; cargo = 6; bank()");
  assert.equal(h.game.inspect("score"), 270);
  assert.equal(h.game.inspect("combo"), 2);
  h.game.inspect("time = 20; cargo = 1; bank()");
  assert.equal(h.game.inspect("score"), 280);
  assert.equal(h.game.inspect("combo"), 1);
  h.game.destroy();
});

test("HOME is safe, hits scatter half cargo, and invulnerability prevents duplicate damage", () => {
  const h = harness();
  h.game.inspect("start(); invincible = 0; hit()");
  assert.equal(h.game.inspect("health"), 4);
  h.game.inspect("player = {x: 80, y: 80}; packets = []; cargo = 5; hit(); hit()");
  assert.equal(h.game.inspect("health"), 3);
  assert.equal(h.game.inspect("cargo"), 2);
  assert.equal(h.game.inspect("packets.length"), 3);
  h.game.inspect("health = 1; invincible = 0; hit()");
  assert.equal(h.game.inspect("state"), "finished");
  assert.equal(h.frames.size, 0);
  h.game.destroy();
});

test("scanner warning is harmless before firing and HOME remains protected", () => {
  const h = harness();
  h.game.inspect("start(); packets = []; glitches = []; player = {x: 100, y: 100}; invincible = 0; scans = [{vertical: true, position: 100, age: 0, warning: 1, width: 50}]; update(.1)");
  assert.equal(h.game.inspect("health"), 4);
  h.game.inspect("scans[0].age = 1; update(.01)");
  assert.equal(h.game.inspect("health"), 3);
  h.game.destroy();
});

test("a lethal hit on the final sector frame remains a defeat without banking cargo", () => {
  const h = harness();
  h.game.inspect("start(); packets = []; glitches = []; player = {x: 100, y: 100}; invincible = 0; health = 1; cargo = 4; score = 42; sector = 3; sectorTime = .001; scans = [{vertical: true, position: 100, age: 1, warning: 1, width: 50}]; update(.01)");
  assert.equal(h.game.inspect("state"), "finished");
  assert.equal(h.game.inspect("health"), 0);
  assert.equal(h.game.inspect("score"), 42);
  assert.equal(h.game.inspect("delivered"), 0);
  assert.equal(h.frames.size, 0);
  assert.match(h.nodes.get(".echo-panel").innerHTML, /CONNECTION LOST/);
  assert.doesNotMatch(h.nodes.get(".echo-panel").innerHTML, /ALL THREE SECTORS RESTORED/);
  h.game.destroy();
});

test("sectors bank cargo, offer upgrades, finish at sector three and restart cleanly", () => {
  const h = harness();
  h.game.inspect("start(); cargo = 4; sectorTime = .001; update(.01)");
  assert.equal(h.game.inspect("state"), "upgrade");
  assert.equal(h.game.inspect("score"), 64);
  assert.equal(h.frames.size, 0);
  h.game.inspect("chooseUpgrade('cargo')");
  assert.equal(h.game.inspect("capacity"), 9);
  assert.equal(h.game.inspect("sector"), 2);
  assert.equal(h.game.inspect("sectorTime"), 36);
  assert.equal(h.frames.size, 1);
  h.game.inspect("sectorTime = .001; update(.01); chooseUpgrade('magnet')");
  assert.equal(h.game.inspect("pickupRadius"), 36);
  assert.equal(h.game.inspect("sector"), 3);
  h.game.inspect("sectorTime = .001; update(.01)");
  assert.equal(h.game.inspect("state"), "finished");
  assert.equal(h.frames.size, 0);
  assert.equal(h.storage.get("jh270-echo-courier-best-v1"), "64");
  h.game.inspect("start()");
  assert.equal(h.game.inspect("score"), 0);
  assert.equal(h.game.inspect("capacity"), 6);
  assert.equal(h.game.inspect("sector"), 1);
  assert.equal(h.game.inspect("health"), 4);
  assert.equal(h.game.inspect("best"), 64);
  assert.equal(h.frames.size, 1);
  h.game.destroy();
});

test("resize keeps positions proportional and caps retina rendering resolution", () => {
  const h = harness();
  h.game.inspect("start(); player = {x: 450, y: 250}");
  h.rect.width = 390;
  h.rect.height = 500;
  h.game.inspect("resize()");
  assert.equal(h.game.inspect("worldWidth"), 540);
  assert.equal(h.game.inspect("player.x"), 270);
  assert.ok(Math.abs(h.game.inspect("player.y / worldHeight") - .5) < 1e-8);
  assert.equal(h.nodes.get("canvas").width, 780);
  h.game.destroy();
});

test("hidden tab pauses and disabled storage or canvas degrades safely", () => {
  const h = harness({ noStorage: true });
  h.game.inspect("start(); score = 100; finish(true)");
  assert.equal(h.game.inspect("best"), 100);
  h.game.inspect("start()");
  h.document.hidden = true;
  h.document.dispatchEvent(new Event("visibilitychange"));
  assert.equal(h.game.inspect("state"), "paused");
  h.game.resume();
  assert.equal(h.game.inspect("state"), "paused");
  h.game.destroy();
  const unsupported = harness({ noCanvas: true });
  assert.match(unsupported.nodes.get(".echo-panel").innerHTML, /Canvas unavailable/);
  unsupported.game.destroy();
});

test("opening uses the current homepage canvas palette without starting animation", () => {
  for (const [theme, background] of [["light", "#f4efe4"], ["dark", "#090e0e"]]) {
    const h = harness({ theme });
    assert.equal(h.draws[0].color, background);
    assert.equal(h.frames.size, 0);
    assert.equal(h.game.inspect("state"), "intro");
    h.game.destroy();
  }
});

test("a paused theme switch repaints effects and HUD without changing the run", () => {
  const h = harness();
  h.game.inspect("start(); time = 4; score = 77; cargo = capacity; health = 1; burst(20, 20, 'pink', 2); label('Theme sample', 40, 40, 'lime')");
  h.game.pause();
  const snapshot = "JSON.stringify([state, time, sectorTime, score, cargo, health, history, particles, labels])";
  const before = h.game.inspect(snapshot);
  h.draws.length = 0;
  h.theme("light");
  assert.equal(h.game.inspect(snapshot), before);
  assert.equal(h.frames.size, 0);
  assert.equal(h.draws[0].color, "#f4efe4");
  assert.ok(h.draws.some(draw => draw.type === "rect" && draw.args[2] === 3 && draw.color === "#a63a4d"));
  assert.ok(h.draws.some(draw => draw.text === "Theme sample" && draw.color === "#31572c"));
  assert.equal(h.nodes.get("[data-cargo]").style.color, "#99520c");
  assert.equal(h.nodes.get("[data-health]").style.color, "#a63a4d");
  h.game.destroy();
});

test("a live theme switch preserves its frame and recolors in both directions", () => {
  const h = harness({ theme: "light" });
  h.game.inspect("start(); time = 4; cargo = capacity; health = 1; updateHud()");
  const pendingFrames = [...h.frames.keys()];
  h.draws.length = 0;
  h.theme("dark");
  assert.deepEqual([...h.frames.keys()], pendingFrames);
  assert.equal(h.game.inspect("state"), "playing");
  assert.equal(h.game.inspect("time"), 4);
  assert.equal(h.draws[0].color, "#090e0e");
  assert.equal(h.nodes.get("[data-cargo]").style.color, "#f3bd62");
  assert.equal(h.nodes.get("[data-health]").style.color, "#f48e9b");
  h.game.destroy();
});

test("idle theme redraws stay idle and destroying removes the theme subscription", () => {
  const h = harness();
  assert.equal(getEventListeners(h.window, "jh270-theme").length, 1);
  for (const state of ["intro", "upgrade", "finished"]) {
    h.game.inspect("state = '" + state + "'");
    h.draws.length = 0;
    h.theme(h.document.documentElement.dataset.theme === "dark" ? "light" : "dark");
    assert.ok(h.draws.length > 0);
    assert.equal(h.frames.size, 0);
    assert.equal(h.game.inspect("state"), state);
  }
  h.game.destroy();
  assert.equal(getEventListeners(h.window, "jh270-theme").length, 0);
  h.draws.length = 0;
  h.theme("dark");
  assert.equal(h.draws.length, 0);
});
