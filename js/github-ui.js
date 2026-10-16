(function () {
  var mount = document.getElementById("github-mount");
  var api = window.JH270GitHub;
  if (!mount || !api) return;

  function el(tag, className, text) {
    var node = document.createElement(tag);
    if (className) node.className = className;
    if (text != null) node.textContent = text;
    return node;
  }

  function link(href, className, text) {
    var hrefSafe = api.safeHttp(href);
    if (!hrefSafe) return el("span", className, text);
    var node = el("a", className, text);
    node.href = hrefSafe;
    node.target = "_blank";
    node.rel = "noopener noreferrer";
    return node;
  }

  function skeleton() {
    mount.replaceChildren();
    mount.setAttribute("aria-busy", "true");
    var block = el("div");
    for (var i = 0; i < 6; i++) block.appendChild(el("div", "skeleton"));
    mount.appendChild(block);
  }

  function stat(value, label) {
    var node = el("div", "stat");
    node.appendChild(el("b", "", String(value)));
    node.appendChild(el("span", "", label));
    return node;
  }

  function draw(data) {
    var user = data.user;
    var repos = data.repos;
    var stars = repos.reduce(function (sum, repo) { return sum + (repo.stargazers_count || 0); }, 0);
    var languages = {};
    repos.forEach(function (repo) {
      var name = repo.language || "Other";
      languages[name] = (languages[name] || 0) + 1;
    });
    var languageNames = Object.keys(languages).sort(function (a, b) { return languages[b] - languages[a]; });
    var maxLang = languageNames.reduce(function (max, name) { return Math.max(max, languages[name]); }, 1);
    var active = "All";
    var query = "";

    mount.replaceChildren();
    mount.removeAttribute("aria-busy");

    var profile = el("div", "profile-row");
    var avatar = document.createElement("img");
    avatar.alt = "";
    avatar.width = 54;
    avatar.height = 54;
    var avatarUrl = api.safeHttp(user.avatar_url);
    if (avatarUrl) avatar.src = avatarUrl;
    profile.appendChild(avatar);
    var who = el("div");
    who.appendChild(el("strong", "", user.name || user.login || api.USER));
    var whoLine = el("p");
    whoLine.appendChild(link(user.html_url, "", "github.com/" + (user.login || api.USER)));
    who.appendChild(whoLine);
    profile.appendChild(who);
    mount.appendChild(profile);

    var numbers = el("div", "stat-grid");
    numbers.appendChild(stat(user.public_repos || repos.length, "Repos"));
    numbers.appendChild(stat(stars, "Stars"));
    numbers.appendChild(stat(user.followers || 0, "Followers"));
    numbers.appendChild(stat(user.following || 0, "Following"));
    var joined = stat(api.formatDate(user.created_at), "Joined");
    joined.classList.add("stat-wide");
    numbers.appendChild(joined);
    mount.appendChild(numbers);

    if (languageNames.length) {
      var bars = el("div", "bars");
      languageNames.forEach(function (name) {
        var row = el("div", "bar-row");
        row.appendChild(el("span", "", name));
        var track = el("span", "track");
        var fill = document.createElement("i");
        fill.style.width = Math.max(8, Math.round((languages[name] / maxLang) * 100)) + "%";
        track.appendChild(fill);
        row.appendChild(track);
        row.appendChild(el("span", "", String(languages[name])));
        bars.appendChild(row);
      });
      mount.appendChild(bars);
    }

    var tools = el("div", "tools");
    var search = document.createElement("input");
    search.type = "search";
    search.placeholder = "Filter repositories";
    search.setAttribute("aria-label", "Filter repositories");
    tools.appendChild(search);
    var filters = ["All"].concat(languageNames);
    var buttons = [];
    filters.forEach(function (name) {
      var button = el("button", "", name);
      button.type = "button";
      button.setAttribute("aria-pressed", name === active ? "true" : "false");
      button.addEventListener("click", function () {
        active = name;
        buttons.forEach(function (item) {
          item.setAttribute("aria-pressed", item.textContent === active ? "true" : "false");
        });
        renderRepos();
      });
      buttons.push(button);
      tools.appendChild(button);
    });
    mount.appendChild(tools);

    var grid = el("div", "repo-grid");
    var empty = el("p", "note", "No repository matches.");
    empty.hidden = true;
    mount.appendChild(grid);
    mount.appendChild(empty);

    var latest = repos[0];
    var foot = el("p", "note");
    var footText = "Read in this browser";
    if (data.readAt) {
      footText += " at " + data.readAt.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
    }
    if (latest) footText += ". Latest push: " + latest.name + ", " + api.relativeTime(latest.pushed_at) + ".";
    foot.textContent = footText;
    mount.appendChild(foot);

    function renderRepos() {
      var needle = query.trim().toLowerCase();
      grid.replaceChildren();
      var shown = 0;
      repos.forEach(function (repo) {
        var language = repo.language || "Other";
        if (active !== "All" && language !== active) return;
        var about = api.blurb(repo);
        var hay = (repo.name + " " + about + " " + language).toLowerCase();
        if (needle && hay.indexOf(needle) === -1) return;
        var card = link(repo.html_url, "repo", "");
        card.textContent = "";
        var top = el("div", "repo-top");
        top.appendChild(el("h3", "", repo.name));
        top.appendChild(el("span", "lang", language));
        card.appendChild(top);
        card.appendChild(el("p", "", about));
        var meta = el("div", "repo-foot");
        var bits = [];
        bits.push((repo.stargazers_count || 0) + " stars");
        bits.push((repo.forks_count || 0) + " forks");
        if (repo.fork) bits.push("fork");
        if (repo.archived) bits.push("archived");
        if (repo.license && repo.license.spdx_id && repo.license.spdx_id !== "NOASSERTION") bits.push(repo.license.spdx_id);
        meta.appendChild(el("span", "", bits.join(" · ")));
        meta.appendChild(el("span", "", api.relativeTime(repo.pushed_at)));
        card.appendChild(meta);
        grid.appendChild(card);
        shown += 1;
      });
      empty.hidden = shown !== 0;
    }

    search.addEventListener("input", function () {
      query = search.value;
      renderRepos();
    });
    renderRepos();
  }

  function fail(err) {
    mount.replaceChildren();
    mount.removeAttribute("aria-busy");
    var message = err && err.name === "AbortError" ? "GitHub took too long to answer." : (err && err.message ? err.message : "GitHub could not be read.");
    var node = el("p", "error", message + " ");
    node.appendChild(link("https://github.com/" + api.USER, "", "Open the profile on GitHub."));
    mount.appendChild(node);
  }

  skeleton();
  api.loadProfile().then(draw).catch(fail);
})();
