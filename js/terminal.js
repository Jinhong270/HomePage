(function () {
  var JH_screen = document.getElementById("screen");
  var JH_stage = document.getElementById("stage");
  var JH_stageTitle = document.getElementById("stage-title");
  var JH_frame = document.getElementById("stage-frame");
  var JH_menu = document.getElementById("menu");
  var JH_form = document.getElementById("composer");
  var JH_input = document.getElementById("cmd");
  var JH_queueLabel = document.getElementById("queue-count");
  var JH_themeLabel = document.getElementById("term-theme");
  var JH_registry = window.JH270Commands;
  if (!JH_screen || !JH_input || !JH_form || !JH_registry) return;

  var JH_startedAt = Date.now();
  var JH_epoch = 0;
  var JH_canceled = false;
  var JH_skip = false;
  var JH_stopMode = "";
  var JH_booting = true;
  var JH_pumping = false;
  var JH_queue = [];
  var JH_commandHistory = [];
  var JH_historyIndex = 0;
  var JH_suggestions = [];
  var JH_selected = 0;
  var JH_pinned = true;

  function JH_paintThemeStatus() {
    if (!JH_themeLabel || !window.JH270Theme) return;
    JH_themeLabel.textContent = "theme " + window.JH270Theme.theme;
  }

  function JH_updateQueue() {
    if (!JH_queueLabel) return;
    JH_queueLabel.textContent = JH_queue.length ? JH_queue.length + " waiting" : "";
  }

  function JH_stick(JH_force) {
    if (!JH_screen || JH_screen.hidden) return;
    if (JH_force || JH_pinned) JH_screen.scrollTop = JH_screen.scrollHeight;
  }

  JH_screen.addEventListener("scroll", function () {
    var JH_gap = JH_screen.scrollHeight - JH_screen.scrollTop - JH_screen.clientHeight;
    JH_pinned = JH_gap < 48;
  });

  function JH_typeInto(JH_node, JH_text, JH_token) {
    JH_node.classList.add("typing");
    var JH_reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    function JH_finish() {
      JH_node.classList.remove("typing");
      JH_stick();
    }
    if (!JH_text || JH_reduce || JH_skip || JH_canceled) {
      if (JH_token === JH_epoch && JH_text) JH_node.textContent += JH_text;
      JH_finish();
      return Promise.resolve();
    }
    return new Promise(function (JH_resolve) {
      var JH_i = 0;
      var JH_step = function () {
        if (JH_token !== JH_epoch) {
          JH_finish();
          JH_resolve();
          return;
        }
        if (JH_skip || JH_canceled) {
          JH_node.textContent += JH_text.slice(JH_i);
          JH_finish();
          JH_resolve();
          return;
        }
        var JH_ch = JH_text.charAt(JH_i);
        JH_node.textContent += JH_ch;
        JH_i += 1;
        JH_stick();
        if (JH_i >= JH_text.length) {
          JH_finish();
          JH_resolve();
          return;
        }
        window.setTimeout(JH_step, JH_ch === "\n" ? 18 : 8);
      };
      JH_step();
    });
  }

  function JH_printLine(JH_text, JH_tone, JH_force) {
    if (JH_canceled && !JH_force) return Promise.resolve();
    var JH_token = JH_epoch;
    var JH_node = document.createElement("p");
    JH_node.className = "line" + (JH_tone ? " line-" + JH_tone : "");
    if (!JH_text) {
      JH_node.classList.add("line-gap");
      JH_screen.appendChild(JH_node);
      return Promise.resolve();
    }
    JH_screen.appendChild(JH_node);
    return JH_typeInto(JH_node, JH_text, JH_token);
  }

  function JH_printPre(JH_text) {
    if (JH_canceled) return Promise.resolve();
    var JH_token = JH_epoch;
    var JH_node = document.createElement("pre");
    JH_node.className = "pre";
    JH_screen.appendChild(JH_node);
    return JH_typeInto(JH_node, JH_text, JH_token);
  }

  function JH_linkLine(JH_href, JH_label) {
    if (JH_canceled) return;
    var JH_safe = window.JH270GitHub ? window.JH270GitHub.safeHttp(JH_href) : "";
    var JH_node = document.createElement("p");
    JH_node.className = "line";
    if (!JH_safe) {
      JH_node.textContent = JH_label || JH_href;
    } else {
      var JH_anchor = document.createElement("a");
      JH_anchor.href = JH_safe;
      JH_anchor.target = "_blank";
      JH_anchor.rel = "noopener noreferrer";
      JH_anchor.textContent = JH_label || JH_safe;
      JH_node.appendChild(JH_anchor);
    }
    JH_screen.appendChild(JH_node);
    JH_stick();
  }

  function JH_choiceList(JH_items) {
    if (JH_canceled) return;
    var JH_wrap = document.createElement("div");
    JH_wrap.className = "choices";
    JH_items.forEach(function (JH_item) {
      var JH_button = document.createElement("button");
      JH_button.type = "button";
      JH_button.className = "choice";
      JH_button.setAttribute("data-run", JH_item.run);
      var JH_title = document.createElement("strong");
      JH_title.textContent = JH_item.title;
      JH_button.appendChild(JH_title);
      if (JH_item.detail) {
        var JH_detail = document.createElement("small");
        JH_detail.textContent = JH_item.detail;
        JH_button.appendChild(JH_detail);
      }
      JH_wrap.appendChild(JH_button);
    });
    JH_screen.appendChild(JH_wrap);
    JH_stick(true);
  }

  function JH_closeStage(JH_silent) {
    if (!JH_stage || JH_stage.hidden) return;
    var JH_title = JH_stageTitle ? JH_stageTitle.textContent : "game";
    JH_stage.hidden = true;
    JH_screen.hidden = false;
    if (JH_frame) JH_frame.src = "about:blank";
    if (!JH_silent) {
      var JH_node = document.createElement("p");
      JH_node.className = "line line-dim";
      JH_node.textContent = "Closed " + JH_title + ".";
      JH_screen.appendChild(JH_node);
      JH_stick(true);
    }
    JH_input.focus();
  }

  function JH_launch(JH_id) {
    if (JH_canceled || !JH_stage || !JH_frame) return;
    var JH_game = JH_registry.games[JH_id];
    if (!JH_game) return;
    JH_screen.hidden = true;
    JH_stage.hidden = false;
    if (JH_stageTitle) JH_stageTitle.textContent = JH_game.title;
    JH_frame.title = JH_game.title;
    JH_frame.src = JH_game.url;
    window.setTimeout(function () {
      try {
        if (JH_frame.contentWindow) JH_frame.contentWindow.focus();
        else JH_frame.focus();
      } catch (JH_err) {
        JH_frame.focus();
      }
    }, 250);
  }

  function JH_clearScreen() {
    JH_epoch += 1;
    JH_screen.replaceChildren();
  }

  function JH_halt(JH_mode) {
    JH_canceled = true;
    JH_skip = true;
    JH_stopMode = JH_mode;
    if (JH_mode === "clear") {
      JH_closeStage(true);
      JH_clearScreen();
    }
  }

  var JH_ctx = {
    startedAt: JH_startedAt,
    github: window.JH270GitHub || null,
    rest: "",
    stopped: function () { return JH_canceled; },
    printLine: JH_printLine,
    printPre: JH_printPre,
    link: JH_linkLine,
    choices: JH_choiceList,
    launch: JH_launch,
    clear: JH_clearScreen,
    history: function () { return JH_commandHistory.slice(); }
  };

  function JH_parse(JH_raw) {
    var JH_text = String(JH_raw || "").trim();
    var JH_parts = JH_text.split(/\s+/);
    var JH_head = JH_parts[0] || "";
    var JH_slash = JH_head.charAt(0) === "/";
    return {
      raw: JH_text,
      slash: JH_slash,
      name: (JH_slash ? JH_head.slice(1) : JH_head).toLowerCase(),
      args: JH_parts.slice(1),
      rest: JH_text.slice(JH_head.length).trim()
    };
  }

  function JH_echo(JH_raw) {
    var JH_node = document.createElement("p");
    JH_node.className = "line line-cmd";
    var JH_prompt = document.createElement("span");
    JH_prompt.className = "prompt-echo";
    JH_prompt.textContent = "guest@jh270.com:~$ ";
    JH_node.appendChild(JH_prompt);
    JH_node.appendChild(document.createTextNode(JH_raw));
    JH_screen.appendChild(JH_node);
    JH_stick(true);
  }

  async function JH_dispatch(JH_raw) {
    var JH_parsed = JH_parse(JH_raw);
    if (!JH_parsed.name) return;
    var JH_cmd = JH_registry.find(JH_parsed.name);
    if (!JH_parsed.slash) {
      if (!JH_registry.isBare(JH_parsed.name)) {
        await JH_printLine("jhsh: " + JH_parsed.raw + ": this shell only prints replies. Try /help.", "warn");
        return;
      }
    } else if (!JH_cmd) {
      await JH_printLine("/" + JH_parsed.name + ": unknown command. Type /help.", "warn");
      return;
    }
    JH_ctx.rest = JH_parsed.rest;
    await JH_cmd.run(JH_parsed.args, JH_ctx);
  }

  async function JH_execute(JH_raw) {
    JH_canceled = false;
    JH_skip = false;
    JH_stopMode = "";
    if (JH_stage && !JH_stage.hidden) JH_closeStage(true);
    JH_echo(JH_raw);
    try {
      await JH_dispatch(JH_raw);
    } catch (JH_err) {
      await JH_printLine((JH_err && JH_err.message) || "The command stopped.", "warn");
    }
    if (JH_canceled && JH_stopMode === "ctrlc") await JH_printLine("^C", "warn", true);
    JH_canceled = false;
    JH_skip = false;
    JH_stopMode = "";
    JH_stick(true);
  }

  async function JH_pump() {
    if (JH_pumping) return;
    JH_pumping = true;
    while (JH_queue.length && !JH_booting) {
      var JH_next = JH_queue.shift();
      JH_updateQueue();
      await JH_execute(JH_next);
    }
    JH_pumping = false;
    JH_updateQueue();
  }

  function JH_submit(JH_raw) {
    var JH_trimmed = String(JH_raw || "").trim();
    if (!JH_trimmed) return;
    JH_queue.push(JH_trimmed);
    JH_updateQueue();
    if (!JH_booting) JH_pump();
  }

  function JH_hideMenu() {
    if (!JH_menu) return;
    JH_menu.hidden = true;
    JH_menu.replaceChildren();
    JH_input.setAttribute("aria-expanded", "false");
  }

  function JH_optionList(JH_value) {
    if (!JH_value) return [];
    var JH_slash = JH_value.charAt(0) === "/";
    if (!JH_slash && !/^[A-Za-z?]/.test(JH_value)) return [];
    var JH_body = JH_slash ? JH_value.slice(1) : JH_value;
    var JH_parts = JH_body.split(/\s+/);
    var JH_list = JH_registry.list;
    if (JH_parts.length <= 1 && !/\s$/.test(JH_value)) {
      var JH_q = (JH_parts[0] || "").toLowerCase();
      return JH_list.filter(function (JH_cmd) {
        if (!JH_slash && !JH_cmd.bare) return false;
        return !JH_q || JH_cmd.name.indexOf(JH_q) !== -1;
      }).sort(function (JH_a, JH_b) {
        var JH_as = !JH_q || JH_a.name.indexOf(JH_q) === 0 ? 0 : 1;
        var JH_bs = !JH_q || JH_b.name.indexOf(JH_q) === 0 ? 0 : 1;
        return JH_as - JH_bs;
      }).map(function (JH_cmd) {
        var JH_shown = (JH_slash ? "/" : "") + JH_cmd.name;
        return { insert: JH_shown, title: JH_shown, detail: JH_cmd.summary };
      });
    }
    var JH_name = (JH_parts[0] || "").toLowerCase();
    if (!JH_slash && !JH_registry.isBare(JH_name)) return [];
    var JH_partial = (JH_parts[JH_parts.length - 1] || "").toLowerCase();
    if (/\s$/.test(JH_value)) JH_partial = "";
    var JH_options = [];
    if (JH_name === "theme") {
      JH_options = [
        ["light", "warm paper"],
        ["dark", "phosphor lab"],
        ["next", "the other one"]
      ];
    } else if (JH_name === "game") {
      JH_options = [
        ["2048", JH_registry.games["2048"].about],
        ["snake", JH_registry.games.snake.about],
        ["tetris", JH_registry.games.tetris.about]
      ];
    } else if (JH_name === "cat") {
      JH_options = Object.keys(JH_registry.files).map(function (JH_file) { return [JH_file, "guest file"]; });
    } else if (JH_name === "man") {
      JH_options = JH_list.map(function (JH_cmd) { return [JH_cmd.name, JH_cmd.summary]; });
    } else if (JH_name === "open") {
      JH_options = ["github", "x", "hf", "toolbox", "snake", "2048", "tetris", "home"].map(function (JH_place) {
        return [JH_place, "known link"];
      });
    } else if (JH_name === "repo" && window.JH270GitHub && window.JH270GitHub.peek()) {
      JH_options = window.JH270GitHub.peek().repos.map(function (JH_repo) {
        return [JH_repo.name, JH_repo.language || "repository"];
      });
    }
    var JH_head = (JH_slash ? "/" : "") + (JH_registry.find(JH_name) ? JH_registry.find(JH_name).name : JH_parts[0]);
    return JH_options.filter(function (JH_item) {
      return !JH_partial || JH_item[0].toLowerCase().indexOf(JH_partial) === 0;
    }).map(function (JH_item) {
      return { insert: JH_head + " " + JH_item[0], title: JH_item[0], detail: JH_item[1] };
    });
  }

  function JH_paintMenu() {
    if (!JH_menu) return;
    JH_menu.replaceChildren();
    if (!JH_suggestions.length || document.activeElement !== JH_input) {
      JH_menu.hidden = true;
      JH_input.setAttribute("aria-expanded", "false");
      return;
    }
    if (JH_selected >= JH_suggestions.length) JH_selected = 0;
    JH_menu.hidden = false;
    JH_input.setAttribute("aria-expanded", "true");
    JH_suggestions.forEach(function (JH_item, JH_index) {
      var JH_button = document.createElement("button");
      JH_button.type = "button";
      JH_button.setAttribute("role", "option");
      JH_button.setAttribute("aria-selected", JH_index === JH_selected ? "true" : "false");
      var JH_title = document.createElement("span");
      JH_title.textContent = JH_item.title;
      var JH_detail = document.createElement("span");
      JH_detail.textContent = JH_item.detail || "";
      JH_button.appendChild(JH_title);
      JH_button.appendChild(JH_detail);
      JH_button.addEventListener("mousedown", function (JH_event) {
        JH_event.preventDefault();
        JH_accept(JH_item.insert);
      });
      JH_menu.appendChild(JH_button);
    });
    var JH_current = JH_menu.querySelector('[aria-selected="true"]');
    if (JH_current && JH_current.scrollIntoView) JH_current.scrollIntoView({ block: "nearest" });
  }

  function JH_refreshMenu() {
    JH_suggestions = JH_optionList(JH_input.value);
    JH_selected = 0;
    JH_paintMenu();
  }

  function JH_valueToRun(JH_typed) {
    if (!JH_suggestions.length || JH_menu.hidden) return JH_typed;
    var JH_chosen = JH_suggestions[JH_selected] || JH_suggestions[0];
    if (JH_typed.indexOf(" ") === -1) return JH_chosen.insert;
    if (JH_chosen.insert.indexOf(JH_typed) === 0) return JH_chosen.insert;
    return JH_typed;
  }

  function JH_accept(JH_value) {
    var JH_trimmed = String(JH_value || "").trim();
    JH_input.value = "";
    JH_historyIndex = JH_commandHistory.length;
    JH_hideMenu();
    if (!JH_trimmed) return;
    JH_commandHistory.push(JH_trimmed);
    JH_historyIndex = JH_commandHistory.length;
    JH_submit(JH_trimmed);
  }

  function JH_historyNav(JH_direction) {
    if (!JH_commandHistory.length) return;
    if (JH_direction < 0) JH_historyIndex = Math.max(0, JH_historyIndex - 1);
    else JH_historyIndex = Math.min(JH_commandHistory.length, JH_historyIndex + 1);
    JH_input.value = JH_historyIndex === JH_commandHistory.length ? "" : JH_commandHistory[JH_historyIndex];
    JH_suggestions = [];
    JH_hideMenu();
  }

  JH_form.addEventListener("submit", function (JH_event) {
    JH_event.preventDefault();
    JH_accept(JH_valueToRun(JH_input.value));
  });

  JH_input.addEventListener("input", function () {
    JH_historyIndex = JH_commandHistory.length;
    JH_refreshMenu();
  });

  JH_input.addEventListener("keydown", function (JH_event) {
    var JH_menuOpen = JH_menu && !JH_menu.hidden && JH_suggestions.length;
    if (JH_event.key === "ArrowDown" && JH_menuOpen) {
      JH_event.preventDefault();
      JH_selected = (JH_selected + 1) % JH_suggestions.length;
      JH_paintMenu();
      return;
    }
    if (JH_event.key === "ArrowUp" && JH_menuOpen) {
      JH_event.preventDefault();
      JH_selected = (JH_selected - 1 + JH_suggestions.length) % JH_suggestions.length;
      JH_paintMenu();
      return;
    }
    if (JH_event.key === "ArrowUp" && !JH_menuOpen) {
      JH_event.preventDefault();
      JH_historyNav(-1);
      return;
    }
    if (JH_event.key === "ArrowDown" && !JH_menuOpen) {
      JH_event.preventDefault();
      JH_historyNav(1);
      return;
    }
    if (JH_event.key === "Tab" && JH_menuOpen) {
      JH_event.preventDefault();
      var JH_insert = JH_suggestions[JH_selected].insert;
      var JH_token = JH_insert.split(" ")[0].replace(/^\//, "");
      if (JH_insert.indexOf(" ") === -1 && ["theme", "game", "cat", "man", "open", "repo"].indexOf(JH_token) !== -1) JH_insert += " ";
      JH_input.value = JH_insert;
      JH_refreshMenu();
      return;
    }
    if (JH_event.key === "Escape" && JH_menuOpen) {
      JH_event.preventDefault();
      JH_event.stopPropagation();
      JH_hideMenu();
    }
  });

  JH_input.addEventListener("blur", function () {
    window.setTimeout(function () {
      if (document.activeElement !== JH_input) JH_hideMenu();
    }, 150);
  });

  document.addEventListener("keydown", function (JH_event) {
    var JH_key = JH_event.key.toLowerCase();
    if (JH_event.key === "Escape") {
      if (JH_menu && !JH_menu.hidden) return;
      if (JH_stage && !JH_stage.hidden) {
        JH_event.preventDefault();
        JH_closeStage(false);
        return;
      }
      JH_skip = true;
      return;
    }
    if (!JH_event.ctrlKey && !JH_event.metaKey) return;
    if (JH_key === "l") {
      JH_event.preventDefault();
      JH_halt("clear");
      return;
    }
    if (JH_key !== "c") return;
    var JH_selection = window.getSelection ? String(window.getSelection()) : "";
    if (JH_selection) return;
    if (document.activeElement === JH_input && JH_input.selectionStart !== JH_input.selectionEnd) return;
    if (JH_pumping || JH_booting) {
      JH_event.preventDefault();
      JH_halt("ctrlc");
      return;
    }
    if (document.activeElement === JH_input && JH_input.value) {
      JH_event.preventDefault();
      var JH_typed = JH_input.value;
      JH_input.value = "";
      JH_hideMenu();
      var JH_node = document.createElement("p");
      JH_node.className = "line line-warn";
      JH_node.textContent = "^C " + JH_typed;
      JH_screen.appendChild(JH_node);
      JH_stick(true);
    }
  });

  JH_screen.addEventListener("click", function (JH_event) {
    var JH_button = JH_event.target.closest("[data-run]");
    if (JH_button) {
      JH_accept(JH_button.getAttribute("data-run"));
      return;
    }
    if (JH_event.target.closest("a, button")) return;
    var JH_selection = window.getSelection ? String(window.getSelection()) : "";
    if (!JH_selection) JH_input.focus();
  });

  var JH_closeButton = document.getElementById("stage-close");
  var JH_fullButton = document.getElementById("stage-full");
  if (JH_closeButton) JH_closeButton.addEventListener("click", function () { JH_closeStage(false); });
  if (JH_fullButton) {
    JH_fullButton.addEventListener("click", function () {
      var JH_request = JH_stage.requestFullscreen || JH_stage.webkitRequestFullscreen;
      if (!JH_request) {
        JH_fullButton.textContent = "Unavailable";
        return;
      }
      JH_request.call(JH_stage);
    });
  }
  if (JH_frame) {
    JH_frame.addEventListener("load", function () {
      if (JH_stage.hidden || !JH_frame.getAttribute("src") || JH_frame.src.indexOf("about:blank") !== -1) return;
      try { JH_frame.focus(); } catch (JH_err) {}
    });
  }

  window.addEventListener("jh270-theme", JH_paintThemeStatus);
  JH_paintThemeStatus();

  var JH_welcome = [
    "JH270 TERMINAL",
    "English (United States)",
    "",
    "You are guest@jh270.com.",
    "This shell prints answers. It does not run programs on a machine.",
    "Linux names such as ls and cat also run without a slash.",
    "",
    "  /help      command list",
    "  /about     who Jinhong270 is",
    "  /repos     public GitHub repositories",
    "  /game      2048, Snake, Tetris",
    "  /theme     light or dark",
    ""
  ];

  function JH_allowedRun(JH_value) {
    return /^\/?[A-Za-z0-9?]+( [A-Za-z0-9._@:/ -]+)?$/.test(JH_value) && JH_value.length <= 160;
  }

  async function JH_boot() {
    var JH_params = new URLSearchParams(window.location.search);
    var JH_requested = (JH_params.get("run") || "").trim();
    var JH_autorun = JH_allowedRun(JH_requested) ? JH_requested : "";
    var JH_instant = Boolean(JH_autorun) || window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (JH_instant) JH_skip = true;
    for (var JH_i = 0; JH_i < JH_welcome.length; JH_i++) {
      if (JH_canceled) break;
      await JH_printLine(JH_welcome[JH_i], JH_i === 0 ? "accent" : "");
    }
    if (JH_canceled && JH_stopMode === "ctrlc") await JH_printLine("^C", "warn", true);
    var JH_runAfter = JH_canceled ? "" : JH_autorun;
    JH_canceled = false;
    JH_skip = false;
    JH_stopMode = "";
    JH_booting = false;
    if (JH_requested && !JH_autorun) await JH_printLine("Ignored the linked command.", "dim");
    if (JH_runAfter) JH_queue.unshift(JH_runAfter);
    JH_updateQueue();
    JH_pump();
    if (!JH_stage || JH_stage.hidden) JH_input.focus();
  }

  JH_boot();
})();
