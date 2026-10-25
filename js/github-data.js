(function () {
  var USER = "Jinhong270";
  var PAGE = 30;
  var TTL = 300000;
  var BLURBS = {
    AndroidToolBox: "Android SSH toolbox for browsing remote files and opening a shell. More tools are planned.",
    Snake: "Classic snake. Steer, eat, and don't run into yourself.",
    "2048": "Slide tiles on a 4×4 board until they merge into 2048.",
    Tetris: "Stack falling pieces and clear lines.",
    astrbot_plugin_hfapibilibili: "AstrBot plugin that resolves Bilibili links and downloads the video.",
    astrbot_plugin_youdaolittlep: "AstrBot plugin for Youdao Xiao P: chat, speech, and common questions.",
    api: "Hugging Face space titled API, packaged with the Docker SDK.",
    "AI-Agent": "Python repository.",
    miniapps: "Vue repository.",
    HomePage: "This retro homepage and the guest terminal."
  };
  var cached = null;
  var pending = null;
  var memory = {};

  function safeHttp(value) {
    try {
      var url = new URL(value);
      if (url.protocol !== "https:") return "";
      return url.href;
    } catch (err) {
      return "";
    }
  }

  function cacheGet(url) {
    var hit = memory[url];
    if (!hit) {
      try {
        var raw = sessionStorage.getItem("jh270-gh:" + url);
        if (raw) hit = JSON.parse(raw);
      } catch (err) {}
    }
    if (!hit || Date.now() - hit.at > TTL) return null;
    memory[url] = hit;
    return hit;
  }

  function cachePut(url, body) {
    var entry = { at: Date.now(), body: body };
    memory[url] = entry;
    try {
      var raw = JSON.stringify(entry);
      if (raw.length < 200000) sessionStorage.setItem("jh270-gh:" + url, raw);
    } catch (err) {}
    return entry;
  }

  function request(url) {
    var hit = cacheGet(url);
    if (hit) return Promise.resolve(hit);
    var controller = new AbortController();
    var timer = window.setTimeout(function () { controller.abort(); }, 12000);
    return fetch(url, {
      headers: { Accept: "application/vnd.github+json" },
      signal: controller.signal
    }).then(function (res) {
      return res.json().catch(function () { return {}; }).then(function (body) {
        if (!res.ok) {
          var reason = body && body.message ? body.message : "GitHub answered " + res.status;
          if (res.status === 403 && res.headers.get("x-ratelimit-remaining") === "0") {
            var reset = Number(res.headers.get("x-ratelimit-reset"));
            reason = "GitHub's hourly limit for this browser has been reached." + (reset ? " Try again after " + new Date(reset * 1000).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" }) + "." : "");
          }
          var error = new Error(reason);
          error.status = res.status;
          throw error;
        }
        return cachePut(url, body);
      });
    }).finally(function () {
      window.clearTimeout(timer);
    });
  }

  function fetchJson(url) {
    return request(url).then(function (entry) { return entry.body; });
  }

  function peek() {
    return cached;
  }

  function loadProfile() {
    if (cached) return Promise.resolve(cached);
    if (pending) return pending;
    pending = Promise.all([
      request("https://api.github.com/users/" + USER),
      request("https://api.github.com/users/" + USER + "/repos?per_page=100&sort=updated")
    ]).then(function (pair) {
      var list = pair[1].body;
      if (!list || !Array.isArray(list)) {
        var message = list && list.message ? list.message : "GitHub did not return repositories.";
        throw new Error(message);
      }
      var repos = list.slice().sort(function (a, b) {
        return new Date(b.pushed_at) - new Date(a.pushed_at);
      });
      cached = {
        user: pair[0].body,
        repos: repos,
        readAt: new Date(Math.min(pair[0].at, pair[1].at))
      };
      return cached;
    }).catch(function (err) {
      pending = null;
      throw err;
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
    return fetchJson(repoUrl(name) + "/commits/" + encodeURIComponent(sha));
  }

  function loadLanguages(name) {
    return fetchJson(repoUrl(name) + "/languages");
  }

  function loadReadme(name) {
    return fetchJson(repoUrl(name) + "/readme").then(function (file) {
      var binary = atob(String(file.content || "").replace(/\s/g, ""));
      var bytes = new Uint8Array(binary.length);
      for (var i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
      return { name: file.name, text: new TextDecoder("utf-8").decode(bytes) };
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
    var format = new Intl.RelativeTimeFormat("en-US", { numeric: "auto" });
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
    return date.toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
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
