(function () {
  var JH_GAMES = {
    "2048": {
      title: "2048",
      url: "https://game-2048.jh270.com",
      about: "Slide and merge tiles on a 4×4 board."
    },
    snake: {
      title: "Snake",
      url: "https://game-snake.jh270.com",
      about: "Eat, grow, and don't bite yourself."
    },
    tetris: {
      title: "Tetris",
      url: "https://game-tetris.jh270.com",
      about: "Stack the falling pieces and clear lines."
    }
  };

  var JH_FILES = {
    "about.txt": [
      "Jinhong270",
      "",
      "GitHub        https://github.com/Jinhong270",
      "X             https://x.com/Jinhong270",
      "Hugging Face  https://huggingface.co/Jinhong270",
      "",
      "The same name is used on all three."
    ].join("\n"),
    "now.txt": [
      "AndroidToolBox",
      "",
      "An Android SSH toolbox for browsing remote files and opening a shell.",
      "More tools are planned.",
      "",
      "https://github.com/Jinhong270/AndroidToolBox"
    ].join("\n"),
    "games.txt": [
      "2048     slide and merge      game-2048.jh270.com",
      "snake    eat and grow         game-snake.jh270.com",
      "tetris   stack and clear      game-tetris.jh270.com",
      "",
      "Open a cabinet with /game. The game stays embedded in this page."
    ].join("\n"),
    "readme.txt": [
      "Guest shell for jh270.com",
      "User    guest@jh270.com",
      "Locale  English (United States)",
      "",
      "Commands are printed. They are not executed on a computer.",
      "/repos, /stats, and /repo read public GitHub data in this browser."
    ].join("\n")
  };

  var JH_FORTUNES = [
    "A toolbox grows one tool at a time.",
    "The snake only needs one more apple.",
    "2048 is just 2, being patient.",
    "Guest accounts still get the good games.",
    "Phosphor fades. The repository stays.",
    "Read the prompt before you trust the reply.",
    "Ship the shell. The next tool can wait a commit.",
    "A clear screen is not a clear mind, but it helps."
  ];

  var JH_BANNER = [
    " ###  #   #  ###  #####  ### ",
    "   #  #   #     #     # #   #",
    "   #  #####  ###     #  #   #",
    "#  #  #   # #       #   #   #",
    " ##   #   # #####   #    ### ",
    "",
    "         guest@jh270.com"
  ].join("\n");

  var JH_aliases = {
    "?": "help",
    quit: "exit",
    home: "exit",
    cls: "clear",
    huggingface: "hf",
    twitter: "x"
  };

  var JH_bareAlias = {
    "?": "help",
    quit: "exit",
    cls: "clear"
  };

  function JH_gameBy(JH_token) {
    var JH_key = String(JH_token || "").trim().toLowerCase();
    if (JH_key === "1" || JH_key === "2048") return "2048";
    if (JH_key === "2" || JH_key === "snake") return "snake";
    if (JH_key === "3" || JH_key === "tetris") return "tetris";
    return "";
  }

  function JH_clean(JH_text, JH_limit) {
    return String(JH_text || "").replace(/[\u0000-\u001f]+/g, " ").trim().slice(0, JH_limit || 180);
  }

  function JH_find(JH_name) {
    var JH_key = JH_aliases[JH_name] || JH_name;
    for (var JH_i = 0; JH_i < JH_commands.length; JH_i++) {
      if (JH_commands[JH_i].name === JH_key) return JH_commands[JH_i];
    }
    return null;
  }

  function JH_isBare(JH_name) {
    var JH_cmd = JH_find(JH_name);
    if (!JH_cmd || !JH_cmd.bare) return false;
    if (JH_name === JH_cmd.name) return true;
    return JH_bareAlias[JH_name] === JH_cmd.name;
  }

  async function JH_help(JH_args, JH_ctx) {
    var JH_order = ["Session", "Profile", "Files", "Play"];
    await JH_ctx.printLine("Guest shell. Replies are typed. Nothing is executed.");
    await JH_ctx.printLine("ls, cat, pwd, clear, and other Linux names also run without a slash.");
    await JH_ctx.printLine("Esc finishes a reply. Ctrl+C stops it. Ctrl+L clears the screen.");
    for (var JH_g = 0; JH_g < JH_order.length; JH_g++) {
      if (JH_ctx.stopped()) return;
      await JH_ctx.printLine("");
      await JH_ctx.printLine(JH_order[JH_g], "accent");
      for (var JH_i = 0; JH_i < JH_commands.length; JH_i++) {
        if (JH_commands[JH_i].group !== JH_order[JH_g]) continue;
        var JH_label = "/" + JH_commands[JH_i].name;
        while (JH_label.length < 12) JH_label += " ";
        await JH_ctx.printLine("  " + JH_label + JH_commands[JH_i].summary);
      }
    }
    await JH_ctx.printLine("");
    await JH_ctx.printLine("More detail: man <command>  or  /man <command>");
  }

  async function JH_themeCmd(JH_args, JH_ctx) {
    var JH_api = window.JH270Theme;
    var JH_choice = String(JH_args[0] || "").toLowerCase();
    if (!JH_api) {
      await JH_ctx.printLine("Theme control is missing on this page.", "warn");
      return;
    }
    var JH_mark = JH_api.choice === "dark" ? "NIGHT" : JH_api.choice === "light" ? "DAY" : "SYS";
    if (!JH_choice) {
      await JH_ctx.printLine("Theme: " + JH_api.theme + " (" + JH_mark + ")");
      await JH_ctx.printLine("");
      await JH_ctx.printLine("system   follow this device");
      await JH_ctx.printLine("light    warm paper");
      await JH_ctx.printLine("dark     phosphor lab");
      await JH_ctx.printLine("");
      await JH_ctx.printLine("Usage: /theme system | light | dark | next");
      return;
    }
    if (JH_choice === "next") JH_api.cycle();
    else if (JH_choice === "light" || JH_choice === "dark" || JH_choice === "system") JH_api.set(JH_choice);
    else {
      await JH_ctx.printLine("Unknown theme \"" + JH_clean(JH_args[0], 40) + "\". Use system, light, dark, or next.", "warn");
      return;
    }
    JH_mark = JH_api.choice === "dark" ? "NIGHT" : JH_api.choice === "light" ? "DAY" : "SYS";
    await JH_ctx.printLine("Theme: " + JH_api.theme + " (" + JH_mark + ")");
  }

  async function JH_gameCmd(JH_args, JH_ctx) {
    if (!JH_args.length) {
      await JH_ctx.printLine("Pick a cabinet. It stays embedded on this page.");
      await JH_ctx.printLine("");
      JH_ctx.choices([
        { run: "/game 2048", title: "1   2048", detail: JH_GAMES["2048"].about },
        { run: "/game snake", title: "2   Snake", detail: JH_GAMES.snake.about },
        { run: "/game tetris", title: "3   Tetris", detail: JH_GAMES.tetris.about }
      ]);
      await JH_ctx.printLine("Usage: /game 2048 | snake | tetris");
      return;
    }
    var JH_id = JH_gameBy(JH_args[0]);
    if (!JH_id) {
      await JH_ctx.printLine("Unknown cabinet \"" + JH_clean(JH_args[0], 40) + "\". Choose 2048, snake, or tetris.", "warn");
      return;
    }
    var JH_game = JH_GAMES[JH_id];
    await JH_ctx.printLine("Opening " + JH_game.title + " from " + JH_game.url.replace("https://", "") + ".");
    await JH_ctx.printLine("The address bar stays here. Close, or press Esc, to return to the prompt.");
    await JH_ctx.printLine("Click the cabinet if the keys still type into the prompt.", "dim");
    JH_ctx.launch(JH_id);
  }

  async function JH_readGithub(JH_ctx) {
    if (!JH_ctx.github) throw new Error("The GitHub reader is missing on this page.");
    if (!JH_ctx.github.peek()) await JH_ctx.printLine("Reading public GitHub data in this browser…", "dim");
    var JH_data = await JH_ctx.github.loadProfile();
    if (JH_ctx.stopped()) return null;
    return JH_data;
  }

  async function JH_reposCmd(JH_args, JH_ctx) {
    try {
      var JH_data = await JH_readGithub(JH_ctx);
      if (!JH_data) return;
      var JH_filter = String(JH_args[0] || "").toLowerCase();
      var JH_list = JH_data.repos.filter(function (JH_repo) {
        if (!JH_filter) return true;
        var JH_about = JH_ctx.github.blurb(JH_repo).toLowerCase();
        var JH_language = String(JH_repo.language || "").toLowerCase();
        return JH_repo.name.toLowerCase().indexOf(JH_filter) !== -1 || JH_language.indexOf(JH_filter) !== -1 || JH_about.indexOf(JH_filter) !== -1;
      });
      await JH_ctx.printLine(JH_list.length + " public repositories" + (JH_filter ? " matching \"" + JH_clean(JH_filter, 40) + "\"" : "") + ".");
      for (var JH_i = 0; JH_i < JH_list.length; JH_i++) {
        if (JH_ctx.stopped()) return;
        var JH_repo = JH_list[JH_i];
        await JH_ctx.printLine(JH_repo.name + "  ·  " + (JH_repo.language || "other") + "  ·  " + (JH_repo.stargazers_count || 0) + " stars  ·  " + JH_ctx.github.relativeTime(JH_repo.pushed_at));
        await JH_ctx.printLine("  " + JH_ctx.github.blurb(JH_repo), "dim");
      }
      if (!JH_list.length) await JH_ctx.printLine("Nothing matched.", "dim");
    } catch (JH_err) {
      await JH_ctx.printLine(JH_err.message || "GitHub could not be read.", "warn");
    }
  }

  async function JH_statsCmd(JH_args, JH_ctx) {
    try {
      var JH_data = await JH_readGithub(JH_ctx);
      if (!JH_data) return;
      var JH_user = JH_data.user;
      var JH_stars = JH_data.repos.reduce(function (JH_sum, JH_repo) { return JH_sum + (JH_repo.stargazers_count || 0); }, 0);
      var JH_languages = {};
      JH_data.repos.forEach(function (JH_repo) {
        var JH_name = JH_repo.language || "Other";
        JH_languages[JH_name] = (JH_languages[JH_name] || 0) + 1;
      });
      await JH_ctx.printLine("login       " + (JH_user.login || "Jinhong270"));
      await JH_ctx.printLine("name        " + (JH_user.name || JH_user.login || "Jinhong270"));
      await JH_ctx.printLine("repos       " + (JH_user.public_repos || JH_data.repos.length));
      await JH_ctx.printLine("stars       " + JH_stars);
      await JH_ctx.printLine("followers   " + (JH_user.followers || 0));
      await JH_ctx.printLine("following   " + (JH_user.following || 0));
      await JH_ctx.printLine("joined      " + JH_ctx.github.formatDate(JH_user.created_at));
      var JH_names = Object.keys(JH_languages).sort(function (JH_a, JH_b) { return JH_languages[JH_b] - JH_languages[JH_a]; });
      await JH_ctx.printLine("languages   " + JH_names.map(function (JH_name) { return JH_name + " " + JH_languages[JH_name]; }).join("   "));
      if (JH_data.repos[0]) await JH_ctx.printLine("latest      " + JH_data.repos[0].name + ", pushed " + JH_ctx.github.relativeTime(JH_data.repos[0].pushed_at));
      if (JH_data.readAt) await JH_ctx.printLine("read at     " + JH_data.readAt.toLocaleString("en-US"), "dim");
      JH_ctx.link("https://github.com/Jinhong270");
    } catch (JH_err) {
      await JH_ctx.printLine(JH_err.message || "GitHub could not be read.", "warn");
    }
  }

  async function JH_repoCmd(JH_args, JH_ctx) {
    var JH_name = JH_args[0] || "";
    if (!/^[A-Za-z0-9._-]+$/.test(JH_name)) {
      await JH_ctx.printLine("Usage: /repo <name>", "warn");
      return;
    }
    if (!JH_ctx.github) {
      await JH_ctx.printLine("The GitHub reader is missing on this page.", "warn");
      return;
    }
    await JH_ctx.printLine("Reading " + JH_name + "…", "dim");
    try {
      var JH_repo = await JH_ctx.github.loadRepo(JH_name);
      if (JH_ctx.stopped()) return;
      await JH_ctx.printLine(JH_repo.full_name || JH_repo.name);
      await JH_ctx.printLine(JH_ctx.github.blurb(JH_repo));
      await JH_ctx.printLine("language    " + (JH_repo.language || "—"));
      await JH_ctx.printLine("stars       " + (JH_repo.stargazers_count || 0));
      await JH_ctx.printLine("forks       " + (JH_repo.forks_count || 0));
      await JH_ctx.printLine("branch      " + (JH_repo.default_branch || "—"));
      await JH_ctx.printLine("created     " + JH_ctx.github.formatDate(JH_repo.created_at));
      await JH_ctx.printLine("pushed      " + JH_ctx.github.relativeTime(JH_repo.pushed_at));
      if (JH_repo.fork) await JH_ctx.printLine("fork        yes");
      if (JH_repo.archived) await JH_ctx.printLine("archived    yes");
      if (JH_repo.license && JH_repo.license.spdx_id && JH_repo.license.spdx_id !== "NOASSERTION") {
        await JH_ctx.printLine("license     " + JH_repo.license.spdx_id);
      }
      JH_ctx.link(JH_repo.html_url);
    } catch (JH_err) {
      await JH_ctx.printLine(JH_err.message || "That repository could not be read.", "warn");
    }
  }

  async function JH_aboutCmd(JH_args, JH_ctx) {
    await JH_ctx.printLine("Jinhong270");
    await JH_ctx.printLine("GitHub, X, and Hugging Face all use this name.");
    await JH_ctx.printLine("");
    await JH_ctx.printLine("The active project is AndroidToolBox, an Android SSH toolbox for remote files and a shell. More tools are planned.");
    await JH_ctx.printLine("There are also three arcade games and two AstrBot plugins.");
    await JH_ctx.printLine("");
    await JH_ctx.printLine("This page is only the guest. The operator is Jinhong270.");
  }

  async function JH_nowCmd(JH_args, JH_ctx) {
    await JH_ctx.printLine("Now: AndroidToolBox.");
    await JH_ctx.printLine("It is an Android SSH toolbox for browsing remote files and opening a shell.");
    await JH_ctx.printLine("More tools are planned. The repository is the place to watch.");
    JH_ctx.link("https://github.com/Jinhong270/AndroidToolBox");
  }

  async function JH_toolboxCmd(JH_args, JH_ctx) {
    await JH_ctx.printLine("AndroidToolBox");
    await JH_ctx.printLine("Kotlin · Apache-2.0 · in progress");
    await JH_ctx.printLine("Browse remote files over SSH and open a shell, on Android.");
    await JH_ctx.printLine("The toolbox is the current build. More tools are on the way.");
    JH_ctx.link("https://github.com/Jinhong270/AndroidToolBox");
  }

  async function JH_projectsCmd(JH_args, JH_ctx) {
    await JH_ctx.printLine("Selected work");
    await JH_ctx.printLine("");
    await JH_ctx.printLine("AndroidToolBox — SSH files and a shell on Android. More tools are planned.");
    JH_ctx.link("https://github.com/Jinhong270/AndroidToolBox");
    await JH_ctx.printLine("Snake, 2048, Tetris — play them here with /game.");
    JH_ctx.link("https://github.com/Jinhong270/Snake", "Snake");
    JH_ctx.link("https://github.com/Jinhong270/2048", "2048");
    JH_ctx.link("https://github.com/Jinhong270/Tetris", "Tetris");
    await JH_ctx.printLine("astrbot_plugin_hfapibilibili — resolve a Bilibili link and download the video.");
    JH_ctx.link("https://github.com/Jinhong270/astrbot_plugin_hfapibilibili");
    await JH_ctx.printLine("astrbot_plugin_youdaolittlep — Youdao Xiao P chat, speech, and common questions.");
    JH_ctx.link("https://github.com/Jinhong270/astrbot_plugin_youdaolittlep");
  }

  async function JH_contactCmd(JH_args, JH_ctx) {
    await JH_ctx.printLine("Jinhong270");
    JH_ctx.link("https://github.com/Jinhong270", "GitHub  @Jinhong270");
    JH_ctx.link("https://x.com/Jinhong270", "X  @Jinhong270");
    JH_ctx.link("https://huggingface.co/Jinhong270", "Hugging Face  @Jinhong270");
  }

  function JH_profileLink(JH_href, JH_label) {
    return async function (JH_args, JH_ctx) {
      await JH_ctx.printLine(JH_label);
      JH_ctx.link(JH_href);
    };
  }

  async function JH_openCmd(JH_args, JH_ctx) {
    var JH_key = String(JH_args[0] || "").toLowerCase();
    var JH_places = {
      github: { href: "https://github.com/Jinhong270", label: "GitHub" },
      x: { href: "https://x.com/Jinhong270", label: "X" },
      hf: { href: "https://huggingface.co/Jinhong270", label: "Hugging Face" },
      huggingface: { href: "https://huggingface.co/Jinhong270", label: "Hugging Face" },
      toolbox: { href: "https://github.com/Jinhong270/AndroidToolBox", label: "AndroidToolBox" },
      snake: { href: "https://github.com/Jinhong270/Snake", label: "Snake", note: "Play it here with /game snake." },
      "2048": { href: "https://github.com/Jinhong270/2048", label: "2048", note: "Play it here with /game 2048." },
      tetris: { href: "https://github.com/Jinhong270/Tetris", label: "Tetris", note: "Play it here with /game tetris." },
      home: { note: "You are in the guest shell. /exit returns to the homepage." }
    };
    var JH_place = JH_places[JH_key];
    if (!JH_place) {
      await JH_ctx.printLine("Usage: /open github | x | hf | toolbox | snake | 2048 | tetris | home", "warn");
      return;
    }
    if (JH_place.note) await JH_ctx.printLine(JH_place.note);
    if (JH_place.href) JH_ctx.link(JH_place.href, JH_place.label || JH_place.href);
  }

  async function JH_whoamiCmd(JH_args, JH_ctx) {
    await JH_ctx.printLine("guest@jh270.com");
    await JH_ctx.printLine("user        guest");
    await JH_ctx.printLine("host        jh270.com");
    await JH_ctx.printLine("locale      en-US");
    await JH_ctx.printLine("operator    Jinhong270");
  }

  async function JH_neofetchCmd(JH_args, JH_ctx) {
    var JH_theme = window.JH270Theme;
    var JH_minutes = Math.max(0, Math.round((Date.now() - JH_ctx.startedAt) / 60000));
    var JH_agent = JH_clean(navigator.userAgent, 90);
    await JH_ctx.printPre([
      "guest@jh270.com",
      "--------------",
      "os        jh270 terminal",
      "host      jh270.com",
      "user      guest",
      "locale    en-US",
      "shell     simulated",
      "theme     " + (JH_theme ? JH_theme.theme : "unknown"),
      "screen    " + window.innerWidth + "x" + window.innerHeight,
      "session   " + JH_minutes + " min",
      "browser   " + JH_agent
    ].join("\n"));
  }

  async function JH_uptimeCmd(JH_args, JH_ctx) {
    var JH_seconds = Math.max(0, Math.floor((Date.now() - JH_ctx.startedAt) / 1000));
    await JH_ctx.printLine("up " + Math.floor(JH_seconds / 60) + " min " + (JH_seconds % 60) + " sec");
  }

  async function JH_versionCmd(JH_args, JH_ctx) {
    await JH_ctx.printLine("jh270 terminal 1.0");
    await JH_ctx.printLine("locale  en-US");
    await JH_ctx.printLine("user    guest@jh270.com");
  }

  async function JH_manCmd(JH_args, JH_ctx) {
    var JH_name = String(JH_args[0] || "").replace(/^\//, "").toLowerCase();
    var JH_cmd = JH_find(JH_name);
    if (!JH_cmd) {
      await JH_ctx.printLine("No manual entry. Try /help.", "warn");
      return;
    }
    await JH_ctx.printLine("/" + JH_cmd.name + " — " + JH_cmd.summary);
    if (JH_cmd.usage) await JH_ctx.printLine("usage   " + JH_cmd.usage);
    if (JH_cmd.detail) await JH_ctx.printLine(JH_cmd.detail);
  }

  async function JH_hintCmd(JH_args, JH_ctx) {
    var JH_pool = JH_commands.filter(function (JH_cmd) { return JH_cmd.name !== "hint" && JH_cmd.name !== "exit"; });
    var JH_pick = JH_pool[Math.floor(Math.random() * JH_pool.length)];
    await JH_ctx.printLine("Try /" + JH_pick.name + " — " + JH_pick.summary);
  }

  async function JH_creditsCmd(JH_args, JH_ctx) {
    await JH_ctx.printLine("Static page. No server builds the reply.");
    await JH_ctx.printLine("GitHub numbers come from api.github.com in this browser.");
    await JH_ctx.printLine("2048, Snake, and Tetris are embedded from their jh270.com cabinets.");
    await JH_ctx.printLine("The person behind the name is Jinhong270.");
  }

  async function JH_exitCmd(JH_args, JH_ctx) {
    await JH_ctx.printLine("Closing the guest session.");
    if (JH_ctx.stopped()) return;
    window.setTimeout(function () { window.location.href = "../"; }, 500);
  }

  async function JH_clearCmd(JH_args, JH_ctx) {
    JH_ctx.clear();
  }

  async function JH_historyCmd(JH_args, JH_ctx) {
    var JH_items = JH_ctx.history();
    if (!JH_items.length) {
      await JH_ctx.printLine("No commands yet.");
      return;
    }
    for (var JH_i = 0; JH_i < JH_items.length; JH_i++) {
      var JH_n = String(JH_i + 1);
      while (JH_n.length < 3) JH_n = " " + JH_n;
      await JH_ctx.printLine(JH_n + "  " + JH_items[JH_i]);
    }
  }

  async function JH_langCmd(JH_args, JH_ctx) {
    await JH_ctx.printLine("English (United States)");
    await JH_ctx.printLine("This terminal does not switch language.");
  }

  async function JH_dateCmd(JH_args, JH_ctx) {
    await JH_ctx.printLine(new Date().toLocaleString("en-US", { dateStyle: "full", timeStyle: "long" }));
  }

  async function JH_pwdCmd(JH_args, JH_ctx) {
    await JH_ctx.printLine("/home/guest");
  }

  async function JH_lsCmd(JH_args, JH_ctx) {
    var JH_path = "";
    for (var JH_i = 0; JH_i < JH_args.length; JH_i++) {
      if (JH_args[JH_i].charAt(0) !== "-") JH_path = JH_args[JH_i];
    }
    if (JH_path && JH_path !== "." && JH_path !== "~" && JH_path !== "/home/guest") {
      await JH_ctx.printLine("ls: " + JH_clean(JH_path, 80) + ": this guest shell only keeps four files.", "warn");
      return;
    }
    await JH_ctx.printPre("about.txt\ngames.txt\nnow.txt\nreadme.txt");
  }

  async function JH_catCmd(JH_args, JH_ctx) {
    var JH_name = JH_args[0] || "";
    if (!JH_name) {
      await JH_ctx.printLine("Usage: cat about.txt | now.txt | games.txt | readme.txt", "warn");
      return;
    }
    if (!JH_FILES[JH_name]) {
      await JH_ctx.printLine("cat: " + JH_clean(JH_name, 80) + ": no such file", "warn");
      return;
    }
    await JH_ctx.printPre(JH_FILES[JH_name]);
  }

  async function JH_echoCmd(JH_args, JH_ctx) {
    await JH_ctx.printLine(JH_clean(JH_ctx.rest, 400));
  }

  async function JH_bannerCmd(JH_args, JH_ctx) {
    await JH_ctx.printPre(JH_BANNER);
  }

  async function JH_fortuneCmd(JH_args, JH_ctx) {
    await JH_ctx.printLine(JH_FORTUNES[Math.floor(Math.random() * JH_FORTUNES.length)]);
  }

  async function JH_pingCmd(JH_args, JH_ctx) {
    var JH_host = JH_clean(JH_args[0] || "jh270.com", 80) || "jh270.com";
    await JH_ctx.printLine("PING " + JH_host + ": 56 data bytes");
    for (var JH_i = 1; JH_i <= 3; JH_i++) {
      if (JH_ctx.stopped()) return;
      var JH_time = 8 + ((JH_i * 17) % 13);
      await JH_ctx.printLine("64 bytes from " + JH_host + ": icmp_seq=" + JH_i + " ttl=56 time=" + JH_time + " ms");
    }
    await JH_ctx.printLine("");
    await JH_ctx.printLine("Printed locally. No packet left this page.", "dim");
  }

  async function JH_sudoCmd(JH_args, JH_ctx) {
    var JH_extra = JH_ctx.rest ? " (" + JH_clean(JH_ctx.rest, 80) + ")" : "";
    await JH_ctx.printLine("guest is not in the sudoers file" + JH_extra + ". This incident will be printed, not reported.", "warn");
  }

  var JH_commands = [
    { name: "help", bare: true, group: "Session", summary: "List commands", usage: "help  or  /help", detail: "Groups the commands this guest shell can print.", run: JH_help },
    { name: "theme", group: "Session", summary: "Switch system, light, or dark", usage: "/theme [system|light|dark|next]", detail: "The same choice as the button at the top right. system follows this device, and a first visit uses system.", run: JH_themeCmd },
    { name: "clear", bare: true, group: "Session", summary: "Clear the screen", usage: "clear  or  /clear", detail: "Ctrl+L does the same.", run: JH_clearCmd },
    { name: "history", bare: true, group: "Session", summary: "Show commands from this visit", usage: "history  or  /history", detail: "Only this page session. Nothing is stored on a server.", run: JH_historyCmd },
    { name: "lang", group: "Session", summary: "Show the terminal language", usage: "/lang", detail: "English (United States). There is no language switch.", run: JH_langCmd },
    { name: "date", bare: true, group: "Session", summary: "Show the local date and time", usage: "date  or  /date", detail: "Uses the clock on this device.", run: JH_dateCmd },
    { name: "pwd", bare: true, group: "Session", summary: "Show the guest directory", usage: "pwd  or  /pwd", detail: "The directory is fictional. The shell does not touch a disk.", run: JH_pwdCmd },
    { name: "whoami", bare: true, group: "Session", summary: "Show the guest identity", usage: "whoami  or  /whoami", detail: "You are guest@jh270.com. Jinhong270 operates the site.", run: JH_whoamiCmd },
    { name: "neofetch", bare: true, group: "Session", summary: "Show a snapshot of this session", usage: "neofetch  or  /neofetch", detail: "Screen size, theme, and browser text from this device.", run: JH_neofetchCmd },
    { name: "uptime", bare: true, group: "Session", summary: "Show how long this page has been open", usage: "uptime  or  /uptime", detail: "Counts from the moment the terminal loaded.", run: JH_uptimeCmd },
    { name: "version", group: "Session", summary: "Show the terminal version", usage: "/version", detail: "jh270 terminal 1.0.", run: JH_versionCmd },
    { name: "man", bare: true, group: "Session", summary: "Read one command", usage: "man <command>  or  /man <command>", detail: "Example: man game", run: JH_manCmd },
    { name: "hint", group: "Session", summary: "Suggest a command", usage: "/hint", detail: "Picks one command at random.", run: JH_hintCmd },
    { name: "credits", group: "Session", summary: "Where the data and games come from", usage: "/credits", detail: "Client-side GitHub reads, and embedded cabinets.", run: JH_creditsCmd },
    { name: "exit", bare: true, group: "Session", summary: "Return to the homepage", usage: "exit  or  /exit", detail: "Leaves /terminal and opens the homepage.", run: JH_exitCmd },
    { name: "about", group: "Profile", summary: "Who Jinhong270 is", usage: "/about", detail: "Short introduction. The handles match on GitHub, X, and Hugging Face.", run: JH_aboutCmd },
    { name: "now", group: "Profile", summary: "What is being built", usage: "/now", detail: "The active project is AndroidToolBox.", run: JH_nowCmd },
    { name: "toolbox", group: "Profile", summary: "Describe AndroidToolBox", usage: "/toolbox", detail: "Android SSH toolbox for remote files and a shell.", run: JH_toolboxCmd },
    { name: "projects", group: "Profile", summary: "List selected repositories", usage: "/projects", detail: "A short curated list. /repos is the live public list.", run: JH_projectsCmd },
    { name: "repos", group: "Profile", summary: "List public GitHub repositories", usage: "/repos [filter]", detail: "Fetched in this browser from api.github.com.", run: JH_reposCmd },
    { name: "stats", group: "Profile", summary: "Show GitHub counts", usage: "/stats", detail: "Repos, stars, followers, and languages.", run: JH_statsCmd },
    { name: "repo", group: "Profile", summary: "Read one repository", usage: "/repo <name>", detail: "Example: /repo AndroidToolBox", run: JH_repoCmd },
    { name: "contact", group: "Profile", summary: "Show GitHub, X, and Hugging Face", usage: "/contact", detail: "All three are @Jinhong270.", run: JH_contactCmd },
    { name: "github", group: "Profile", summary: "Print the GitHub profile link", usage: "/github", detail: "https://github.com/Jinhong270", run: JH_profileLink("https://github.com/Jinhong270", "GitHub  @Jinhong270") },
    { name: "x", group: "Profile", summary: "Print the X profile link", usage: "/x", detail: "https://x.com/Jinhong270", run: JH_profileLink("https://x.com/Jinhong270", "X  @Jinhong270") },
    { name: "hf", group: "Profile", summary: "Print the Hugging Face profile link", usage: "/hf", detail: "https://huggingface.co/Jinhong270", run: JH_profileLink("https://huggingface.co/Jinhong270", "Hugging Face  @Jinhong270") },
    { name: "open", group: "Profile", summary: "Print a known link", usage: "/open github | x | hf | toolbox | snake | 2048 | tetris | home", detail: "Prints a link. It does not leave this page by itself.", run: JH_openCmd },
    { name: "ls", bare: true, group: "Files", summary: "List the guest files", usage: "ls  or  /ls", detail: "about.txt, now.txt, games.txt, and readme.txt.", run: JH_lsCmd },
    { name: "cat", bare: true, group: "Files", summary: "Print a guest file", usage: "cat <file>  or  /cat <file>", detail: "Try cat now.txt", run: JH_catCmd },
    { name: "echo", bare: true, group: "Files", summary: "Print the text you type", usage: "echo <text>  or  /echo <text>", detail: "Prints the text back. It does not evaluate it.", run: JH_echoCmd },
    { name: "game", group: "Play", summary: "Embed 2048, Snake, or Tetris", usage: "/game [2048|snake|tetris]", detail: "The cabinet loads inside this page from game-2048, game-snake, or game-tetris on jh270.com.", run: JH_gameCmd },
    { name: "banner", group: "Play", summary: "Print the JH270 mark", usage: "/banner", detail: "A small text mark for the guest prompt.", run: JH_bannerCmd },
    { name: "fortune", group: "Play", summary: "Print a short line", usage: "/fortune", detail: "One line, chosen on this device.", run: JH_fortuneCmd },
    { name: "ping", bare: true, group: "Play", summary: "Pretend to ping a host", usage: "ping [host]  or  /ping [host]", detail: "The numbers are printed locally. No packet is sent.", run: JH_pingCmd },
    { name: "sudo", bare: true, group: "Play", summary: "Ask for a permission you do not have", usage: "sudo [text]  or  /sudo [text]", detail: "guest is not in the sudoers file.", run: JH_sudoCmd }
  ];

  window.JH270Commands = {
    list: JH_commands,
    files: JH_FILES,
    games: JH_GAMES,
    gameBy: JH_gameBy,
    find: JH_find,
    isBare: JH_isBare
  };
})();
