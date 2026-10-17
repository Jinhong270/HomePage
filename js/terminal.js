(function () {
  var screen = document.getElementById("screen");
  var stage = document.getElementById("stage");
  var stageTitle = document.getElementById("stage-title");
  var frame = document.getElementById("stage-frame");
  var menu = document.getElementById("menu");
  var form = document.getElementById("composer");
  var input = document.getElementById("cmd");
  var queueLabel = document.getElementById("queue-count");
  var themeLabel = document.getElementById("term-theme");
  var registry = window.JH270Commands;
  if (!screen || !input || !form || !registry) return;

  var startedAt = Date.now();
  var epoch = 0;
  var canceled = false;
  var skip = false;
  var stopMode = "";
  var booting = true;
  var pumping = false;
  var queue = [];
  var commandHistory = [];
  var historyIndex = 0;
  var suggestions = [];
  var selected = 0;
  var pinned = true;

  function paintThemeStatus() {
    if (!themeLabel || !window.JH270Theme) return;
    themeLabel.textContent = "theme " + window.JH270Theme.theme;
  }

  function updateQueue() {
    if (!queueLabel) return;
    queueLabel.textContent = queue.length ? queue.length + " waiting" : "";
  }

  function stick(force) {
    if (!screen || screen.hidden) return;
    if (force || pinned) screen.scrollTop = screen.scrollHeight;
  }

  screen.addEventListener("scroll", function () {
    var gap = screen.scrollHeight - screen.scrollTop - screen.clientHeight;
    pinned = gap < 48;
  });

  function typeInto(node, text, token) {
    node.classList.add("typing");
    var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    function finish() {
      node.classList.remove("typing");
      stick();
    }
    if (!text || reduce || skip || canceled) {
      if (token === epoch && text) node.textContent += text;
      finish();
      return Promise.resolve();
    }
    return new Promise(function (resolve) {
      var i = 0;
      var step = function () {
        if (token !== epoch) {
          finish();
          resolve();
          return;
        }
        if (skip || canceled) {
          node.textContent += text.slice(i);
          finish();
          resolve();
          return;
        }
        var ch = text.charAt(i);
        node.textContent += ch;
        i += 1;
        stick();
        if (i >= text.length) {
          finish();
          resolve();
          return;
        }
        window.setTimeout(step, ch === "\n" ? 18 : 8);
      };
      step();
    });
  }

  function printLine(text, tone, force) {
    if (canceled && !force) return Promise.resolve();
    var token = epoch;
    var node = document.createElement("p");
    node.className = "line" + (tone ? " line-" + tone : "");
    if (!text) {
      node.classList.add("line-gap");
      screen.appendChild(node);
      return Promise.resolve();
    }
    screen.appendChild(node);
    return typeInto(node, text, token);
  }

  function printPre(text) {
    if (canceled) return Promise.resolve();
    var token = epoch;
    var node = document.createElement("pre");
    node.className = "pre";
    screen.appendChild(node);
    return typeInto(node, text, token);
  }

  function linkLine(href, label) {
    if (canceled) return;
    var safe = window.JH270GitHub ? window.JH270GitHub.safeHttp(href) : "";
    var node = document.createElement("p");
    node.className = "line";
    if (!safe) {
      node.textContent = label || href;
    } else {
      var anchor = document.createElement("a");
      anchor.href = safe;
      anchor.target = "_blank";
      anchor.rel = "noopener noreferrer";
      anchor.textContent = label || safe;
      node.appendChild(anchor);
    }
    screen.appendChild(node);
    stick();
  }

  function choiceList(items) {
    if (canceled) return;
    var wrap = document.createElement("div");
    wrap.className = "choices";
    items.forEach(function (item) {
      var button = document.createElement("button");
      button.type = "button";
      button.className = "choice";
      button.setAttribute("data-run", item.run);
      var title = document.createElement("strong");
      title.textContent = item.title;
      button.appendChild(title);
      if (item.detail) {
        var detail = document.createElement("small");
        detail.textContent = item.detail;
        button.appendChild(detail);
      }
      wrap.appendChild(button);
    });
    screen.appendChild(wrap);
    stick(true);
  }

  function closeStage(silent) {
    if (!stage || stage.hidden) return;
    var title = stageTitle ? stageTitle.textContent : "game";
    stage.hidden = true;
    screen.hidden = false;
    if (frame) frame.src = "about:blank";
    if (!silent) {
      var node = document.createElement("p");
      node.className = "line line-dim";
      node.textContent = "Closed " + title + ".";
      screen.appendChild(node);
      stick(true);
    }
    input.focus();
  }

  function launch(id) {
    if (canceled || !stage || !frame) return;
    var game = registry.games[id];
    if (!game) return;
    screen.hidden = true;
    stage.hidden = false;
    if (stageTitle) stageTitle.textContent = game.title;
    frame.title = game.title;
    frame.src = game.url;
    window.setTimeout(function () {
      try {
        if (frame.contentWindow) frame.contentWindow.focus();
        else frame.focus();
      } catch (err) {
        frame.focus();
      }
    }, 250);
  }

  function clearScreen() {
    epoch += 1;
    screen.replaceChildren();
  }

  function halt(mode) {
    canceled = true;
    skip = true;
    stopMode = mode;
    if (mode === "clear") {
      closeStage(true);
      clearScreen();
    }
  }

  var ctx = {
    startedAt: startedAt,
    github: window.JH270GitHub || null,
    rest: "",
    stopped: function () { return canceled; },
    printLine: printLine,
    printPre: printPre,
    link: linkLine,
    choices: choiceList,
    launch: launch,
    clear: clearScreen,
    history: function () { return commandHistory.slice(); }
  };

  function parse(raw) {
    var text = String(raw || "").trim();
    var parts = text.split(/\s+/);
    var head = parts[0] || "";
    var slash = head.charAt(0) === "/";
    return {
      raw: text,
      slash: slash,
      name: (slash ? head.slice(1) : head).toLowerCase(),
      args: parts.slice(1),
      rest: text.slice(head.length).trim()
    };
  }

  function echo(raw) {
    var node = document.createElement("p");
    node.className = "line line-cmd";
    var prompt = document.createElement("span");
    prompt.className = "prompt-echo";
    prompt.textContent = "guest@jh270.com:~$ ";
    node.appendChild(prompt);
    node.appendChild(document.createTextNode(raw));
    screen.appendChild(node);
    stick(true);
  }

  async function dispatch(raw) {
    var parsed = parse(raw);
    if (!parsed.name) return;
    var cmd = registry.find(parsed.name);
    if (!parsed.slash) {
      if (!registry.isBare(parsed.name)) {
        await printLine("jhsh: " + parsed.raw + ": this shell only prints replies. Try /help.", "warn");
        return;
      }
    } else if (!cmd) {
      await printLine("/" + parsed.name + ": unknown command. Type /help.", "warn");
      return;
    }
    ctx.rest = parsed.rest;
    await cmd.run(parsed.args, ctx);
  }

  async function execute(raw) {
    canceled = false;
    skip = false;
    stopMode = "";
    if (stage && !stage.hidden) closeStage(true);
    echo(raw);
    try {
      await dispatch(raw);
    } catch (err) {
      await printLine((err && err.message) || "The command stopped.", "warn");
    }
    if (canceled && stopMode === "ctrlc") await printLine("^C", "warn", true);
    canceled = false;
    skip = false;
    stopMode = "";
    stick(true);
  }

  async function pump() {
    if (pumping) return;
    pumping = true;
    while (queue.length && !booting) {
      var next = queue.shift();
      updateQueue();
      await execute(next);
    }
    pumping = false;
    updateQueue();
  }

  function submit(raw) {
    var trimmed = String(raw || "").trim();
    if (!trimmed) return;
    queue.push(trimmed);
    updateQueue();
    if (!booting) pump();
  }

  function hideMenu() {
    if (!menu) return;
    menu.hidden = true;
    menu.replaceChildren();
    input.setAttribute("aria-expanded", "false");
  }

  function optionList(value) {
    if (!value) return [];
    var slash = value.charAt(0) === "/";
    if (!slash && !/^[A-Za-z?]/.test(value)) return [];
    var body = slash ? value.slice(1) : value;
    var parts = body.split(/\s+/);
    var list = registry.list;
    if (parts.length <= 1 && !/\s$/.test(value)) {
      var q = (parts[0] || "").toLowerCase();
      return list.filter(function (cmd) {
        if (!slash && !cmd.bare) return false;
        return !q || cmd.name.indexOf(q) !== -1;
      }).sort(function (a, b) {
        var as = !q || a.name.indexOf(q) === 0 ? 0 : 1;
        var bs = !q || b.name.indexOf(q) === 0 ? 0 : 1;
        return as - bs;
      }).map(function (cmd) {
        var shown = (slash ? "/" : "") + cmd.name;
        return { insert: shown, title: shown, detail: cmd.summary };
      });
    }
    var name = (parts[0] || "").toLowerCase();
    if (!slash && !registry.isBare(name)) return [];
    var partial = (parts[parts.length - 1] || "").toLowerCase();
    if (/\s$/.test(value)) partial = "";
    var options = [];
    if (name === "theme") {
      options = [
        ["light", "warm paper"],
        ["dark", "phosphor lab"],
        ["next", "the other one"]
      ];
    } else if (name === "game") {
      options = [
        ["2048", registry.games["2048"].about],
        ["snake", registry.games.snake.about],
        ["tetris", registry.games.tetris.about]
      ];
    } else if (name === "cat") {
      options = Object.keys(registry.files).map(function (file) { return [file, "guest file"]; });
    } else if (name === "man") {
      options = list.map(function (cmd) { return [cmd.name, cmd.summary]; });
    } else if (name === "open") {
      options = ["github", "x", "hf", "toolbox", "snake", "2048", "tetris", "home"].map(function (place) {
        return [place, "known link"];
      });
    } else if (name === "repo" && window.JH270GitHub && window.JH270GitHub.peek()) {
      options = window.JH270GitHub.peek().repos.map(function (repo) {
        return [repo.name, repo.language || "repository"];
      });
    }
    var head = (slash ? "/" : "") + (registry.find(name) ? registry.find(name).name : parts[0]);
    return options.filter(function (item) {
      return !partial || item[0].toLowerCase().indexOf(partial) === 0;
    }).map(function (item) {
      return { insert: head + " " + item[0], title: item[0], detail: item[1] };
    });
  }

  function paintMenu() {
    if (!menu) return;
    menu.replaceChildren();
    if (!suggestions.length || document.activeElement !== input) {
      menu.hidden = true;
      input.setAttribute("aria-expanded", "false");
      return;
    }
    if (selected >= suggestions.length) selected = 0;
    menu.hidden = false;
    input.setAttribute("aria-expanded", "true");
    suggestions.forEach(function (item, index) {
      var button = document.createElement("button");
      button.type = "button";
      button.setAttribute("role", "option");
      button.setAttribute("aria-selected", index === selected ? "true" : "false");
      var title = document.createElement("span");
      title.textContent = item.title;
      var detail = document.createElement("span");
      detail.textContent = item.detail || "";
      button.appendChild(title);
      button.appendChild(detail);
      button.addEventListener("mousedown", function (event) {
        event.preventDefault();
        accept(item.insert);
      });
      menu.appendChild(button);
    });
    var current = menu.querySelector('[aria-selected="true"]');
    if (current && current.scrollIntoView) current.scrollIntoView({ block: "nearest" });
  }

  function refreshMenu() {
    suggestions = optionList(input.value);
    selected = 0;
    paintMenu();
  }

  function valueToRun(typed) {
    if (!suggestions.length || menu.hidden) return typed;
    var chosen = suggestions[selected] || suggestions[0];
    if (typed.indexOf(" ") === -1) return chosen.insert;
    if (chosen.insert.indexOf(typed) === 0) return chosen.insert;
    return typed;
  }

  function accept(value) {
    var trimmed = String(value || "").trim();
    input.value = "";
    historyIndex = commandHistory.length;
    hideMenu();
    if (!trimmed) return;
    commandHistory.push(trimmed);
    historyIndex = commandHistory.length;
    submit(trimmed);
  }

  function historyNav(direction) {
    if (!commandHistory.length) return;
    if (direction < 0) historyIndex = Math.max(0, historyIndex - 1);
    else historyIndex = Math.min(commandHistory.length, historyIndex + 1);
    input.value = historyIndex === commandHistory.length ? "" : commandHistory[historyIndex];
    suggestions = [];
    hideMenu();
  }

  form.addEventListener("submit", function (event) {
    event.preventDefault();
    accept(valueToRun(input.value));
  });

  input.addEventListener("input", function () {
    historyIndex = commandHistory.length;
    refreshMenu();
  });

  input.addEventListener("keydown", function (event) {
    var menuOpen = menu && !menu.hidden && suggestions.length;
    if (event.key === "ArrowDown" && menuOpen) {
      event.preventDefault();
      selected = (selected + 1) % suggestions.length;
      paintMenu();
      return;
    }
    if (event.key === "ArrowUp" && menuOpen) {
      event.preventDefault();
      selected = (selected - 1 + suggestions.length) % suggestions.length;
      paintMenu();
      return;
    }
    if (event.key === "ArrowUp" && !menuOpen) {
      event.preventDefault();
      historyNav(-1);
      return;
    }
    if (event.key === "ArrowDown" && !menuOpen) {
      event.preventDefault();
      historyNav(1);
      return;
    }
    if (event.key === "Tab" && menuOpen) {
      event.preventDefault();
      var insert = suggestions[selected].insert;
      var token = insert.split(" ")[0].replace(/^\//, "");
      if (insert.indexOf(" ") === -1 && ["theme", "game", "cat", "man", "open", "repo"].indexOf(token) !== -1) insert += " ";
      input.value = insert;
      refreshMenu();
      return;
    }
    if (event.key === "Escape" && menuOpen) {
      event.preventDefault();
      event.stopPropagation();
      hideMenu();
    }
  });

  input.addEventListener("blur", function () {
    window.setTimeout(function () {
      if (document.activeElement !== input) hideMenu();
    }, 150);
  });

  document.addEventListener("keydown", function (event) {
    var key = event.key.toLowerCase();
    if (event.key === "Escape") {
      if (menu && !menu.hidden) return;
      if (stage && !stage.hidden) {
        event.preventDefault();
        closeStage(false);
        return;
      }
      skip = true;
      return;
    }
    if (!event.ctrlKey && !event.metaKey) return;
    if (key === "l") {
      event.preventDefault();
      halt("clear");
      return;
    }
    if (key !== "c") return;
    var selection = window.getSelection ? String(window.getSelection()) : "";
    if (selection) return;
    if (document.activeElement === input && input.selectionStart !== input.selectionEnd) return;
    if (pumping || booting) {
      event.preventDefault();
      halt("ctrlc");
      return;
    }
    if (document.activeElement === input && input.value) {
      event.preventDefault();
      var typed = input.value;
      input.value = "";
      hideMenu();
      var node = document.createElement("p");
      node.className = "line line-warn";
      node.textContent = "^C " + typed;
      screen.appendChild(node);
      stick(true);
    }
  });

  screen.addEventListener("click", function (event) {
    var button = event.target.closest("[data-run]");
    if (button) {
      accept(button.getAttribute("data-run"));
      return;
    }
    if (event.target.closest("a, button")) return;
    var selection = window.getSelection ? String(window.getSelection()) : "";
    if (!selection) input.focus();
  });

  var closeButton = document.getElementById("stage-close");
  var fullButton = document.getElementById("stage-full");
  if (closeButton) closeButton.addEventListener("click", function () { closeStage(false); });
  if (fullButton) {
    fullButton.addEventListener("click", function () {
      var request = stage.requestFullscreen || stage.webkitRequestFullscreen;
      if (!request) {
        fullButton.textContent = "Unavailable";
        return;
      }
      request.call(stage);
    });
  }
  if (frame) {
    frame.addEventListener("load", function () {
      if (stage.hidden || !frame.getAttribute("src") || frame.src.indexOf("about:blank") !== -1) return;
      try { frame.focus(); } catch (err) {}
    });
  }

  window.addEventListener("jh270-theme", paintThemeStatus);
  paintThemeStatus();

  var welcome = [
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

  function allowedRun(value) {
    return /^\/?[A-Za-z0-9?]+( [A-Za-z0-9._@:/ -]+)?$/.test(value) && value.length <= 160;
  }

  async function boot() {
    var params = new URLSearchParams(window.location.search);
    var requested = (params.get("run") || "").trim();
    var autorun = allowedRun(requested) ? requested : "";
    var instant = Boolean(autorun) || window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (instant) skip = true;
    for (var i = 0; i < welcome.length; i++) {
      if (canceled) break;
      await printLine(welcome[i], i === 0 ? "accent" : "");
    }
    if (canceled && stopMode === "ctrlc") await printLine("^C", "warn", true);
    var runAfter = canceled ? "" : autorun;
    canceled = false;
    skip = false;
    stopMode = "";
    booting = false;
    if (requested && !autorun) await printLine("Ignored the linked command.", "dim");
    if (runAfter) queue.unshift(runAfter);
    updateQueue();
    pump();
    if (!stage || stage.hidden) input.focus();
  }

  boot();
})();
