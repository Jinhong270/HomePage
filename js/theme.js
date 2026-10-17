(function () {
  var JH_KEY = "jh270-theme";
  var JH_root = document.documentElement;
  var JH_animTimer = 0;

  function JH_systemTheme() {
    return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  }

  function JH_savedChoice() {
    try {
      var JH_saved = localStorage.getItem(JH_KEY);
      if (JH_saved === "light" || JH_saved === "dark") return JH_saved;
      if (JH_saved) localStorage.removeItem(JH_KEY);
    } catch (JH_err) {}
    return "";
  }

  function JH_writeChoice(JH_next) {
    try {
      localStorage.setItem(JH_KEY, JH_next);
    } catch (JH_err) {}
  }

  function JH_nameFor(JH_theme) {
    if (JH_theme === "dark") return "Theme is dark. Activate to switch to light.";
    return "Theme is light. Activate to switch to dark.";
  }

  function JH_armThemeAnim() {
    var JH_reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (JH_reduce) return;
    JH_root.classList.remove("theme-anim");
    void JH_root.offsetWidth;
    JH_root.classList.add("theme-anim");
    void JH_root.offsetWidth;
    window.clearTimeout(JH_animTimer);
    JH_animTimer = window.setTimeout(function () {
      JH_root.classList.remove("theme-anim");
    }, 560);
  }

  function JH_apply(JH_theme, JH_lock) {
    var JH_mode = JH_theme === "dark" ? "dark" : "light";
    if (JH_lock) JH_writeChoice(JH_mode);
    if (JH_lock && JH_root.dataset.theme !== JH_mode) JH_armThemeAnim();
    JH_root.dataset.theme = JH_mode;
    JH_root.dataset.themeChoice = JH_mode;
    var JH_meta = document.querySelector('meta[name="theme-color"]');
    if (JH_meta) JH_meta.setAttribute("content", JH_mode === "light" ? "#f4efe4" : "#080a07");
    var JH_buttons = document.querySelectorAll("[data-theme-toggle]");
    for (var JH_i = 0; JH_i < JH_buttons.length; JH_i++) {
      JH_buttons[JH_i].setAttribute("aria-label", JH_nameFor(JH_mode));
      JH_buttons[JH_i].title = JH_nameFor(JH_mode);
    }
    window.dispatchEvent(new CustomEvent("jh270-theme", { detail: { choice: JH_mode, theme: JH_mode } }));
  }

  function JH_paint(JH_next) {
    JH_apply(JH_next === "dark" ? "dark" : "light", true);
  }

  function JH_cycle() {
    var JH_current = JH_savedChoice() || JH_systemTheme();
    JH_paint(JH_current === "dark" ? "light" : "dark");
  }

  JH_apply(JH_savedChoice() || JH_systemTheme(), false);

  window.matchMedia("(prefers-color-scheme: dark)").addEventListener("change", function () {
    if (!JH_savedChoice()) JH_apply(JH_systemTheme(), false);
  });

  document.addEventListener("click", function (JH_event) {
    var JH_button = JH_event.target.closest("[data-theme-toggle]");
    if (!JH_button) return;
    JH_cycle();
  });

  window.JH270Theme = {
    get choice() {
      return JH_savedChoice() || JH_systemTheme();
    },
    get theme() {
      return JH_root.dataset.theme === "dark" ? "dark" : "light";
    },
    set: JH_paint,
    cycle: JH_cycle
  };
})();
