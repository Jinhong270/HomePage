(function () {
  var JH_mount = document.getElementById("github-mount");
  var JH_api = window.JH270GitHub;
  if (!JH_mount || !JH_api) return;

  function JH_el(JH_tag, JH_className, JH_text) {
    var JH_node = document.createElement(JH_tag);
    if (JH_className) JH_node.className = JH_className;
    if (JH_text != null) JH_node.textContent = JH_text;
    return JH_node;
  }

  function JH_link(JH_href, JH_className, JH_text) {
    var JH_hrefSafe = JH_api.safeHttp(JH_href);
    if (!JH_hrefSafe) return JH_el("span", JH_className, JH_text);
    var JH_node = JH_el("a", JH_className, JH_text);
    JH_node.href = JH_hrefSafe;
    JH_node.target = "_blank";
    JH_node.rel = "noopener noreferrer";
    return JH_node;
  }

  function JH_skeleton() {
    JH_mount.replaceChildren();
    JH_mount.setAttribute("aria-busy", "true");
    var JH_block = JH_el("div");
    for (var JH_i = 0; JH_i < 6; JH_i++) JH_block.appendChild(JH_el("div", "skeleton"));
    JH_mount.appendChild(JH_block);
  }

  function JH_stat(JH_value, JH_label) {
    var JH_node = JH_el("div", "stat");
    JH_node.appendChild(JH_el("b", "", String(JH_value)));
    JH_node.appendChild(JH_el("span", "", JH_label));
    return JH_node;
  }

  function JH_draw(JH_data) {
    var JH_user = JH_data.user;
    var JH_repos = JH_data.repos;
    var JH_stars = JH_repos.reduce(function (JH_sum, JH_repo) { return JH_sum + (JH_repo.stargazers_count || 0); }, 0);
    var JH_languages = {};
    JH_repos.forEach(function (JH_repo) {
      var JH_name = JH_repo.language || "Other";
      JH_languages[JH_name] = (JH_languages[JH_name] || 0) + 1;
    });
    var JH_languageNames = Object.keys(JH_languages).sort(function (JH_a, JH_b) { return JH_languages[JH_b] - JH_languages[JH_a]; });
    var JH_maxLang = JH_languageNames.reduce(function (JH_max, JH_name) { return Math.max(JH_max, JH_languages[JH_name]); }, 1);
    var JH_active = "All";
    var JH_query = "";

    JH_mount.replaceChildren();
    JH_mount.removeAttribute("aria-busy");

    var JH_profile = JH_el("div", "profile-row");
    var JH_avatar = document.createElement("img");
    JH_avatar.alt = "";
    JH_avatar.width = 54;
    JH_avatar.height = 54;
    var JH_avatarUrl = JH_api.safeHttp(JH_user.avatar_url);
    if (JH_avatarUrl) JH_avatar.src = JH_avatarUrl;
    JH_profile.appendChild(JH_avatar);
    var JH_who = JH_el("div");
    JH_who.appendChild(JH_el("strong", "", JH_user.name || JH_user.login || JH_api.USER));
    var JH_whoLine = JH_el("p");
    JH_whoLine.appendChild(JH_link(JH_user.html_url, "", "github.com/" + (JH_user.login || JH_api.USER)));
    JH_who.appendChild(JH_whoLine);
    JH_profile.appendChild(JH_who);
    JH_mount.appendChild(JH_profile);

    var JH_numbers = JH_el("div", "stat-grid");
    JH_numbers.appendChild(JH_stat(JH_user.public_repos || JH_repos.length, "Repos"));
    JH_numbers.appendChild(JH_stat(JH_stars, "Stars"));
    JH_numbers.appendChild(JH_stat(JH_user.followers || 0, "Followers"));
    JH_numbers.appendChild(JH_stat(JH_user.following || 0, "Following"));
    var JH_joined = JH_stat(JH_api.formatDate(JH_user.created_at), "Joined");
    JH_joined.classList.add("stat-wide");
    JH_numbers.appendChild(JH_joined);
    JH_mount.appendChild(JH_numbers);

    if (JH_languageNames.length) {
      var JH_bars = JH_el("div", "bars");
      JH_languageNames.forEach(function (JH_name) {
        var JH_row = JH_el("div", "bar-row");
        JH_row.appendChild(JH_el("span", "", JH_name));
        var JH_track = JH_el("span", "track");
        var JH_fill = document.createElement("i");
        JH_fill.style.width = Math.max(8, Math.round((JH_languages[JH_name] / JH_maxLang) * 100)) + "%";
        JH_track.appendChild(JH_fill);
        JH_row.appendChild(JH_track);
        JH_row.appendChild(JH_el("span", "", String(JH_languages[JH_name])));
        JH_bars.appendChild(JH_row);
      });
      JH_mount.appendChild(JH_bars);
    }

    var JH_tools = JH_el("div", "tools");
    var JH_search = document.createElement("input");
    JH_search.type = "search";
    JH_search.placeholder = "Filter repositories";
    JH_search.setAttribute("aria-label", "Filter repositories");
    JH_tools.appendChild(JH_search);
    var JH_filters = ["All"].concat(JH_languageNames);
    var JH_buttons = [];
    JH_filters.forEach(function (JH_name) {
      var JH_button = JH_el("button", "", JH_name);
      JH_button.type = "button";
      JH_button.setAttribute("aria-pressed", JH_name === JH_active ? "true" : "false");
      JH_button.addEventListener("click", function () {
        JH_active = JH_name;
        JH_buttons.forEach(function (JH_item) {
          JH_item.setAttribute("aria-pressed", JH_item.textContent === JH_active ? "true" : "false");
        });
        JH_renderRepos();
      });
      JH_buttons.push(JH_button);
      JH_tools.appendChild(JH_button);
    });
    JH_mount.appendChild(JH_tools);

    var JH_grid = JH_el("div", "repo-grid");
    var JH_empty = JH_el("p", "note", "No repository matches.");
    JH_empty.hidden = true;
    JH_mount.appendChild(JH_grid);
    JH_mount.appendChild(JH_empty);

    var JH_latest = JH_repos[0];
    var JH_foot = JH_el("p", "note");
    var JH_footText = "Read in this browser";
    if (JH_data.readAt) {
      JH_footText += " at " + JH_data.readAt.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
    }
    if (JH_latest) JH_footText += ". Latest push: " + JH_latest.name + ", " + JH_api.relativeTime(JH_latest.pushed_at) + ".";
    JH_foot.textContent = JH_footText;
    JH_mount.appendChild(JH_foot);

    function JH_renderRepos() {
      var JH_needle = JH_query.trim().toLowerCase();
      JH_grid.replaceChildren();
      var JH_shown = 0;
      JH_repos.forEach(function (JH_repo) {
        var JH_language = JH_repo.language || "Other";
        if (JH_active !== "All" && JH_language !== JH_active) return;
        var JH_about = JH_api.blurb(JH_repo);
        var JH_hay = (JH_repo.name + " " + JH_about + " " + JH_language).toLowerCase();
        if (JH_needle && JH_hay.indexOf(JH_needle) === -1) return;
        var JH_card = JH_link(JH_repo.html_url, "repo", "");
        JH_card.textContent = "";
        var JH_top = JH_el("div", "repo-top");
        JH_top.appendChild(JH_el("h3", "", JH_repo.name));
        JH_top.appendChild(JH_el("span", "lang", JH_language));
        JH_card.appendChild(JH_top);
        JH_card.appendChild(JH_el("p", "", JH_about));
        var JH_meta = JH_el("div", "repo-foot");
        var JH_bits = [];
        JH_bits.push((JH_repo.stargazers_count || 0) + " stars");
        JH_bits.push((JH_repo.forks_count || 0) + " forks");
        if (JH_repo.fork) JH_bits.push("fork");
        if (JH_repo.archived) JH_bits.push("archived");
        if (JH_repo.license && JH_repo.license.spdx_id && JH_repo.license.spdx_id !== "NOASSERTION") JH_bits.push(JH_repo.license.spdx_id);
        JH_meta.appendChild(JH_el("span", "", JH_bits.join(" · ")));
        JH_meta.appendChild(JH_el("span", "", JH_api.relativeTime(JH_repo.pushed_at)));
        JH_card.appendChild(JH_meta);
        JH_grid.appendChild(JH_card);
        JH_shown += 1;
      });
      JH_empty.hidden = JH_shown !== 0;
    }

    JH_search.addEventListener("input", function () {
      JH_query = JH_search.value;
      JH_renderRepos();
    });
    JH_renderRepos();
  }

  function JH_fail(JH_err) {
    JH_mount.replaceChildren();
    JH_mount.removeAttribute("aria-busy");
    var JH_message = JH_err && JH_err.name === "AbortError" ? "GitHub took too long to answer." : (JH_err && JH_err.message ? JH_err.message : "GitHub could not be read.");
    var JH_node = JH_el("p", "error", JH_message + " ");
    JH_node.appendChild(JH_link("https://github.com/" + JH_api.USER, "", "Open the profile on GitHub."));
    JH_mount.appendChild(JH_node);
  }

  JH_skeleton();
  JH_api.loadProfile().then(JH_draw).catch(JH_fail);
})();
