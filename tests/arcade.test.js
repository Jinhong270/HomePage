const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const source = fs.readFileSync(path.join(__dirname, "../js/arcade.js"), "utf8");

function setup() {
  const tasks = [];
  const timers = new Map();
  const instances = [];
  let timerId = 0;
  let closes = 0;
  let document;

  class Target {
    constructor() { this.listeners = new Map(); }
    addEventListener(type, callback, options = {}) {
      const listeners = this.listeners.get(type) || [];
      listeners.push({ callback, once: Boolean(options.once) });
      this.listeners.set(type, listeners);
    }
    dispatchEvent(event) {
      const listeners = this.listeners.get(event.type) || [];
      for (const listener of listeners.slice()) {
        if (listener.once) listeners.splice(listeners.indexOf(listener), 1);
        listener.callback(event);
      }
      return !event.defaultPrevented;
    }
    fire(type) { this.dispatchEvent({ type, preventDefault() { this.defaultPrevented = true; } }); }
  }

  class Node extends Target {
    constructor(tag) {
      super();
      this.tagName = tag;
      this.children = [];
      this.style = {};
      this.attributes = new Map();
      this.open = false;
      this.parent = null;
    }
    appendChild(child) {
      child.remove();
      child.parent = this;
      this.children.push(child);
      return child;
    }
    append(...nodes) { nodes.forEach(node => this.appendChild(node)); }
    replaceChildren(...nodes) {
      this.children.slice().forEach(child => child.remove());
      this.append(...nodes);
    }
    remove() {
      if (this.parent) this.parent.children.splice(this.parent.children.indexOf(this), 1);
      this.parent = null;
    }
    setAttribute(key, value) { this.attributes.set(key, value); }
    get isConnected() { return this === document.body || this === document.head || Boolean(this.parent && this.parent.isConnected); }
    focus() { document.activeElement = this; }
    showModal() { this.open = true; find(this, node => node.tagName === "button").focus(); }
    close() { this.open = false; tasks.push(() => this.fire("close")); }
    requestFullscreen() {
      if (this.tagName === "dialog") return Promise.reject(new TypeError("Dialogs cannot request fullscreen"));
      document.fullscreenElement = this;
      return Promise.resolve();
    }
  }

  function find(root, predicate) {
    if (predicate(root)) return root;
    for (const child of root.children) {
      const match = find(child, predicate);
      if (match) return match;
    }
    return null;
  }

  document = new Target();
  document.head = new Node("head");
  document.body = new Node("body");
  document.body.style.overflow = "scroll";
  document.currentScript = { src: "https://jh270.com/js/arcade.js?v=8" };
  document.createElement = tag => new Node(tag);
  document.fullscreenEnabled = true;
  document.exitFullscreen = () => { document.fullscreenElement = null; return Promise.resolve(); };
  const opener = new Node("button");
  document.body.appendChild(opener);
  opener.focus();
  const window = new Target();
  window.setTimeout = callback => { timers.set(++timerId, callback); return timerId; };
  window.clearTimeout = id => timers.delete(id);
  window.addEventListener("jh270-arcade-close", () => { closes += 1; });
  window.JH270Game = {
    create(body) {
      const instance = { destroyed: 0, destroy() { this.destroyed += 1; } };
      const start = new Node("button");
      start.textContent = "Start";
      body.appendChild(start);
      start.focus();
      instances.push(instance);
      return instance;
    }
  };
  vm.runInNewContext(source, { window, document, URL, Element: Node, CustomEvent: class { constructor(type) { this.type = type; } } });
  return {
    api: window.JH270Arcade, document, window, opener, instances, timers,
    get closes() { return closes; },
    get dialog() { return find(document.body, node => node.tagName === "dialog"); },
    get body() { return find(document.body, node => node.className === "arcade-body"); },
    get surface() { return find(document.body, node => node.className === "arcade-surface"); },
    get retry() { return find(document.body, node => node.textContent === "Reconnect"); },
    get fullButton() { return find(document.body, node => node.textContent === "Full screen"); },
    asset(tag) { return document.head.children.find(node => node.tagName === tag); },
    completeAssets() { document.head.children.slice().forEach(node => { if (node.onload) node.onload(); }); },
    flushTasks() { while (tasks.length) tasks.shift()(); }
  };
}

const tick = () => new Promise(resolve => setImmediate(resolve));

test("opening lazily loads assets once and repeated opens await the same game", async () => {
  const app = setup();
  assert.equal(app.document.head.children.length, 0);
  const first = app.api.open();
  assert.equal(app.api.open(), first);
  assert.equal(app.dialog.open, true);
  assert.equal(app.document.body.style.overflow, "hidden");
  assert.equal(app.document.head.children.length, 2);
  app.completeAssets();
  assert.equal(await first, true);
  assert.equal(app.instances.length, 1);
  assert.equal(app.timers.size, 0);
});

test("closing destroys once and immediately restores focus and scroll", async () => {
  const app = setup();
  const opening = app.api.open();
  app.completeAssets();
  await opening;
  app.api.close();
  assert.equal(app.instances[0].destroyed, 1);
  assert.equal(app.document.activeElement, app.opener);
  assert.equal(app.document.body.style.overflow, "scroll");
  assert.equal(app.body.children.length, 0);
  app.api.close();
  app.flushTasks();
  assert.equal(app.instances[0].destroyed, 1);
  assert.equal(app.closes, 1);
});

test("a deferred close event cannot destroy a reopened game", async () => {
  const app = setup();
  const opening = app.api.open();
  app.completeAssets();
  await opening;
  app.api.close();
  await app.api.open();
  app.flushTasks();
  assert.equal(app.dialog.open, true);
  assert.equal(app.instances.length, 2);
  assert.equal(app.instances[0].destroyed, 1);
  assert.equal(app.instances[1].destroyed, 0);
  assert.equal(app.document.body.style.overflow, "hidden");
  assert.equal(app.body.children.length, 1);
  app.api.close();
  assert.equal(app.document.activeElement, app.opener);
  assert.equal(app.document.body.style.overflow, "scroll");
});

test("closing before asset arrival prevents late creation but allows reopening", async () => {
  const app = setup();
  const first = app.api.open();
  app.api.close();
  app.completeAssets();
  assert.equal(await first, false);
  assert.equal(app.instances.length, 0);
  assert.equal(await app.api.open(), true);
  app.flushTasks();
  assert.equal(app.instances.length, 1);
  assert.equal(app.instances[0].destroyed, 0);
  assert.equal(app.document.head.children.length, 2);
});

test("close and reopen while loading creates only the newest session", async () => {
  const app = setup();
  const old = app.api.open();
  app.api.close();
  const current = app.api.open();
  app.flushTasks();
  app.completeAssets();
  assert.equal(await old, false);
  assert.equal(await current, true);
  assert.equal(app.instances.length, 1);
});

test("native close events clean up and a native close followed by reopen stays safe", async () => {
  const app = setup();
  const opening = app.api.open();
  app.completeAssets();
  await opening;
  app.dialog.close();
  await app.api.open();
  app.flushTasks();
  assert.equal(app.instances[0].destroyed, 1);
  assert.equal(app.instances[1].destroyed, 0);
  app.dialog.close();
  app.flushTasks();
  assert.equal(app.instances[1].destroyed, 1);
  assert.equal(app.document.activeElement, app.opener);
});

test("a failed script can retry while an already loaded stylesheet is reused", async () => {
  const app = setup();
  const first = app.api.open();
  app.asset("link").onload();
  app.asset("script").onerror();
  assert.equal(await first, false);
  assert.ok(app.retry);
  assert.equal(app.document.head.children.length, 1);
  app.retry.fire("click");
  app.asset("script").onload();
  await tick();
  assert.equal(app.instances.length, 1);
  assert.equal(app.document.head.children.length, 2);
  assert.equal(app.timers.size, 0);
});

test("timeout failures clear assets and let the visitor reconnect", async () => {
  const app = setup();
  const opening = app.api.open();
  Array.from(app.timers.values()).forEach(callback => callback());
  assert.equal(await opening, false);
  assert.ok(app.retry);
  assert.equal(app.document.head.children.length, 0);
  app.retry.fire("click");
  app.completeAssets();
  await tick();
  assert.equal(app.instances.length, 1);
  assert.equal(app.timers.size, 0);
});

test("late load failures do not replace a closed dialog with an error", async () => {
  const app = setup();
  const opening = app.api.open();
  app.api.close();
  app.asset("script").onerror();
  app.asset("link").onload();
  assert.equal(await opening, false);
  assert.equal(app.body.children.length, 0);
  assert.equal(app.retry, null);
});

test("destroy exceptions still restore page state and are not repeated", async () => {
  const app = setup();
  const opening = app.api.open();
  app.completeAssets();
  await opening;
  app.instances[0].destroy = function () { this.destroyed += 1; throw Error("game cleanup failed"); };
  assert.throws(() => app.api.close(), /game cleanup failed/);
  app.flushTasks();
  assert.equal(app.instances[0].destroyed, 1);
  assert.equal(app.document.activeElement, app.opener);
  assert.equal(app.document.body.style.overflow, "scroll");
});

test("fullscreen requests that complete after closing are exited", async () => {
  const app = setup();
  const opening = app.api.open();
  app.completeAssets();
  await opening;
  let finish;
  app.surface.requestFullscreen = () => new Promise(resolve => { finish = () => { app.document.fullscreenElement = app.surface; resolve(); }; });
  app.fullButton.fire("click");
  app.api.close();
  finish();
  await tick();
  assert.equal(app.document.fullscreenElement, null);
});

test("fullscreen targets the dialog contents and exits when the game closes", async () => {
  const app = setup();
  const opening = app.api.open();
  app.completeAssets();
  await opening;
  app.fullButton.fire("click");
  await tick();
  assert.equal(app.document.fullscreenElement, app.surface);
  app.api.close();
  assert.equal(app.document.fullscreenElement, null);
});
