(function () {
  var KEY = "jh270-theme";
  var root = document.documentElement;
  var animTimer = 0;
  var flipTimer = 0;
  var flipEnd = 0;

  function systemTheme() {
    return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  }

  function savedChoice() {
    try {
      var saved = localStorage.getItem(KEY);
      if (saved === "light" || saved === "dark") return saved;
      if (saved) localStorage.removeItem(KEY);
    } catch (err) {}
    return "";
  }

  function writeChoice(next) {
    try {
      localStorage.setItem(KEY, next);
    } catch (err) {}
  }

  function labelFor(theme) {
    return theme === "dark" ? "NIGHT" : "DAY";
  }

  function nameFor(theme) {
    if (theme === "dark") return "Theme is dark. Activate to switch to light.";
    return "Theme is light. Activate to switch to dark.";
  }

  function labels() {
    return document.querySelectorAll("[data-theme-label]");
  }

  function setLabels(text) {
    var nodes = labels();
    for (var i = 0; i < nodes.length; i++) nodes[i].textContent = text;
  }

  function flipLabels(text) {
    var nodes = labels();
    var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce) {
      setLabels(text);
      return;
    }
    for (var i = 0; i < nodes.length; i++) {
      if (nodes[i].textContent === text) continue;
      nodes[i].classList.remove("theme-flip");
      void nodes[i].offsetWidth;
      nodes[i].classList.add("theme-flip");
    }
    window.clearTimeout(flipTimer);
    window.clearTimeout(flipEnd);
    flipTimer = window.setTimeout(function () {
      setLabels(text);
    }, 170);
    flipEnd = window.setTimeout(function () {
      var done = labels();
      for (var j = 0; j < done.length; j++) done[j].classList.remove("theme-flip");
    }, 480);
  }

  function armThemeAnim() {
    var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce) return;
    root.classList.remove("theme-anim");
    void root.offsetWidth;
    root.classList.add("theme-anim");
    void root.offsetWidth;
    window.clearTimeout(animTimer);
    animTimer = window.setTimeout(function () {
      root.classList.remove("theme-anim");
    }, 560);
  }

  function paintChrome(resolved, choice, fromUser) {
    if (fromUser && root.dataset.theme !== resolved) armThemeAnim();
    root.dataset.theme = resolved;
    root.dataset.themeChoice = choice;
    var meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute("content", resolved === "light" ? "#f4efe4" : "#080a07");
    var buttons = document.querySelectorAll("[data-theme-toggle]");
    var name = nameFor(resolved);
    for (var i = 0; i < buttons.length; i++) {
      buttons[i].setAttribute("aria-label", name);
      buttons[i].title = name;
    }
    if (fromUser) flipLabels(labelFor(resolved));
    else setLabels(labelFor(resolved));
    window.dispatchEvent(new CustomEvent("jh270-theme", { detail: { choice: choice, theme: resolved } }));
  }

  function apply(theme, fromUser) {
    var locked = savedChoice();
    var resolved;
    if (fromUser) {
      resolved = theme === "dark" ? "dark" : "light";
      writeChoice(resolved);
      locked = resolved;
    } else if (locked) {
      resolved = locked;
    } else {
      resolved = theme === "dark" ? "dark" : "light";
    }
    paintChrome(resolved, locked || "system", fromUser);
  }

  function cycle() {
    var current = root.dataset.theme === "dark" ? "dark" : "light";
    apply(current === "dark" ? "light" : "dark", true);
  }

  apply(savedChoice() || systemTheme(), false);

  window.matchMedia("(prefers-color-scheme: dark)").addEventListener("change", function () {
    if (!savedChoice()) apply(systemTheme(), false);
  });

  document.addEventListener("click", function (event) {
    var button = event.target.closest("[data-theme-toggle]");
    if (!button) return;
    cycle();
  });

  window.JH270Theme = {
    get choice() {
      return savedChoice() || "system";
    },
    get theme() {
      return root.dataset.theme === "dark" ? "dark" : "light";
    },
    set: function (next) {
      if (next !== "light" && next !== "dark") return;
      apply(next, true);
    },
    cycle: cycle
  };
})();
