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
      this.textContent = "";
    }
    setAttribute(key, value) { this.attributes.set(key, value); }
    append(...children) { this.children.push(...children); }
    replaceChildren(...children) { this.children = children; }
  }

  const document = new Target();
  const window = new Target();
  const mount = new Node("div");
  const nodes = { "game-mount": mount };
  const calls = { create: 0, pause: 0, destroy: 0, replace: [] };
  document.getElementById = id => nodes[id];
  document.createElement = tag => new Node(tag);
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
  return { window, document, mount, calls };
}

test("the slashless game URL redirects without losing its query or fragment", () => {
  const app = setup({ pathname: "/game", search: "?mode=echo&from=terminal", hash: "#play" });
  assert.deepEqual(app.calls.replace, ["/game/?mode=echo&from=terminal#play"]);
  assert.equal(app.calls.create, 0);
  assert.equal(app.window.listeners.size, 0);
});

test("the canonical game page mounts once", () => {
  const app = setup();
  assert.equal(app.calls.create, 1);
  assert.deepEqual(app.calls.replace, []);
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
    assert.doesNotThrow(() => app.window.fire("pagehide", { persisted: false }));
  }
});
