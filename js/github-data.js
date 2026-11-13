(function () {
  var USER = "Jinhong270";
  var PAGE = 30;
  var TTL = 300000;
  var CACHE_LIMIT = 80;
  var BLURBS = {
    AndroidToolBox: "Android SSH toolbox for browsing remote files and opening a shell. More tools are planned.",
    astrbot_plugin_hfapibilibili: "AstrBot plugin that resolves Bilibili links and downloads the video.",
    astrbot_plugin_youdaolittlep: "AstrBot plugin for Youdao Xiao P: chat, speech, and common questions.",
    api: "Hugging Face space titled API, packaged with the Docker SDK.",
    "AI-Agent": "Python repository.",
    miniapps: "Vue repository.",
    HomePage: "This retro homepage, the guest terminal, and Echo Courier, an original signal-rescue game."
  };
  var cached = null;
  var pending = null;
  var memory = new Map();
  var requests = new Map();
  var relativeFormat = new Intl.RelativeTimeFormat("en-US", { numeric: "auto" });
  var dateFormat = new Intl.DateTimeFormat("en-US", { year: "numeric", month: "long", day: "numeric" });

  function safeHttp(value) {
    try {
      var url = new URL(value);
      if (url.protocol !== "https:" || url.username || url.password) return "";
      return url.href;
    } catch (err) {
      return "";
    }
  }

  function fresh(at) {
    var age = Date.now() - at;
    return typeof at === "number" && isFinite(at) && age >= 0 && age < TTL;
  }

  function remember(url, entry) {
    memory.delete(url);
    memory.set(url, entry);
    while (memory.size > CACHE_LIMIT) memory.delete(memory.keys().next().value);
  }

  function cacheGet(url) {
    var hit = memory.get(url);
    if (!hit) {
      try {
        var raw = sessionStorage.getItem("jh270-gh:" + url);
        if (raw) hit = JSON.parse(raw);
      } catch (err) {}
    }
    if (!hit || !fresh(hit.at) || !Object.prototype.hasOwnProperty.call(hit, "body")) {
      memory.delete(url);
      try { sessionStorage.removeItem("jh270-gh:" + url); } catch (err) {}
      return null;
    }
    remember(url, hit);
    return hit;
  }

  function cachePut(url, body, next) {
    var entry = { at: Date.now(), body: body, next: next };
    remember(url, entry);
    try {
      var raw = JSON.stringify(entry);
      if (raw.length < 200000) sessionStorage.setItem("jh270-gh:" + url, raw);
      else sessionStorage.removeItem("jh270-gh:" + url);
    } catch (err) {}
    return entry;
  }

  function request(url) {
    var hit = cacheGet(url);
    if (hit) return Promise.resolve(hit);
    if (requests.has(url)) return requests.get(url);
    var controller = new AbortController();
    var timer = window.setTimeout(function () { controller.abort(); }, 12000);
    var task = Promise.resolve().then(function () {
      return fetch(url, {
        headers: { Accept: "application/vnd.github+json" },
        signal: controller.signal
      });
    }).then(function (res) {
      return res.json().catch(function () {
        if (res.ok) throw new Error("GitHub returned an unreadable response. Please try again.");
        return {};
      }).then(function (body) {
        if (!res.ok) {
          var reason = body && body.message ? body.message : "GitHub answered " + res.status;
          if ((res.status === 403 || res.status === 429) && res.headers.get("x-ratelimit-remaining") === "0") {
            var reset = Number(res.headers.get("x-ratelimit-reset"));
            reason = "GitHub's hourly limit for this browser has been reached." + (reset ? " Try again after " + new Date(reset * 1000).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" }) + "." : "");
          }
          var error = new Error(reason);
          error.status = res.status;
          throw error;
        }
        var link = /<([^>]+)>;\s*rel="next"/.exec(res.headers.get("link") || "");
        return cachePut(url, body, link ? link[1] : "");
      });
    }).finally(function () {
      window.clearTimeout(timer);
      requests.delete(url);
    });
    requests.set(url, task);
    return task;
  }

  function fetchJson(url) {
    return request(url).then(function (entry) { return entry.body; });
  }

  function peek() {
    return cached && fresh(cached.readAt.getTime()) ? cached : null;
  }

  async function pages(url, select) {
    var first = new URL(url);
    var seen = new Set();
    var items = [];
    var at = Infinity;
    var body;
    while (url) {
      var next = new URL(url);
      if (next.origin !== first.origin || next.pathname !== first.pathname || seen.has(next.href)) {
        throw new Error("GitHub returned an invalid page link. Please try again.");
      }
      seen.add(next.href);
      var entry = await request(next.href);
      var part = select ? select(entry.body) : entry.body;
      if (!Array.isArray(part)) throw new Error("GitHub did not return the requested list.");
      if (!body) body = entry.body;
      at = Math.min(at, entry.at);
      items.push.apply(items, part);
      url = entry.next;
    }
    return { body: body, items: items, at: at };
  }

  function loadProfile() {
    var current = peek();
    if (current) return Promise.resolve(current);
    if (pending) return pending;
    pending = Promise.all([
      request("https://api.github.com/users/" + USER),
      pages("https://api.github.com/users/" + USER + "/repos?per_page=100&sort=updated")
    ]).then(function (pair) {
      var unique = new Map();
      pair[1].items.forEach(function (repo) { unique.set(repo.id || repo.name, repo); });
      var repos = Array.from(unique.values()).sort(function (a, b) {
        return new Date(b.pushed_at) - new Date(a.pushed_at);
      });
      cached = {
        user: pair[0].body,
        repos: repos,
        readAt: new Date(Math.min(pair[0].at, pair[1].at))
      };
      return cached;
    }).finally(function () {
      pending = null;
    });
    return pending;
  }

  function repoUrl(name) {
    return "https://api.github.com/repos/" + USER + "/" + encodeURIComponent(name);
  }

  function loadRepo(name) {
    return fetchJson(repoUrl(name));
  }

  function loadCommits(name, page) {
    return fetchJson(repoUrl(name) + "/commits?per_page=" + PAGE + "&page=" + (page || 1));
  }

  function loadCommit(name, sha) {
    return pages(repoUrl(name) + "/commits/" + encodeURIComponent(sha) + "?per_page=100", function (body) {
      return body.files || [];
    }).then(function (result) {
      var files = new Map();
      result.items.forEach(function (file) { files.set(file.filename, file); });
      return Object.assign({}, result.body, { files: Array.from(files.values()) });
    });
  }

  function loadLanguages(name) {
    return fetchJson(repoUrl(name) + "/languages");
  }

  function loadReadme(name) {
    return fetchJson(repoUrl(name) + "/readme").then(function (file) {
      if (file.encoding && file.encoding !== "base64") throw new Error("This README is too large to display here. Open the repository on GitHub to read it.");
      var binary = atob(String(file.content || "").replace(/\s/g, ""));
      var bytes = new Uint8Array(binary.length);
      for (var i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
      return { name: file.name, path: file.path || file.name, text: new TextDecoder("utf-8").decode(bytes) };
    }).catch(function (err) {
      if (err && err.status === 404) return null;
      throw err;
    });
  }

  function blurb(repo) {
    if (repo && repo.description) return repo.description;
    if (repo && BLURBS[repo.name]) return BLURBS[repo.name];
    return "No description on GitHub yet.";
  }

  function relativeTime(iso) {
    var then = new Date(iso).getTime();
    if (!isFinite(then)) return "";
    var seconds = Math.round((then - Date.now()) / 1000);
    var format = relativeFormat;
    var abs = Math.abs(seconds);
    if (abs < 60) return format.format(seconds, "second");
    if (abs < 3600) return format.format(Math.round(seconds / 60), "minute");
    if (abs < 86400) return format.format(Math.round(seconds / 3600), "hour");
    if (abs < 86400 * 45) return format.format(Math.round(seconds / 86400), "day");
    if (abs < 86400 * 365) return format.format(Math.round(seconds / (86400 * 30)), "month");
    return format.format(Math.round(seconds / (86400 * 365)), "year");
  }

  function formatDate(iso) {
    var date = new Date(iso);
    if (!isFinite(date.getTime())) return "";
    return dateFormat.format(date);
  }

  window.JH270GitHub = {
    USER: USER,
    PAGE: PAGE,
    blurb: blurb,
    peek: peek,
    loadProfile: loadProfile,
    loadRepo: loadRepo,
    loadCommits: loadCommits,
    loadCommit: loadCommit,
    loadLanguages: loadLanguages,
    loadReadme: loadReadme,
    relativeTime: relativeTime,
    formatDate: formatDate,
    safeHttp: safeHttp
  };
})();
