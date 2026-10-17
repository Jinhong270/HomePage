(function () {
  var KEY = "jh270-theme";
  var root = document.documentElement;
  var animTimer = 0;
  var flipTimer = 0;
  var flipEnd = 0;
  var order = ["system", "light", "dark"];

  function systemTheme() {
    return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  }

  function savedChoice() {
    try {
      var saved = localStorage.getItem(KEY);
      if (saved === "light" || saved === "dark" || saved === "system") return saved;
      if (saved) localStorage.removeItem(KEY);
    } catch (err) {}
    return "";
  }

  function writeChoice(next) {
    try {
      localStorage.setItem(KEY, next);
    } catch (err) {}
  }

  function labelFor(choice) {
    if (choice === "dark") return "NIGHT";
    if (choice === "light") return "DAY";
    return "SYS";
  }

  function nameFor(choice) {
    if (choice === "dark") return "Theme is dark. Activate to switch.";
    if (choice === "light") return "Theme is light. Activate to switch.";
    return "Theme follows the system. Activate to switch.";
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

  function apply(choice, fromUser) {
    var mode = choice === "light" || choice === "dark" ? choice : "system";
    var resolved = mode === "system" ? systemTheme() : mode;
    writeChoice(mode);
    if (root.dataset.theme !== resolved) armThemeAnim();
    root.dataset.theme = resolved;
    root.dataset.themeChoice = mode;
    var meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute("content", resolved === "light" ? "#f4efe4" : "#080a07");
    var buttons = document.querySelectorAll("[data-theme-toggle]");
    for (var i = 0; i < buttons.length; i++) {
      buttons[i].setAttribute("aria-label", nameFor(mode));
      buttons[i].title = nameFor(mode);
    }
    if (fromUser) flipLabels(labelFor(mode));
    else setLabels(labelFor(mode));
    window.dispatchEvent(new CustomEvent("jh270-theme", { detail: { choice: mode, theme: resolved } }));
  }

  function cycle() {
    var current = savedChoice() || "system";
    var index = order.indexOf(current);
    if (index < 0) index = 0;
    apply(order[(index + 1) % order.length], true);
  }

  apply(savedChoice() || "system", false);

  window.matchMedia("(prefers-color-scheme: dark)").addEventListener("change", function () {
    if ((savedChoice() || "system") === "system") apply("system", false);
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
    set: function (next) { apply(next, true); },
    cycle: cycle
  };
})();
