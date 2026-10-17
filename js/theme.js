(function () {
  var JH_KEY = "jh270-theme";
  var JH_root = document.documentElement;
  var JH_animTimer = 0;
  var JH_flipTimer = 0;
  var JH_flipEnd = 0;
  var JH_order = ["system", "light", "dark"];

  function JH_systemTheme() {
    return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  }

  function JH_savedChoice() {
    try {
      var JH_saved = localStorage.getItem(JH_KEY);
      if (JH_saved === "light" || JH_saved === "dark" || JH_saved === "system") return JH_saved;
      if (JH_saved) localStorage.removeItem(JH_KEY);
    } catch (JH_err) {}
    return "";
  }

  function JH_writeChoice(JH_next) {
    try {
      localStorage.setItem(JH_KEY, JH_next);
    } catch (JH_err) {}
  }

  function JH_labelFor(JH_choice) {
    if (JH_choice === "dark") return "NIGHT";
    if (JH_choice === "light") return "DAY";
    return "SYS";
  }

  function JH_nameFor(JH_choice) {
    if (JH_choice === "dark") return "Theme is dark. Activate to switch.";
    if (JH_choice === "light") return "Theme is light. Activate to switch.";
    return "Theme follows the system. Activate to switch.";
  }

  function JH_labels() {
    return document.querySelectorAll("[data-theme-label]");
  }

  function JH_setLabels(JH_text) {
    var JH_nodes = JH_labels();
    for (var JH_i = 0; JH_i < JH_nodes.length; JH_i++) JH_nodes[JH_i].textContent = JH_text;
  }

  function JH_flipLabels(JH_text) {
    var JH_nodes = JH_labels();
    var JH_reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (JH_reduce) {
      JH_setLabels(JH_text);
      return;
    }
    for (var JH_i = 0; JH_i < JH_nodes.length; JH_i++) {
      if (JH_nodes[JH_i].textContent === JH_text) continue;
      JH_nodes[JH_i].classList.remove("theme-flip");
      void JH_nodes[JH_i].offsetWidth;
      JH_nodes[JH_i].classList.add("theme-flip");
    }
    window.clearTimeout(JH_flipTimer);
    window.clearTimeout(JH_flipEnd);
    JH_flipTimer = window.setTimeout(function () {
      JH_setLabels(JH_text);
    }, 170);
    JH_flipEnd = window.setTimeout(function () {
      var JH_done = JH_labels();
      for (var JH_j = 0; JH_j < JH_done.length; JH_j++) JH_done[JH_j].classList.remove("theme-flip");
    }, 480);
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

  function JH_apply(JH_choice, JH_fromUser) {
    var JH_mode = JH_choice === "light" || JH_choice === "dark" ? JH_choice : "system";
    var JH_resolved = JH_mode === "system" ? JH_systemTheme() : JH_mode;
    JH_writeChoice(JH_mode);
    if (JH_root.dataset.theme !== JH_resolved) JH_armThemeAnim();
    JH_root.dataset.theme = JH_resolved;
    JH_root.dataset.themeChoice = JH_mode;
    var JH_meta = document.querySelector('meta[name="theme-color"]');
    if (JH_meta) JH_meta.setAttribute("content", JH_resolved === "light" ? "#f4efe4" : "#080a07");
    var JH_buttons = document.querySelectorAll("[data-theme-toggle]");
    for (var JH_i = 0; JH_i < JH_buttons.length; JH_i++) {
      JH_buttons[JH_i].setAttribute("aria-label", JH_nameFor(JH_mode));
      JH_buttons[JH_i].title = JH_nameFor(JH_mode);
    }
    if (JH_fromUser) JH_flipLabels(JH_labelFor(JH_mode));
    else JH_setLabels(JH_labelFor(JH_mode));
    window.dispatchEvent(new CustomEvent("jh270-theme", { detail: { choice: JH_mode, theme: JH_resolved } }));
  }

  function JH_cycle() {
    var JH_current = JH_savedChoice() || "system";
    var JH_index = JH_order.indexOf(JH_current);
    if (JH_index < 0) JH_index = 0;
    JH_apply(JH_order[(JH_index + 1) % JH_order.length], true);
  }

  JH_apply(JH_savedChoice() || "system", false);

  window.matchMedia("(prefers-color-scheme: dark)").addEventListener("change", function () {
    if ((JH_savedChoice() || "system") === "system") JH_apply("system", false);
  });

  document.addEventListener("click", function (JH_event) {
    var JH_button = JH_event.target.closest("[data-theme-toggle]");
    if (!JH_button) return;
    JH_cycle();
  });

  window.JH270Theme = {
    get choice() {
      return JH_savedChoice() || "system";
    },
    get theme() {
      return JH_root.dataset.theme === "dark" ? "dark" : "light";
    },
    set: function (JH_next) { JH_apply(JH_next, true); },
    cycle: JH_cycle
  };
})();
