(function () {
  var JH_KEY = "jh270-theme";
  var JH_root = document.documentElement;
  var JH_animTimer = 0;
  var JH_flipTimer = 0;
  var JH_flipEnd = 0;

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

  function JH_labelFor(JH_theme) {
    return JH_theme === "dark" ? "NIGHT" : "DAY";
  }

  function JH_nameFor(JH_theme) {
    if (JH_theme === "dark") return "Theme is dark. Activate to switch to light.";
    return "Theme is light. Activate to switch to dark.";
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

  function JH_paintChrome(JH_resolved, JH_choice, JH_fromUser) {
    if (JH_fromUser && JH_root.dataset.theme !== JH_resolved) JH_armThemeAnim();
    JH_root.dataset.theme = JH_resolved;
    JH_root.dataset.themeChoice = JH_choice;
    var JH_meta = document.querySelector('meta[name="theme-color"]');
    if (JH_meta) JH_meta.setAttribute("content", JH_resolved === "light" ? "#f4efe4" : "#080a07");
    var JH_buttons = document.querySelectorAll("[data-theme-toggle]");
    var JH_name = JH_nameFor(JH_resolved);
    for (var JH_i = 0; JH_i < JH_buttons.length; JH_i++) {
      JH_buttons[JH_i].setAttribute("aria-label", JH_name);
      JH_buttons[JH_i].title = JH_name;
    }
    if (JH_fromUser) JH_flipLabels(JH_labelFor(JH_resolved));
    else JH_setLabels(JH_labelFor(JH_resolved));
    window.dispatchEvent(new CustomEvent("jh270-theme", { detail: { choice: JH_choice, theme: JH_resolved } }));
  }

  function JH_apply(JH_theme, JH_fromUser) {
    var JH_locked = JH_savedChoice();
    var JH_resolved;
    if (JH_fromUser) {
      JH_resolved = JH_theme === "dark" ? "dark" : "light";
      JH_writeChoice(JH_resolved);
      JH_locked = JH_resolved;
    } else if (JH_locked) {
      JH_resolved = JH_locked;
    } else {
      JH_resolved = JH_theme === "dark" ? "dark" : "light";
    }
    JH_paintChrome(JH_resolved, JH_locked || "system", JH_fromUser);
  }

  function JH_cycle() {
    var JH_current = JH_root.dataset.theme === "dark" ? "dark" : "light";
    JH_apply(JH_current === "dark" ? "light" : "dark", true);
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
      return JH_savedChoice() || "system";
    },
    get theme() {
      return JH_root.dataset.theme === "dark" ? "dark" : "light";
    },
    set: function (JH_next) {
      if (JH_next !== "light" && JH_next !== "dark") return;
      JH_apply(JH_next, true);
    },
    cycle: JH_cycle
  };
})();
