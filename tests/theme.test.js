const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

function setup(saved, writable = true) {
  const system = new EventTarget();
  const window = new EventTarget();
  const label = {};
  const button = Object.assign(new EventTarget(), { querySelector: () => label, setAttribute() {} });
  const root = { dataset: {}, classList: new Set() };
  const document = { documentElement: root, querySelectorAll: () => [button], querySelector: () => null };
  window.matchMedia = query => query.includes("color-scheme") ? system : { matches: true };
  const localStorage = {
    getItem: () => saved,
    setItem(key, value) { if (!writable) throw new Error("Storage unavailable"); saved = value; },
    removeItem() { saved = null; }
  };
  const context = vm.createContext({ window, document, localStorage, CustomEvent });
  for (const file of ["theme-init.js", "theme.js"]) {
    vm.runInContext(fs.readFileSync(path.join(__dirname, "../js", file), "utf8"), context);
  }
  return { api: window.JH270Theme, button, label, system, window };
}

test("an in-session choice survives system changes when storage is unavailable", () => {
  const { api, button, label, system } = setup(null, false);
  assert.equal(api.choice, "system");
  button.dispatchEvent(new Event("click"));
  system.dispatchEvent(new Event("change"));
  assert.equal(api.choice, "dark");
  assert.equal(label.textContent, "NIGHT");
});

test("theme changes from another tab update the label and honor cleared preferences", () => {
  const { api, label, system, window } = setup("dark");
  window.dispatchEvent(Object.assign(new Event("storage"), { key: "jh270-theme", newValue: "light" }));
  assert.equal(label.textContent, "DAY");
  system.matches = true;
  window.dispatchEvent(Object.assign(new Event("storage"), { key: null, newValue: null }));
  assert.equal(api.choice, "system");
  assert.equal(api.theme, "dark");
  assert.equal(label.textContent, "NIGHT");
});
