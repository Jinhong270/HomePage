(function () {
  var KEY = "jh270-theme";
  var root = document.documentElement;
  var choice = "system";

  function systemTheme() {
    return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  }

  function readChoice() {
    try {
      var saved = localStorage.getItem(KEY);
      if (saved === "light" || saved === "dark" || saved === "system") return saved;
    } catch (err) {}
    return choice;
  }

  function writeChoice(next) {
    choice = next;
    try {
      localStorage.setItem(KEY, next);
    } catch (err) {}
  }

  function labelFor(next) {
    if (next === "light") return "DAY";
    if (next === "dark") return "NIGHT";
    return "SYS";
  }

  function nameFor(next) {
    if (next === "light") return "Theme is light. Activate to switch.";
    if (next === "dark") return "Theme is dark. Activate to switch.";
    return "Theme follows the system. Activate to switch.";
  }

  function paint(next) {
    var mode = next === "light" || next === "dark" ? next : "system";
    var resolved = mode === "system" ? systemTheme() : mode;
    writeChoice(mode);
    root.dataset.theme = resolved;
    root.dataset.themeChoice = mode;
    var meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute("content", resolved === "light" ? "#f4efe4" : "#080a07");
    var buttons = document.querySelectorAll("[data-theme-toggle]");
    for (var i = 0; i < buttons.length; i++) {
      var text = buttons[i].querySelector("[data-theme-label]");
      if (text) text.textContent = labelFor(mode);
      buttons[i].setAttribute("aria-label", nameFor(mode));
      buttons[i].title = nameFor(mode);
    }
    window.dispatchEvent(new CustomEvent("jh270-theme", { detail: { choice: mode, theme: resolved } }));
  }

  function cycle() {
    var order = ["system", "light", "dark"];
    var index = order.indexOf(readChoice());
    paint(order[(index + 1) % order.length]);
  }

  paint(readChoice());

  window.matchMedia("(prefers-color-scheme: dark)").addEventListener("change", function () {
    if (readChoice() === "system") paint("system");
  });

  document.addEventListener("click", function (event) {
    var button = event.target.closest("[data-theme-toggle]");
    if (!button) return;
    cycle();
  });

  window.JH270Theme = {
    get choice() {
      return readChoice();
    },
    get theme() {
      return root.dataset.theme || systemTheme();
    },
    set: paint,
    cycle: cycle
  };
})();
