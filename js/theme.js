(function () {
  var root = document.documentElement;
  var system = window.matchMedia("(prefers-color-scheme: dark)");
  var motion = window.matchMedia("(prefers-reduced-motion: reduce)");
  var buttons = document.querySelectorAll("[data-theme-toggle]");
  var timer;

  function paint(choice, animate) {
    var theme = choice === "system" ? (system.matches ? "dark" : "light") : choice;
    if (animate && !motion.matches && theme !== root.dataset.theme) {
      root.classList.add("theme-anim");
      window.clearTimeout(timer);
      timer = window.setTimeout(function () { root.classList.remove("theme-anim"); }, 500);
    }
    root.dataset.theme = theme;
    root.dataset.themeChoice = choice;
    var dark = theme === "dark";
    var label = "Theme is " + theme + ". Activate to switch to " + (dark ? "light." : "dark.");
    buttons.forEach(function (button) {
      button.setAttribute("aria-label", label);
      button.title = label;
      var face = button.querySelector("[data-theme-label]");
      if (face) face.textContent = dark ? "NIGHT" : "DAY";
    });
    var meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.content = dark ? "#080a07" : "#f4efe4";
    window.dispatchEvent(new CustomEvent("jh270-theme", { detail: { choice: choice, theme: theme } }));
  }

  function set(theme) {
    if (theme !== "light" && theme !== "dark") return;
    try { localStorage.setItem("jh270-theme", theme); } catch (err) {}
    paint(theme, true);
  }

  function cycle() {
    set(root.dataset.theme === "dark" ? "light" : "dark");
  }

  buttons.forEach(function (button) { button.addEventListener("click", cycle); });
  system.addEventListener("change", function () {
    if (root.dataset.themeChoice === "system") paint("system", false);
  });
  window.addEventListener("storage", function (event) {
    if (event.key !== "jh270-theme" && event.key !== null) return;
    var value = event.newValue;
    paint(value === "light" || value === "dark" ? value : "system", false);
  });

  window.JH270Theme = {
    get choice() { return root.dataset.themeChoice; },
    get theme() { return root.dataset.theme; },
    set: set,
    cycle: cycle
  };
  paint(root.dataset.themeChoice || "system", false);
})();
