const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const source = fs.readFileSync(path.join(__dirname, "../js/game.js"), "utf8");

function setup(options = {}) {
  class Target {
    constructor() { this.listeners = new Map(); }
    addEventListener(type, handler) {
      const handlers = this.listeners.get(type) || [];
      handlers.push(handler);
      this.listeners.set(type, handlers);
    }
    fire(type, detail = {}) {
      for (const handler of this.listeners.get(type) || []) handler({ type, ...detail });
    }
  }

  class Node extends Target {
    constructor(tag) {
      super();
      this.tagName = tag;
      this.children = [];
      this.attributes = new Map();
      this.hidden = false;
      this.textContent = "";
    }
    setAttribute(key, value) { this.attributes.set(key, value); }
    append(...children) { this.children.push(...children); }
    replaceChildren(...children) { this.children = children; }
  }

  const document = new Target();
  const window = new Target();
  const mount = new Node("div");
  const surface = new Node("div");
  const fullButton = new Node("button");
  fullButton.hidden = true;
  fullButton.textContent = "Full screen";
  const nodes = { "game-mount": mount, "game-surface": surface, "game-fullscreen": fullButton };
  const calls = { create: 0, pause: 0, destroy: 0, enter: 0, exit: 0, replace: [] };
  let rejectFullscreen = options.rejectFullscreen;
  document.getElementById = id => nodes[id];
  document.createElement = tag => new Node(tag);
  document.fullscreenEnabled = options.fullscreenEnabled !== false;
  document.fullscreenElement = null;
  document.exitFullscreen = () => {
    calls.exit += 1;
    document.fullscreenElement = null;
    document.fire("fullscreenchange");
    return Promise.resolve();
  };
  surface.requestFullscreen = () => {
    calls.enter += 1;
    if (rejectFullscreen) return Promise.reject(new Error("Fullscreen denied"));
    document.fullscreenElement = surface;
    document.fire("fullscreenchange");
    return Promise.resolve();
  };
  window.location = {
    pathname: options.pathname || "/game/",
    search: options.search || "",
    hash: options.hash || "",
    replace(url) { calls.replace.push(url); }
  };
  if (!options.missingEngine) {
    window.JH270Game = {
      create(container) {
        calls.create += 1;
        assert.equal(container, mount);
        if (options.createError) throw new Error("Engine could not initialize");
        return {
          pause() { calls.pause += 1; },
          destroy() { calls.destroy += 1; }
        };
      }
    };
  }
  vm.runInNewContext(source, { window, document });
  return {
    window, document, mount, surface, fullButton, calls,
    allowFullscreen() { rejectFullscreen = false; }
  };
}

test("the slashless game URL redirects without losing its query or fragment", () => {
  const app = setup({ pathname: "/game", search: "?mode=echo&from=terminal", hash: "#play" });
  assert.deepEqual(app.calls.replace, ["/game/?mode=echo&from=terminal#play"]);
  assert.equal(app.calls.create, 0);
  assert.equal(app.window.listeners.size, 0);
});

test("the canonical game page mounts once and toggles full screen", async () => {
  const app = setup();
  assert.equal(app.calls.create, 1);
  assert.deepEqual(app.calls.replace, []);
  assert.equal(app.fullButton.hidden, false);
  app.fullButton.fire("click");
  await Promise.resolve();
  assert.equal(app.document.fullscreenElement, app.surface);
  assert.equal(app.fullButton.textContent, "Exit full screen");
  app.fullButton.fire("click");
  await Promise.resolve();
  assert.equal(app.document.fullscreenElement, null);
  assert.equal(app.fullButton.textContent, "Full screen");
  assert.equal(app.calls.enter, 1);
  assert.equal(app.calls.exit, 1);
  assert.equal(app.calls.create, 1);
});

test("a rejected fullscreen request stays recoverable and does not destroy the game", async () => {
  const app = setup({ rejectFullscreen: true });
  app.fullButton.fire("click");
  await Promise.resolve();
  assert.equal(app.fullButton.textContent, "Unavailable");
  assert.equal(app.document.fullscreenElement, null);
  assert.equal(app.calls.destroy, 0);
  app.allowFullscreen();
  app.fullButton.fire("click");
  await Promise.resolve();
  assert.equal(app.document.fullscreenElement, app.surface);
  assert.equal(app.fullButton.textContent, "Exit full screen");
});

test("browsers without fullscreen support still mount the game and hide the control", () => {
  const app = setup({ fullscreenEnabled: false });
  assert.equal(app.calls.create, 1);
  assert.equal(app.fullButton.hidden, true);
});

test("page caching pauses the existing run and a permanent departure destroys it", () => {
  const app = setup();
  app.window.fire("pagehide", { persisted: true });
  assert.equal(app.calls.pause, 1);
  assert.equal(app.calls.destroy, 0);
  app.window.fire("pageshow", { persisted: true });
  assert.equal(app.calls.create, 1);
  assert.equal(app.calls.destroy, 0);
  app.window.fire("pagehide", { persisted: false });
  assert.equal(app.calls.destroy, 1);
});

test("a missing or failing engine displays an accessible reload action", () => {
  for (const options of [{ missingEngine: true }, { createError: true }]) {
    const app = setup(options);
    assert.equal(app.mount.children.length, 1);
    const message = app.mount.children[0];
    assert.equal(message.attributes.get("role"), "alert");
    assert.match(message.children[0].textContent, /Reload to try again/);
    const retry = message.children[1];
    assert.equal(retry.tagName, "a");
    assert.equal(retry.href, "/game/");
    assert.equal(retry.textContent, "Reload game");
    assert.equal(app.fullButton.hidden, true);
    assert.doesNotThrow(() => app.window.fire("pagehide", { persisted: false }));
  }
});
