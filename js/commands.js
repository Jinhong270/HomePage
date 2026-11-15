(function () {
  var FILES = {
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
      "ECHO COURIER · 270",
      "Rescue lost signals with the echo of yourself from 2.7 seconds ago.",
      "",
      "Open with /game, or from the homepage repository showcase.",
      "A JH270 original at /game/. Use your browser's Back button to return here."
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

  var FORTUNES = [
    "A toolbox grows one tool at a time.",
    "Your echo remembers the way home.",
    "A second chance is only 2.7 seconds behind you.",
    "Guest accounts still get the good games.",
    "Phosphor fades. The repository stays.",
    "Read the prompt before you trust the reply.",
    "Ship the shell. The next tool can wait a commit.",
    "A clear screen is not a clear mind, but it helps."
  ];

  var BANNER = [
    " ###  #   #  ###  #####  ### ",
    "   #  #   #     #     # #   #",
    "   #  #####  ###     #  #   #",
    "#  #  #   # #       #   #   #",
    " ##   #   # #####   #    ### ",
    "",
    "         guest@jh270.com"
  ].join("\n");

  var aliases = {
    "?": "help",
    quit: "exit",
    home: "exit",
    cls: "clear",
    huggingface: "hf",
    twitter: "x"
  };

  var bareAlias = {
    "?": "help",
    quit: "exit",
    cls: "clear"
  };

  function clean(text, limit) {
    return String(text || "").replace(/[\u0000-\u001f]+/g, " ").trim().slice(0, limit || 180);
  }

  function find(name) {
    var key = aliases[name] || name;
    for (var i = 0; i < commands.length; i++) {
      if (commands[i].name === key) return commands[i];
    }
    return null;
  }

  function isBare(name) {
    var cmd = find(name);
    if (!cmd || !cmd.bare) return false;
    if (name === cmd.name) return true;
    return bareAlias[name] === cmd.name;
  }

  async function help(args, ctx) {
    var order = ["Session", "Profile", "Files", "Play"];
    await ctx.printLine("Guest shell. Replies are typed. Nothing is executed.");
    await ctx.printLine("ls, cat, pwd, clear, and other Linux names also run without a slash.");
    await ctx.printLine("Esc finishes a reply. Ctrl+C stops it. Ctrl+L clears the screen.");
    for (var g = 0; g < order.length; g++) {
      if (ctx.stopped()) return;
      await ctx.printLine("");
      await ctx.printLine(order[g], "accent");
      for (var i = 0; i < commands.length; i++) {
        if (commands[i].group !== order[g]) continue;
        var label = "/" + commands[i].name;
        while (label.length < 12) label += " ";
        await ctx.printLine("  " + label + commands[i].summary);
      }
    }
    await ctx.printLine("");
    await ctx.printLine("More detail: man <command>  or  /man <command>");
  }

  async function themeCmd(args, ctx) {
    var api = window.JH270Theme;
    var choice = String(args[0] || "").toLowerCase();
    if (!api) {
      await ctx.printLine("Theme control is missing on this page.", "warn");
      return;
    }
    function mark() {
      return api.theme === "dark" ? "NIGHT" : "DAY";
    }
    if (!choice) {
      await ctx.printLine("Theme: " + api.theme + " (" + mark() + ")");
      await ctx.printLine(api.choice === "system" ? "Following this device until you choose." : "Chosen on this page. It no longer follows this device.");
      await ctx.printLine("");
      await ctx.printLine("light    warm paper");
      await ctx.printLine("dark     phosphor lab");
      await ctx.printLine("");
      await ctx.printLine("Usage: /theme light | dark | next");
      return;
    }
    if (choice === "next") api.cycle();
    else if (choice === "light" || choice === "dark") api.set(choice);
    else {
      await ctx.printLine("Unknown theme \"" + clean(args[0], 40) + "\". Use light, dark, or next.", "warn");
      return;
    }
    await ctx.printLine("Theme: " + api.theme + " (" + mark() + ")");
  }

  async function gameCmd(args, ctx) {
    var name = String(args[0] || "echo").toLowerCase();
    if (args.length > 1 || (name !== "echo" && name !== "echo-courier")) {
      await ctx.printLine("The only game is ECHO COURIER. Open it with /game or /game echo.", "warn");
      return;
    }
    await ctx.printLine("Opening ECHO COURIER · 270 at /game/.", "accent");
    if (ctx.stopped()) return;
    window.location.href = "/game/";
  }

  async function readGithub(ctx) {
    if (!ctx.github) throw new Error("The GitHub reader is missing on this page.");
    if (!ctx.github.peek()) await ctx.printLine("Reading public GitHub data in this browser…", "dim");
    var data = await ctx.github.loadProfile();
    if (ctx.stopped()) return null;
    return data;
  }

  async function reposCmd(args, ctx) {
    try {
      var data = await readGithub(ctx);
      if (!data) return;
      var filter = String(args[0] || "").toLowerCase();
      var list = data.repos.filter(function (repo) {
        if (!filter) return true;
        var about = ctx.github.blurb(repo).toLowerCase();
        var language = String(repo.language || "").toLowerCase();
        return repo.name.toLowerCase().indexOf(filter) !== -1 || language.indexOf(filter) !== -1 || about.indexOf(filter) !== -1;
      });
      await ctx.printLine(list.length + " public repositories" + (filter ? " matching \"" + clean(filter, 40) + "\"" : "") + ".");
      for (var i = 0; i < list.length; i++) {
        if (ctx.stopped()) return;
        var repo = list[i];
        await ctx.printLine(repo.name + "  ·  " + (repo.language || "other") + "  ·  " + (repo.stargazers_count || 0) + " stars  ·  " + ctx.github.relativeTime(repo.pushed_at));
        await ctx.printLine("  " + ctx.github.blurb(repo), "dim");
      }
      if (!list.length) await ctx.printLine("Nothing matched.", "dim");
    } catch (err) {
      await ctx.printLine(err.message || "GitHub could not be read.", "warn");
    }
  }

  async function statsCmd(args, ctx) {
    try {
      var data = await readGithub(ctx);
      if (!data) return;
      var user = data.user;
      var stars = data.repos.reduce(function (sum, repo) { return sum + (repo.stargazers_count || 0); }, 0);
      var languages = {};
      data.repos.forEach(function (repo) {
        var name = repo.language || "Other";
        languages[name] = (languages[name] || 0) + 1;
      });
      await ctx.printLine("login       " + (user.login || "Jinhong270"));
      await ctx.printLine("name        " + (user.name || user.login || "Jinhong270"));
      await ctx.printLine("repos       " + (user.public_repos || data.repos.length));
      await ctx.printLine("stars       " + stars);
      await ctx.printLine("followers   " + (user.followers || 0));
      await ctx.printLine("following   " + (user.following || 0));
      await ctx.printLine("joined      " + ctx.github.formatDate(user.created_at));
      var names = Object.keys(languages).sort(function (a, b) { return languages[b] - languages[a]; });
      await ctx.printLine("languages   " + names.map(function (name) { return name + " " + languages[name]; }).join("   "));
      if (data.repos[0]) await ctx.printLine("latest      " + data.repos[0].name + ", pushed " + ctx.github.relativeTime(data.repos[0].pushed_at));
      if (data.readAt) await ctx.printLine("read at     " + data.readAt.toLocaleString("en-US"), "dim");
      ctx.link("https://github.com/Jinhong270");
    } catch (err) {
      await ctx.printLine(err.message || "GitHub could not be read.", "warn");
    }
  }

  async function repoCmd(args, ctx) {
    var name = args[0] || "";
    if (!/^[A-Za-z0-9._-]+$/.test(name)) {
      await ctx.printLine("Usage: /repo <name>", "warn");
      return;
    }
    if (!ctx.github) {
      await ctx.printLine("The GitHub reader is missing on this page.", "warn");
      return;
    }
    await ctx.printLine("Reading " + name + "…", "dim");
    try {
      var repo = await ctx.github.loadRepo(name);
      if (ctx.stopped()) return;
      await ctx.printLine(repo.full_name || repo.name);
      await ctx.printLine(ctx.github.blurb(repo));
      await ctx.printLine("language    " + (repo.language || "—"));
      await ctx.printLine("stars       " + (repo.stargazers_count || 0));
      await ctx.printLine("forks       " + (repo.forks_count || 0));
      await ctx.printLine("branch      " + (repo.default_branch || "—"));
      await ctx.printLine("created     " + ctx.github.formatDate(repo.created_at));
      await ctx.printLine("pushed      " + ctx.github.relativeTime(repo.pushed_at));
      if (repo.fork) await ctx.printLine("fork        yes");
      if (repo.archived) await ctx.printLine("archived    yes");
      if (repo.license && repo.license.spdx_id && repo.license.spdx_id !== "NOASSERTION") {
        await ctx.printLine("license     " + repo.license.spdx_id);
      }
      ctx.link(repo.html_url);
    } catch (err) {
      await ctx.printLine(err.message || "That repository could not be read.", "warn");
    }
  }

  async function aboutCmd(args, ctx) {
    await ctx.printLine("Jinhong270");
    await ctx.printLine("GitHub, X, and Hugging Face all use this name.");
    await ctx.printLine("");
    await ctx.printLine("The active project is AndroidToolBox, an Android SSH toolbox for remote files and a shell. More tools are planned.");
    await ctx.printLine("There is also ECHO COURIER, an original game for this homepage, and two AstrBot plugins.");
    await ctx.printLine("");
    await ctx.printLine("This page is only the guest. The operator is Jinhong270.");
  }

  async function nowCmd(args, ctx) {
    await ctx.printLine("Now: AndroidToolBox.");
    await ctx.printLine("It is an Android SSH toolbox for browsing remote files and opening a shell.");
    await ctx.printLine("More tools are planned. The repository is the place to watch.");
    ctx.link("https://github.com/Jinhong270/AndroidToolBox");
  }

  async function toolboxCmd(args, ctx) {
    await ctx.printLine("AndroidToolBox");
    await ctx.printLine("Kotlin · Apache-2.0 · in progress");
    await ctx.printLine("Browse remote files over SSH and open a shell, on Android.");
    await ctx.printLine("The toolbox is the current build. More tools are on the way.");
    ctx.link("https://github.com/Jinhong270/AndroidToolBox");
  }

  async function projectsCmd(args, ctx) {
    await ctx.printLine("Selected work");
    await ctx.printLine("");
    await ctx.printLine("AndroidToolBox — SSH files and a shell on Android. More tools are planned.");
    ctx.link("https://github.com/Jinhong270/AndroidToolBox");
    await ctx.printLine("ECHO COURIER — rescue lost signals with your 2.7-second echo. Play with /game.");
    ctx.link("https://github.com/Jinhong270/HomePage", "HomePage / ECHO COURIER");
    await ctx.printLine("astrbot_plugin_hfapibilibili — resolve a Bilibili link and download the video.");
    ctx.link("https://github.com/Jinhong270/astrbot_plugin_hfapibilibili");
    await ctx.printLine("astrbot_plugin_youdaolittlep — Youdao Xiao P chat, speech, and common questions.");
    ctx.link("https://github.com/Jinhong270/astrbot_plugin_youdaolittlep");
  }

  async function contactCmd(args, ctx) {
    await ctx.printLine("Jinhong270");
    ctx.link("https://github.com/Jinhong270", "GitHub  @Jinhong270");
    ctx.link("https://x.com/Jinhong270", "X  @Jinhong270");
    ctx.link("https://huggingface.co/Jinhong270", "Hugging Face  @Jinhong270");
  }

  function profileLink(href, label) {
    return async function (args, ctx) {
      await ctx.printLine(label);
      ctx.link(href);
    };
  }

  async function openCmd(args, ctx) {
    var key = String(args[0] || "").toLowerCase();
    var places = {
      github: { href: "https://github.com/Jinhong270", label: "GitHub" },
      x: { href: "https://x.com/Jinhong270", label: "X" },
      hf: { href: "https://huggingface.co/Jinhong270", label: "Hugging Face" },
      huggingface: { href: "https://huggingface.co/Jinhong270", label: "Hugging Face" },
      toolbox: { href: "https://github.com/Jinhong270/AndroidToolBox", label: "AndroidToolBox" },
      echo: { href: "https://github.com/Jinhong270/HomePage", label: "ECHO COURIER source", note: "Play ECHO COURIER here with /game." },
      home: { note: "You are in the guest shell. /exit returns to the homepage." }
    };
    var place = places[key];
    if (!place) {
      await ctx.printLine("Usage: /open github | x | hf | toolbox | echo | home", "warn");
      return;
    }
    if (place.note) await ctx.printLine(place.note);
    if (place.href) ctx.link(place.href, place.label || place.href);
  }

  async function whoamiCmd(args, ctx) {
    await ctx.printLine("guest@jh270.com");
    await ctx.printLine("user        guest");
    await ctx.printLine("host        jh270.com");
    await ctx.printLine("locale      en-US");
    await ctx.printLine("operator    Jinhong270");
  }

  async function neofetchCmd(args, ctx) {
    var theme = window.JH270Theme;
    var minutes = Math.max(0, Math.round((Date.now() - ctx.startedAt) / 60000));
    var agent = clean(navigator.userAgent, 90);
    await ctx.printPre([
      "guest@jh270.com",
      "--------------",
      "os        jh270 terminal",
      "host      jh270.com",
      "user      guest",
      "locale    en-US",
      "shell     simulated",
      "theme     " + (theme ? theme.theme : "unknown"),
      "screen    " + window.innerWidth + "x" + window.innerHeight,
      "session   " + minutes + " min",
      "browser   " + agent
    ].join("\n"));
  }

  async function uptimeCmd(args, ctx) {
    var seconds = Math.max(0, Math.floor((Date.now() - ctx.startedAt) / 1000));
    await ctx.printLine("up " + Math.floor(seconds / 60) + " min " + (seconds % 60) + " sec");
  }

  async function versionCmd(args, ctx) {
    await ctx.printLine("jh270 terminal 1.0");
    await ctx.printLine("locale  en-US");
    await ctx.printLine("user    guest@jh270.com");
  }

  async function manCmd(args, ctx) {
    var name = String(args[0] || "").replace(/^\//, "").toLowerCase();
    var cmd = find(name);
    if (!cmd) {
      await ctx.printLine("No manual entry. Try /help.", "warn");
      return;
    }
    await ctx.printLine("/" + cmd.name + " — " + cmd.summary);
    if (cmd.usage) await ctx.printLine("usage   " + cmd.usage);
    if (cmd.detail) await ctx.printLine(cmd.detail);
  }

  async function hintCmd(args, ctx) {
    var pool = commands.filter(function (cmd) { return cmd.name !== "hint" && cmd.name !== "exit"; });
    var pick = pool[Math.floor(Math.random() * pool.length)];
    await ctx.printLine("Try /" + pick.name + " — " + pick.summary);
  }

  async function creditsCmd(args, ctx) {
    await ctx.printLine("Static page. No server builds the reply.");
    await ctx.printLine("GitHub numbers come from api.github.com in this browser.");
    await ctx.printLine("ECHO COURIER is an original game built into this homepage.");
    await ctx.printLine("The person behind the name is Jinhong270.");
  }

  async function exitCmd(args, ctx) {
    await ctx.printLine("Closing the guest session.");
    if (ctx.stopped()) return;
    window.setTimeout(function () { window.location.href = "../"; }, 500);
  }

  async function clearCmd(args, ctx) {
    ctx.clear();
  }

  async function historyCmd(args, ctx) {
    var items = ctx.history();
    if (!items.length) {
      await ctx.printLine("No commands yet.");
      return;
    }
    for (var i = 0; i < items.length; i++) {
      var n = String(i + 1);
      while (n.length < 3) n = " " + n;
      await ctx.printLine(n + "  " + items[i]);
    }
  }

  async function langCmd(args, ctx) {
    await ctx.printLine("English (United States)");
    await ctx.printLine("This terminal does not switch language.");
  }

  async function dateCmd(args, ctx) {
    await ctx.printLine(new Date().toLocaleString("en-US", { dateStyle: "full", timeStyle: "long" }));
  }

  async function pwdCmd(args, ctx) {
    await ctx.printLine("/home/guest");
  }

  async function lsCmd(args, ctx) {
    var path = "";
    for (var i = 0; i < args.length; i++) {
      if (args[i].charAt(0) !== "-") path = args[i];
    }
    if (path && path !== "." && path !== "~" && path !== "/home/guest") {
      await ctx.printLine("ls: " + clean(path, 80) + ": this guest shell only keeps four files.", "warn");
      return;
    }
    await ctx.printPre("about.txt\ngames.txt\nnow.txt\nreadme.txt");
  }

  async function catCmd(args, ctx) {
    var name = args[0] || "";
    if (!name) {
      await ctx.printLine("Usage: cat about.txt | now.txt | games.txt | readme.txt", "warn");
      return;
    }
    if (!FILES[name]) {
      await ctx.printLine("cat: " + clean(name, 80) + ": no such file", "warn");
      return;
    }
    await ctx.printPre(FILES[name]);
  }

  async function echoCmd(args, ctx) {
    await ctx.printLine(clean(ctx.rest, 400));
  }

  async function bannerCmd(args, ctx) {
    await ctx.printPre(BANNER);
  }

  async function fortuneCmd(args, ctx) {
    await ctx.printLine(FORTUNES[Math.floor(Math.random() * FORTUNES.length)]);
  }

  async function pingCmd(args, ctx) {
    var host = clean(args[0] || "jh270.com", 80) || "jh270.com";
    await ctx.printLine("PING " + host + ": 56 data bytes");
    for (var i = 1; i <= 3; i++) {
      if (ctx.stopped()) return;
      var time = 8 + ((i * 17) % 13);
      await ctx.printLine("64 bytes from " + host + ": icmp_seq=" + i + " ttl=56 time=" + time + " ms");
    }
    await ctx.printLine("");
    await ctx.printLine("Printed locally. No packet left this page.", "dim");
  }

  async function sudoCmd(args, ctx) {
    var extra = ctx.rest ? " (" + clean(ctx.rest, 80) + ")" : "";
    await ctx.printLine("guest is not in the sudoers file" + extra + ". This incident will be printed, not reported.", "warn");
  }

  var commands = [
    { name: "help", bare: true, group: "Session", summary: "List commands", usage: "help  or  /help", detail: "Groups the commands this guest shell can print.", run: help },
    { name: "theme", group: "Session", summary: "Switch light or dark", usage: "/theme [light|dark|next]", detail: "The same choice as the button at the top right. A first visit follows this device. Choosing light or dark keeps that choice.", run: themeCmd },
    { name: "clear", bare: true, group: "Session", summary: "Clear the screen", usage: "clear  or  /clear", detail: "Ctrl+L does the same.", run: clearCmd },
    { name: "history", bare: true, group: "Session", summary: "Show commands from this visit", usage: "history  or  /history", detail: "Only this page session. Nothing is stored on a server.", run: historyCmd },
    { name: "lang", group: "Session", summary: "Show the terminal language", usage: "/lang", detail: "English (United States). There is no language switch.", run: langCmd },
    { name: "date", bare: true, group: "Session", summary: "Show the local date and time", usage: "date  or  /date", detail: "Uses the clock on this device.", run: dateCmd },
    { name: "pwd", bare: true, group: "Session", summary: "Show the guest directory", usage: "pwd  or  /pwd", detail: "The directory is fictional. The shell does not touch a disk.", run: pwdCmd },
    { name: "whoami", bare: true, group: "Session", summary: "Show the guest identity", usage: "whoami  or  /whoami", detail: "You are guest@jh270.com. Jinhong270 operates the site.", run: whoamiCmd },
    { name: "neofetch", bare: true, group: "Session", summary: "Show a snapshot of this session", usage: "neofetch  or  /neofetch", detail: "Screen size, theme, and browser text from this device.", run: neofetchCmd },
    { name: "uptime", bare: true, group: "Session", summary: "Show how long this page has been open", usage: "uptime  or  /uptime", detail: "Counts from the moment the terminal loaded.", run: uptimeCmd },
    { name: "version", group: "Session", summary: "Show the terminal version", usage: "/version", detail: "jh270 terminal 1.0.", run: versionCmd },
    { name: "man", bare: true, group: "Session", summary: "Read one command", usage: "man <command>  or  /man <command>", detail: "Example: man game", run: manCmd },
    { name: "hint", group: "Session", summary: "Suggest a command", usage: "/hint", detail: "Picks one command at random.", run: hintCmd },
    { name: "credits", group: "Session", summary: "Where the data and game come from", usage: "/credits", detail: "Client-side GitHub reads and the original ECHO COURIER game.", run: creditsCmd },
    { name: "exit", bare: true, group: "Session", summary: "Return to the homepage", usage: "exit  or  /exit", detail: "Leaves /terminal and opens the homepage.", run: exitCmd },
    { name: "about", group: "Profile", summary: "Who Jinhong270 is", usage: "/about", detail: "Short introduction. The handles match on GitHub, X, and Hugging Face.", run: aboutCmd },
    { name: "now", group: "Profile", summary: "What is being built", usage: "/now", detail: "The active project is AndroidToolBox.", run: nowCmd },
    { name: "toolbox", group: "Profile", summary: "Describe AndroidToolBox", usage: "/toolbox", detail: "Android SSH toolbox for remote files and a shell.", run: toolboxCmd },
    { name: "projects", group: "Profile", summary: "List selected repositories", usage: "/projects", detail: "A short curated list. /repos is the live public list.", run: projectsCmd },
    { name: "repos", group: "Profile", summary: "List public GitHub repositories", usage: "/repos [filter]", detail: "Fetched in this browser from api.github.com.", run: reposCmd },
    { name: "stats", group: "Profile", summary: "Show GitHub counts", usage: "/stats", detail: "Repos, stars, followers, and languages.", run: statsCmd },
    { name: "repo", group: "Profile", summary: "Read one repository", usage: "/repo <name>", detail: "Example: /repo AndroidToolBox", run: repoCmd },
    { name: "contact", group: "Profile", summary: "Show GitHub, X, and Hugging Face", usage: "/contact", detail: "All three are @Jinhong270.", run: contactCmd },
    { name: "github", group: "Profile", summary: "Print the GitHub profile link", usage: "/github", detail: "https://github.com/Jinhong270", run: profileLink("https://github.com/Jinhong270", "GitHub  @Jinhong270") },
    { name: "x", group: "Profile", summary: "Print the X profile link", usage: "/x", detail: "https://x.com/Jinhong270", run: profileLink("https://x.com/Jinhong270", "X  @Jinhong270") },
    { name: "hf", group: "Profile", summary: "Print the Hugging Face profile link", usage: "/hf", detail: "https://huggingface.co/Jinhong270", run: profileLink("https://huggingface.co/Jinhong270", "Hugging Face  @Jinhong270") },
    { name: "open", group: "Profile", summary: "Print a known link", usage: "/open github | x | hf | toolbox | echo | home", detail: "Prints a link. It does not leave this page by itself.", run: openCmd },
    { name: "ls", bare: true, group: "Files", summary: "List the guest files", usage: "ls  or  /ls", detail: "about.txt, now.txt, games.txt, and readme.txt.", run: lsCmd },
    { name: "cat", bare: true, group: "Files", summary: "Print a guest file", usage: "cat <file>  or  /cat <file>", detail: "Try cat now.txt", run: catCmd },
    { name: "echo", bare: true, group: "Files", summary: "Print the text you type", usage: "echo <text>  or  /echo <text>", detail: "Prints the text back. It does not evaluate it.", run: echoCmd },
    { name: "game", group: "Play", summary: "Open ECHO COURIER", usage: "/game [echo]", detail: "Rescue signals with your 2.7-second echo. Opens /game/ in this tab; also available from the homepage repository showcase.", run: gameCmd },
    { name: "banner", group: "Play", summary: "Print the JH270 mark", usage: "/banner", detail: "A small text mark for the guest prompt.", run: bannerCmd },
    { name: "fortune", group: "Play", summary: "Print a short line", usage: "/fortune", detail: "One line, chosen on this device.", run: fortuneCmd },
    { name: "ping", bare: true, group: "Play", summary: "Pretend to ping a host", usage: "ping [host]  or  /ping [host]", detail: "The numbers are printed locally. No packet is sent.", run: pingCmd },
    { name: "sudo", bare: true, group: "Play", summary: "Ask for a permission you do not have", usage: "sudo [text]  or  /sudo [text]", detail: "guest is not in the sudoers file.", run: sudoCmd }
  ];

  window.JH270Commands = {
    list: commands,
    files: FILES,
    find: find,
    isBare: isBare
  };
})();
