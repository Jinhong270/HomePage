(function () {
  var JH_USER = "Jinhong270";
  var JH_BLURBS = {
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
  var JH_cached = null;
  var JH_pending = null;

  function JH_safeHttp(JH_value) {
    try {
      var JH_url = new URL(JH_value);
      if (JH_url.protocol !== "https:") return "";
      return JH_url.href;
    } catch (JH_err) {
      return "";
    }
  }

  function JH_fetchJson(JH_url) {
    var JH_controller = new AbortController();
    var JH_timer = window.setTimeout(function () { JH_controller.abort(); }, 12000);
    return fetch(JH_url, {
      headers: { Accept: "application/vnd.github+json" },
      signal: JH_controller.signal
    }).then(function (JH_res) {
      return JH_res.json().catch(function () { return {}; }).then(function (JH_body) {
        if (!JH_res.ok) {
          var JH_reason = JH_body && JH_body.message ? JH_body.message : "GitHub answered " + JH_res.status;
          throw new Error(JH_reason);
        }
        return JH_body;
      });
    }).finally(function () {
      window.clearTimeout(JH_timer);
    });
  }

  function JH_peek() {
    return JH_cached;
  }

  function JH_loadProfile() {
    if (JH_cached) return Promise.resolve(JH_cached);
    if (JH_pending) return JH_pending;
    JH_pending = Promise.all([
      JH_fetchJson("https://api.github.com/users/" + JH_USER),
      JH_fetchJson("https://api.github.com/users/" + JH_USER + "/repos?per_page=100&sort=updated")
    ]).then(function (JH_pair) {
      if (!JH_pair[1] || !Array.isArray(JH_pair[1])) {
        var JH_message = JH_pair[1] && JH_pair[1].message ? JH_pair[1].message : "GitHub did not return repositories.";
        throw new Error(JH_message);
      }
      var JH_repos = JH_pair[1].slice().sort(function (JH_a, JH_b) {
        return new Date(JH_b.pushed_at) - new Date(JH_a.pushed_at);
      });
      JH_cached = { user: JH_pair[0], repos: JH_repos, readAt: new Date() };
      return JH_cached;
    }).catch(function (JH_err) {
      JH_pending = null;
      throw JH_err;
    });
    return JH_pending;
  }

  function JH_loadRepo(JH_name) {
    return JH_fetchJson("https://api.github.com/repos/" + JH_USER + "/" + encodeURIComponent(JH_name));
  }

  function JH_blurb(JH_repo) {
    if (JH_repo && JH_repo.description) return JH_repo.description;
    if (JH_repo && JH_BLURBS[JH_repo.name]) return JH_BLURBS[JH_repo.name];
    return "No description on GitHub yet.";
  }

  function JH_relativeTime(JH_iso) {
    var JH_then = new Date(JH_iso).getTime();
    if (!isFinite(JH_then)) return "";
    var JH_seconds = Math.round((JH_then - Date.now()) / 1000);
    var JH_format = new Intl.RelativeTimeFormat("en-US", { numeric: "auto" });
    var JH_abs = Math.abs(JH_seconds);
    if (JH_abs < 60) return JH_format.format(JH_seconds, "second");
    if (JH_abs < 3600) return JH_format.format(Math.round(JH_seconds / 60), "minute");
    if (JH_abs < 86400) return JH_format.format(Math.round(JH_seconds / 3600), "hour");
    if (JH_abs < 86400 * 45) return JH_format.format(Math.round(JH_seconds / 86400), "day");
    if (JH_abs < 86400 * 365) return JH_format.format(Math.round(JH_seconds / (86400 * 30)), "month");
    return JH_format.format(Math.round(JH_seconds / (86400 * 365)), "year");
  }

  function JH_formatDate(JH_iso) {
    var JH_date = new Date(JH_iso);
    if (!isFinite(JH_date.getTime())) return "";
    return JH_date.toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
  }

  window.JH270GitHub = {
    USER: JH_USER,
    blurb: JH_blurb,
    peek: JH_peek,
    loadProfile: JH_loadProfile,
    loadRepo: JH_loadRepo,
    relativeTime: JH_relativeTime,
    formatDate: JH_formatDate,
    safeHttp: JH_safeHttp
  };
})();
