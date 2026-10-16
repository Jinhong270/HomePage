(function () {
  var KEY = "jh270-theme";
  var root = document.documentElement;

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

  function nameFor(theme) {
    if (theme === "dark") return "Theme is dark. Activate to switch to light.";
    return "Theme is light. Activate to switch to dark.";
  }

  function apply(theme, lock) {
    var mode = theme === "dark" ? "dark" : "light";
    if (lock) writeChoice(mode);
    root.dataset.theme = mode;
    root.dataset.themeChoice = mode;
    var meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute("content", mode === "light" ? "#f4efe4" : "#080a07");
    var buttons = document.querySelectorAll("[data-theme-toggle]");
    for (var i = 0; i < buttons.length; i++) {
      buttons[i].setAttribute("aria-label", nameFor(mode));
      buttons[i].title = nameFor(mode);
    }
    window.dispatchEvent(new CustomEvent("jh270-theme", { detail: { choice: mode, theme: mode } }));
  }

  function paint(next) {
    apply(next === "dark" ? "dark" : "light", true);
  }

  function cycle() {
    var current = savedChoice() || systemTheme();
    paint(current === "dark" ? "light" : "dark");
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
      return savedChoice() || systemTheme();
    },
    get theme() {
      return root.dataset.theme === "dark" ? "dark" : "light";
    },
    set: paint,
    cycle: cycle
  };
})();
