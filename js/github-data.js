(function () {
  var USER = "Jinhong270";
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

  function safeHttp(value) {
    try {
      var url = new URL(value);
      if (url.protocol !== "https:") return "";
      return url.href;
    } catch (err) {
      return "";
    }
  }

  function fetchJson(url) {
    var controller = new AbortController();
    var timer = window.setTimeout(function () { controller.abort(); }, 12000);
    return fetch(url, {
      headers: { Accept: "application/vnd.github+json" },
      signal: controller.signal
    }).then(function (res) {
      return res.json().catch(function () { return {}; }).then(function (body) {
        if (!res.ok) {
          var reason = body && body.message ? body.message : "GitHub answered " + res.status;
          throw new Error(reason);
        }
        return body;
      });
    }).finally(function () {
      window.clearTimeout(timer);
    });
  }

  function loadProfile() {
    if (cached) return Promise.resolve(cached);
    if (pending) return pending;
    pending = Promise.all([
      fetchJson("https://api.github.com/users/" + USER),
      fetchJson("https://api.github.com/users/" + USER + "/repos?per_page=100&sort=updated")
    ]).then(function (pair) {
      if (!pair[1] || !Array.isArray(pair[1])) {
        var message = pair[1] && pair[1].message ? pair[1].message : "GitHub did not return repositories.";
        throw new Error(message);
      }
      var repos = pair[1].slice().sort(function (a, b) {
        return new Date(b.pushed_at) - new Date(a.pushed_at);
      });
      cached = { user: pair[0], repos: repos, readAt: new Date() };
      return cached;
    }).catch(function (err) {
      pending = null;
      throw err;
    });
    return pending;
  }

  function loadRepo(name) {
    return fetchJson("https://api.github.com/repos/" + USER + "/" + encodeURIComponent(name));
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
    blurb: blurb,
    loadProfile: loadProfile,
    loadRepo: loadRepo,
    relativeTime: relativeTime,
    formatDate: formatDate,
    safeHttp: safeHttp
  };
})();
