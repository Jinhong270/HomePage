const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const source = fs.readFileSync(path.join(__dirname, "../js/github-data.js"), "utf8");
const root = "https://api.github.com/users/Jinhong270";
const repoRoot = "https://api.github.com/repos/Jinhong270";

function response(body, status = 200, headers = {}) {
  return { ok: status >= 200 && status < 300, status, headers: new Headers(headers), json: async () => body };
}

function setup(fetcher, blockedStorage = false) {
  let now = 1800000000000;
  let timerId = 0;
  const calls = [];
  const storage = new Map();
  const timers = new Map();
  class Clock extends Date {
    constructor(...args) { super(...(args.length ? args : [now])); }
    static now() { return now; }
  }
  const context = {
    URL, Intl, Date: Clock, AbortController, Uint8Array, TextDecoder, atob,
    sessionStorage: {
      getItem(key) { if (blockedStorage) throw Error("blocked"); return storage.get(key) || null; },
      setItem(key, value) { if (blockedStorage) throw Error("blocked"); storage.set(key, value); },
      removeItem(key) { if (blockedStorage) throw Error("blocked"); storage.delete(key); }
    },
    fetch(url, options) { calls.push(url); return fetcher(url, options); },
    window: {
      setTimeout(callback) { timers.set(++timerId, callback); return timerId; },
      clearTimeout(id) { timers.delete(id); }
    }
  };
  vm.runInNewContext(source, context);
  return { api: context.window.JH270GitHub, calls, storage, timers, advance(ms) { now += ms; }, get now() { return now; } };
}

test("simultaneous reads share one request and later reads use the cache", async () => {
  let release;
  const app = setup(() => new Promise(resolve => { release = resolve; }));
  const first = app.api.loadRepo("HomePage");
  const second = app.api.loadRepo("HomePage");
  await Promise.resolve();
  assert.equal(app.calls.length, 1);
  release(response({ name: "HomePage" }));
  assert.equal((await first).name, "HomePage");
  assert.equal((await second).name, "HomePage");
  await app.api.loadRepo("HomePage");
  assert.equal(app.calls.length, 1);
  assert.equal(app.timers.size, 0);
});

test("profile cache expires after five minutes including the aggregate promise", async () => {
  const app = setup(url => Promise.resolve(response(url === root ? { login: "Jinhong270" } : [])));
  const first = await app.api.loadProfile();
  assert.equal(app.calls.length, 2);
  app.advance(299999);
  assert.equal(await app.api.loadProfile(), first);
  app.advance(1);
  assert.equal(app.api.peek(), null);
  assert.notEqual(await app.api.loadProfile(), first);
  assert.equal(app.calls.length, 4);
});

test("all repository pages are collected, deduplicated and sorted", async () => {
  const next = root + "/repos?per_page=100&sort=updated&page=2";
  const app = setup(url => {
    if (url === root) return Promise.resolve(response({ login: "Jinhong270" }));
    if (url === next) return Promise.resolve(response([{ id: 2, name: "New", pushed_at: "2026-11-12" }, { id: 1, name: "Old", pushed_at: "2026-01-01" }]));
    return Promise.resolve(response([{ id: 1, name: "Old", pushed_at: "2026-01-01" }], 200, { link: "<" + next + '>; rel="next"' }));
  });
  const profile = await app.api.loadProfile();
  assert.equal(profile.repos.map(item => item.name).join(","), "New,Old");
  assert.equal(app.calls.length, 3);
  assert.equal(app.timers.size, 0);
});

test("commit details include files after the first page and keep metadata", async () => {
  const url = repoRoot + "/HomePage/commits/abc123?per_page=100";
  const next = url + "&page=2";
  const app = setup(requested => Promise.resolve(requested === next
    ? response({ sha: "abc123", files: [{ filename: "second.js" }] })
    : response({ sha: "abc123", stats: { total: 5 }, files: [{ filename: "first.js" }] }, 200, { link: "<" + next + '>; rel="next"' })));
  const commit = await app.api.loadCommit("HomePage", "abc123");
  assert.equal(commit.files.map(file => file.filename).join(","), "first.js,second.js");
  assert.equal(commit.stats.total, 5);
});

test("pagination cannot follow another host or cycle indefinitely", async () => {
  for (const next of ["https://example.com/data", repoRoot + "/HomePage/commits/abc123?per_page=100"]) {
    const app = setup(() => Promise.resolve(response({ files: [] }, 200, { link: "<" + next + '>; rel="next"' })));
    await assert.rejects(app.api.loadCommit("HomePage", "abc123"), /invalid page link/);
    assert.equal(app.calls.length, 1);
  }
});

test("failed requests release the shared promise so retry works", async () => {
  let count = 0;
  const app = setup(() => ++count === 1 ? Promise.reject(Error("offline")) : Promise.resolve(response({ name: "HomePage" })));
  await assert.rejects(app.api.loadRepo("HomePage"), /offline/);
  assert.equal((await app.api.loadRepo("HomePage")).name, "HomePage");
  assert.equal(app.calls.length, 2);
  assert.equal(app.timers.size, 0);
});

test("successful HTTP responses with invalid JSON are never cached", async () => {
  let count = 0;
  const app = setup(() => {
    const result = response({ name: "HomePage" });
    if (++count === 1) result.json = () => Promise.reject(Error("bad JSON"));
    return Promise.resolve(result);
  });
  await assert.rejects(app.api.loadRepo("HomePage"), /unreadable response/);
  assert.equal((await app.api.loadRepo("HomePage")).name, "HomePage");
  assert.equal(app.calls.length, 2);
});

test("malformed, future and expired storage entries are ignored", async () => {
  for (const stamp of ["invalid", null, 1800000000001, 1799999700000]) {
    const app = setup(() => Promise.resolve(response({ name: "fresh" })));
    app.storage.set("jh270-gh:" + repoRoot + "/HomePage", JSON.stringify({ at: stamp, body: { name: "stale" } }));
    assert.equal((await app.api.loadRepo("HomePage")).name, "fresh");
    assert.equal(app.calls.length, 1);
  }
});

test("storage-denied sessions keep a bounded memory cache", async () => {
  const app = setup(url => Promise.resolve(response({ url })), true);
  for (let i = 0; i < 81; i++) await app.api.loadRepo("Repo" + i);
  await app.api.loadRepo("Repo80");
  assert.equal(app.calls.length, 81);
  await app.api.loadRepo("Repo0");
  assert.equal(app.calls.length, 82);
});

test("timeouts abort fetch and release timer and retry state", async () => {
  const app = setup((url, options) => new Promise((resolve, reject) => {
    options.signal.addEventListener("abort", () => {
      const error = Error("aborted");
      error.name = "AbortError";
      reject(error);
    });
  }));
  const task = app.api.loadRepo("HomePage");
  await Promise.resolve();
  const rejected = assert.rejects(task, { name: "AbortError" });
  app.timers.values().next().value();
  await rejected;
  assert.equal(app.timers.size, 0);
});

test("README decoding preserves Unicode and its relative asset directory", async () => {
  const app = setup(() => Promise.resolve(response({ name: "README.md", path: "docs/README.md", encoding: "base64", content: Buffer.from("Echo Courier 🚀").toString("base64") })));
  const readme = await app.api.loadReadme("HomePage");
  assert.equal(readme.text, "Echo Courier 🚀");
  assert.equal(readme.path, "docs/README.md");
});

test("missing README returns null and inaccessible large README gives a useful error", async () => {
  const missing = setup(() => Promise.resolve(response({ message: "Not Found" }, 404)));
  assert.equal(await missing.api.loadReadme("HomePage"), null);
  const large = setup(() => Promise.resolve(response({ encoding: "none", content: "" })));
  await assert.rejects(large.api.loadReadme("HomePage"), /too large/);
});

test("rate limits preserve status and provide the reset time", async () => {
  const app = setup(() => Promise.resolve(response({ message: "rate limited" }, 429, { "x-ratelimit-remaining": "0", "x-ratelimit-reset": "1800000600" })));
  await assert.rejects(app.api.loadRepo("HomePage"), error => error.status === 429 && /Try again after/.test(error.message));
});

test("public links reject script URLs and embedded credentials", () => {
  const app = setup(() => {});
  assert.equal(app.api.safeHttp("javascript:alert(1)"), "");
  assert.equal(app.api.safeHttp("https://user:password@example.com"), "");
  assert.equal(app.api.safeHttp("https://github.com/Jinhong270"), "https://github.com/Jinhong270");
});
