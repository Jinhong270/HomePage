(function () {
  var mount = document.getElementById("repo-mount");
  var api = window.JH270GitHub;
  if (!mount || !api) return;

  var MARK = "M8 0c4.42 0 8 3.58 8 8a8.013 8.013 0 0 1-5.45 7.59c-.4.08-.55-.17-.55-.38 0-.27.01-1.13.01-2.2 0-.75-.25-1.23-.54-1.48 1.78-.2 3.65-.88 3.65-3.95 0-.88-.31-1.59-.82-2.15.08-.2.36-1.02-.08-2.12 0 0-.67-.22-2.2.82-.64-.18-1.32-.27-2-.27-.68 0-1.36.09-2 .27-1.53-1.03-2.2-.82-2.2-.82-.44 1.1-.16 1.92-.08 2.12-.51.56-.82 1.28-.82 2.15 0 3.06 1.86 3.75 3.64 3.95-.23.2-.44.55-.51 1.07-.46.21-1.61.55-2.33-.66-.15-.24-.6-.83-1.23-.82-.67.01-.27.38.01.53.34.19.73.9.82 1.13.16.45.68 1.31 2.69.94 0 .67.01 1.3.01 1.49 0 .21-.15.45-.55.38A7.995 7.995 0 0 1 0 8c0-4.42 3.58-8 8-8Z";
  var ITEM = /^(\s*)([-*+]|\d+[.)])\s+(.*)$/;
  var MAX_LINES = 1500;
  var OPEN_FILES = 5;
  var seq = 0;
  var shown = false;

  function el(tag, className, text) {
    var node = document.createElement(tag);
    if (className) node.className = className;
    if (text != null) node.textContent = text;
    return node;
  }

  function ext(href, className, text) {
    var safe = api.safeHttp(href);
    if (!safe) return el("span", className, text);
    var node = el("a", className, text);
    node.href = safe;
    node.target = "_blank";
    node.rel = "noopener noreferrer";
    return node;
  }

  function nav(href, className, text) {
    var node = el("a", className, text);
    node.href = href;
    node.setAttribute("data-nav", "");
    return node;
  }

  function to(name, extra) {
    return "?name=" + encodeURIComponent(name) + (extra ? "&" + extra : "");
  }

  function mark() {
    var ns = "http://www.w3.org/2000/svg";
    var svg = document.createElementNS(ns, "svg");
    svg.setAttribute("viewBox", "0 0 16 16");
    svg.setAttribute("width", "18");
    svg.setAttribute("height", "18");
    svg.setAttribute("aria-hidden", "true");
    var path = document.createElementNS(ns, "path");
    path.setAttribute("d", MARK);
    path.setAttribute("fill", "currentColor");
    svg.appendChild(path);
    return svg;
  }

  function size(kb) {
    return kb < 1024 ? kb + " KB" : (kb / 1024).toFixed(1) + " MB";
  }

  function when(iso) {
    var date = new Date(iso);
    if (!isFinite(date.getTime())) return "";
    return date.toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" });
  }

  function reason(err, missing) {
    if (err && err.status === 404 && missing) return missing;
    if (err && err.name === "AbortError") return "GitHub took too long to answer.";
    return err && err.message ? err.message : "GitHub could not be read.";
  }

  function bases(data) {
    var branch = encodeURI(data.default_branch || "main");
    return {
      raw: "https://raw.githubusercontent.com/" + api.USER + "/" + encodeURIComponent(data.name) + "/" + branch + "/",
      blob: data.html_url + "/blob/" + branch + "/"
    };
  }

  function resolve(href, base) {
    try {
      return api.safeHttp(new URL(href, base).href);
    } catch (err) {
      return "";
    }
  }

  function picture(src, alt, base) {
    var url = resolve(src, base.raw);
    if (!url) return document.createTextNode(alt || "");
    var img = document.createElement("img");
    img.src = url;
    img.alt = alt || "";
    img.loading = "lazy";
    img.referrerPolicy = "no-referrer";
    return img;
  }

  function inline(parent, text, base) {
    var re = /`([^`]+)`|!\[([^\]]*)\]\(((?:[^()\s]|\([^()\s]*\))+)[^)]*\)|\[((?:[^\[\]]|!\[[^\]]*\]\((?:[^()]|\([^()]*\))*\))*)\]\(((?:[^()\s]|\([^()\s]*\))+)[^)]*\)|\*\*([^*]+)\*\*|\*([^*\s][^*]*)\*|<(https?:[^>\s]+)>|(<img\s[^>]*>)|<\/?[A-Za-z][^>]*>/g;
    var last = 0;
    var m;
    while ((m = re.exec(text))) {
      if (m.index > last) parent.appendChild(document.createTextNode(text.slice(last, m.index)));
      last = re.lastIndex;
      if (m[1] != null) {
        parent.appendChild(el("code", "", m[1]));
      } else if (m[3] != null) {
        parent.appendChild(picture(m[3], m[2], base));
      } else if (m[5] != null) {
        var href = m[5].charAt(0) === "#" ? "" : resolve(m[5], base.blob);
        var a = href ? ext(href, "", "") : el("span");
        inline(a, m[4], base);
        parent.appendChild(a);
      } else if (m[6] != null) {
        var strong = el("strong");
        inline(strong, m[6], base);
        parent.appendChild(strong);
      } else if (m[7] != null) {
        var em = el("em");
        inline(em, m[7], base);
        parent.appendChild(em);
      } else if (m[8] != null) {
        parent.appendChild(ext(m[8], "", m[8]));
      } else if (m[9] != null) {
        var tagSrc = /\ssrc\s*=\s*["']([^"']+)["']/i.exec(m[9]);
        var tagAlt = /\salt\s*=\s*["']([^"']*)["']/i.exec(m[9]);
        if (tagSrc) parent.appendChild(picture(tagSrc[1], tagAlt ? tagAlt[1] : "", base));
      }
    }
    if (last < text.length) parent.appendChild(document.createTextNode(text.slice(last)));
  }

  function listNode(items, ordered, start, base) {
    var list = el(ordered ? "ol" : "ul");
    if (ordered && start && start !== "1") list.setAttribute("start", start);
    items.forEach(function (item) {
      var li = el("li");
      if (item.indent) li.style.marginLeft = Math.min(3, Math.floor(item.indent / 2)) * 1.2 + "rem";
      inline(li, item.text, base);
      list.appendChild(li);
    });
    return list;
  }

  function markdown(source, base) {
    var root = el("div", "md");
    var lines = source.replace(/<!-{2}[\s\S]*?-{2}>/g, "").replace(/\r\n?/g, "\n").split("\n");
    var para = [];
    var i = 0;

    function flush() {
      if (!para.length) return;
      var p = el("p");
      inline(p, para.join(" "), base);
      root.appendChild(p);
      para = [];
    }

    while (i < lines.length) {
      var line = lines[i];
      var m;
      if (/^\s*(```|~~~)/.test(line)) {
        flush();
        var fence = line.trim().slice(0, 3);
        var code = [];
        i += 1;
        while (i < lines.length && lines[i].trim().indexOf(fence) !== 0) {
          code.push(lines[i]);
          i += 1;
        }
        var pre = el("pre");
        pre.appendChild(el("code", "", code.join("\n")));
        root.appendChild(pre);
      } else if (!line.trim()) {
        flush();
      } else if ((m = /^(#{1,6})\s+(.*?)\s*#*\s*$/.exec(line))) {
        flush();
        var h = el("h" + Math.min(6, m[1].length + 2));
        inline(h, m[2], base);
        root.appendChild(h);
      } else if (/^\s*([-*_])(\s*\1){2,}\s*$/.test(line)) {
        flush();
        root.appendChild(el("hr"));
      } else if (/^\s*>/.test(line)) {
        flush();
        var quote = [];
        while (i < lines.length && /^\s*>/.test(lines[i])) {
          quote.push(lines[i].replace(/^\s*>\s?/, ""));
          i += 1;
        }
        i -= 1;
        var bq = el("blockquote");
        var bp = el("p");
        inline(bp, quote.join(" "), base);
        bq.appendChild(bp);
        root.appendChild(bq);
      } else if (ITEM.test(line)) {
        flush();
        var items = [];
        var first = /^\s*(\d+)[.)]/.exec(line);
        var top = ITEM.exec(line)[1].length;
        while (i < lines.length) {
          var row = lines[i];
          var b = ITEM.exec(row);
          if (b) {
            if (b[1].length <= top && /^\d/.test(b[2]) !== Boolean(first)) break;
            items.push({ indent: b[1].length, text: b[3] });
          } else if (row.trim() && /^\s/.test(row) && items.length) {
            items[items.length - 1].text += " " + row.trim();
          } else if (!(row.trim() === "" && ITEM.test(lines[i + 1] || ""))) {
            break;
          }
          i += 1;
        }
        i -= 1;
        root.appendChild(listNode(items, Boolean(first), first ? first[1] : "", base));
      } else if (/^\s*\|/.test(line)) {
        flush();
        var rows = [];
        while (i < lines.length && /^\s*\|/.test(lines[i])) {
          rows.push(lines[i].trim());
          i += 1;
        }
        i -= 1;
        var table = el("pre");
        table.appendChild(el("code", "", rows.join("\n")));
        root.appendChild(table);
      } else {
        para.push(line.trim());
      }
      i += 1;
    }
    flush();
    return root;
  }

  function patch(text) {
    var box = el("div");
    var pre = el("pre", "diff");
    var code = el("code", "diff-lines");
    var lines = text.split("\n");
    var count = Math.min(lines.length, MAX_LINES);
    for (var i = 0; i < count; i++) {
      var line = lines[i];
      var lead = line.charAt(0);
      var kind = lead === "+" ? "d-add" : lead === "-" ? "d-del" : lead === "@" ? "d-hunk" : "";
      code.appendChild(el("span", kind, line || " "));
    }
    pre.appendChild(code);
    box.appendChild(pre);
    if (lines.length > count) {
      box.appendChild(el("p", "diff-note", (lines.length - count) + " more lines are not shown here."));
    }
    return box;
  }

  function fileNode(file, open) {
    var box = el("details", "file");
    var summary = el("summary");
    var label = file.previous_filename ? file.previous_filename + " → " + file.filename : file.filename;
    summary.appendChild(el("span", "status", file.status || "changed"));
    summary.appendChild(el("span", "name", label));
    summary.appendChild(el("span", "plus", "+" + (file.additions || 0)));
    summary.appendChild(el("span", "minus", "−" + (file.deletions || 0)));
    box.appendChild(summary);
    var body = el("div");
    box.appendChild(body);

    function fill() {
      if (body.firstChild) return;
      if (file.patch) body.appendChild(patch(file.patch));
      else body.appendChild(el("p", "diff-note", "No text diff is available for this file. It may be binary, only renamed, or too large."));
    }

    box.addEventListener("toggle", function () {
      if (box.open) fill();
    });
    if (open) {
      box.open = true;
      fill();
    }
    return box;
  }

  function stat(value, label, wide) {
    var node = el("div", wide ? "stat stat-wide" : "stat");
    node.appendChild(el("b", "", String(value)));
    node.appendChild(el("span", "", label));
    return node;
  }

  function panel(title) {
    var box = el("section", "panel");
    box.appendChild(el("h2", "", title));
    return box;
  }

  function waiting(parent) {
    var block = el("div");
    for (var i = 0; i < 3; i++) block.appendChild(el("div", "skeleton"));
    parent.appendChild(block);
    return block;
  }

  function notice(parent, message, tone) {
    var node = el("p", tone, message);
    parent.appendChild(node);
    return node;
  }

  function stop(message) {
    mount.replaceChildren();
    mount.removeAttribute("aria-busy");
    document.title = "Repository — Jinhong270";
    var node = el("p", "error", message + " ");
    node.appendChild(ext("https://github.com/" + api.USER, "", "Open the profile on GitHub."));
    mount.appendChild(node);
    var back = el("p", "note");
    var home = el("a", "", "Back to the public record");
    home.href = "../#github";
    back.appendChild(home);
    mount.appendChild(back);
  }

  function current(text) {
    var node = el("span", "", text);
    node.setAttribute("aria-current", "page");
    return node;
  }

  function frame(data, view, sha) {
    var root = document.createDocumentFragment();
    var name = data.name;

    var home = el("a", "", "Public record");
    home.href = "../#github";
    var trail = [home];
    if (view === "overview") {
      trail.push(current(name));
    } else {
      trail.push(nav(to(name), "", name));
      if (view === "commits") {
        trail.push(current("Commits"));
      } else {
        trail.push(nav(to(name, "view=commits"), "", "Commits"));
        trail.push(current(sha.slice(0, 7).toLowerCase()));
      }
    }
    var crumbs = el("nav", "crumbs");
    crumbs.setAttribute("aria-label", "Breadcrumb");
    trail.forEach(function (part, index) {
      if (index) {
        var gap = el("span", "", "/");
        gap.setAttribute("aria-hidden", "true");
        crumbs.appendChild(gap);
      }
      crumbs.appendChild(part);
    });
    root.appendChild(crumbs);

    var head = el("header", "repo-head");
    var title = el("h1", "", name);
    title.tabIndex = -1;
    head.appendChild(title);
    var gh = ext(data.html_url, "gh-link", "");
    gh.appendChild(mark());
    gh.appendChild(document.createTextNode(data.full_name || api.USER + "/" + name));
    head.appendChild(gh);
    head.appendChild(el("p", "repo-about", api.blurb(data)));

    var chips = el("ul", "chips");
    var tags = [];
    if (data.language) tags.push(data.language);
    if (data.license && data.license.spdx_id && data.license.spdx_id !== "NOASSERTION") tags.push(data.license.spdx_id);
    if (data.fork) tags.push("fork");
    if (data.archived) tags.push("archived");
    (data.topics || []).forEach(function (topic) { tags.push(topic); });
    tags.forEach(function (tag) { chips.appendChild(el("li", "", tag)); });
    if (data.homepage) {
      var site = el("li");
      site.appendChild(ext(data.homepage, "", String(data.homepage).replace(/^https?:\/\//, "")));
      chips.appendChild(site);
    }
    if (chips.children.length) head.appendChild(chips);
    root.appendChild(head);

    var tabs = el("nav", "tabs");
    tabs.setAttribute("aria-label", "Repository");
    var overviewTab = nav(to(name), "", "Overview");
    var commitsTab = nav(to(name, "view=commits"), "", "Commits");
    (view === "overview" ? overviewTab : commitsTab).setAttribute("aria-current", "page");
    tabs.appendChild(overviewTab);
    tabs.appendChild(commitsTab);
    root.appendChild(tabs);

    var body = el("div", "repo-body");
    root.appendChild(body);
    return { root: root, body: body, title: title };
  }

  function overview(data, body, token) {
    var facts = el("div", "facts");
    var watchers = data.subscribers_count != null ? data.subscribers_count : data.watchers_count;
    facts.appendChild(stat(data.stargazers_count || 0, "Stars"));
    facts.appendChild(stat(data.forks_count || 0, "Forks"));
    facts.appendChild(stat(watchers || 0, "Watchers"));
    facts.appendChild(stat(data.open_issues_count || 0, "Open issues"));
    facts.appendChild(stat(size(data.size || 0), "Size"));
    facts.appendChild(stat(data.default_branch || "—", "Default branch", true));
    facts.appendChild(stat(api.formatDate(data.created_at), "Created", true));
    facts.appendChild(stat(api.relativeTime(data.pushed_at), "Last push", true));
    body.appendChild(facts);

    var langs = panel("Languages");
    var langWait = waiting(langs);
    body.appendChild(langs);
    api.loadLanguages(data.name).then(function (map) {
      if (token !== seq) return;
      langWait.remove();
      var names = Object.keys(map).sort(function (a, b) { return map[b] - map[a]; });
      if (!names.length) {
        langs.remove();
        return;
      }
      var total = names.reduce(function (sum, name) { return sum + map[name]; }, 0);
      var bars = el("div", "bars");
      names.forEach(function (name) {
        var share = map[name] / total * 100;
        var row = el("div", "bar-row");
        row.appendChild(el("span", "", name));
        var track = el("span", "track");
        var fill = document.createElement("i");
        fill.style.width = Math.max(2, Math.round(share)) + "%";
        track.appendChild(fill);
        row.appendChild(track);
        row.appendChild(el("span", "", share.toFixed(1) + "%"));
        bars.appendChild(row);
      });
      langs.appendChild(bars);
    }).catch(function (err) {
      if (token !== seq) return;
      langWait.remove();
      notice(langs, reason(err), "error");
    });

    var docs = panel("README");
    var docWait = waiting(docs);
    body.appendChild(docs);
    api.loadReadme(data.name).then(function (file) {
      if (token !== seq) return;
      docWait.remove();
      if (!file) {
        notice(docs, "This repository has no README.", "note");
        return;
      }
      docs.firstChild.textContent = file.name || "README";
      docs.appendChild(markdown(file.text, bases(data)));
    }).catch(function (err) {
      if (token !== seq) return;
      docWait.remove();
      notice(docs, reason(err), "error");
    });
  }

  function commitRow(name, item) {
    var li = el("li");
    var link = nav(to(name, "commit=" + item.sha), "commit", "");
    var info = item.commit || {};
    var who = info.author || {};
    var first = String(info.message || "").split("\n")[0].trim() || "(no message)";
    link.appendChild(el("strong", "", first));
    link.appendChild(el("code", "sha", item.sha.slice(0, 7)));
    var line = el("small", "", [who.name || "Unknown author", api.relativeTime(who.date)].filter(Boolean).join(" · "));
    if (who.date) line.title = when(who.date);
    link.appendChild(line);
    li.appendChild(link);
    return li;
  }

  function commitList(data, body, token) {
    var list = el("ol", "commits");
    var more = el("button", "btn more", "Load older commits");
    more.type = "button";
    more.hidden = true;
    var wait = waiting(body);
    var problem = null;
    var page = 0;
    body.appendChild(list);
    body.appendChild(more);

    function next() {
      if (problem) {
        problem.remove();
        problem = null;
      }
      page += 1;
      more.disabled = true;
      more.textContent = "Loading…";
      api.loadCommits(data.name, page).then(function (items) {
        if (token !== seq) return;
        wait.remove();
        items.forEach(function (item) { list.appendChild(commitRow(data.name, item)); });
        if (!list.children.length) problem = notice(body, "No commits yet.", "note");
        more.hidden = items.length < api.PAGE;
        more.disabled = false;
        more.textContent = "Load older commits";
      }).catch(function (err) {
        if (token !== seq) return;
        wait.remove();
        page -= 1;
        if (err && err.status === 409) {
          problem = notice(body, "This repository has no commits yet.", "note");
          return;
        }
        problem = notice(body, reason(err), "error");
        more.hidden = false;
        more.disabled = false;
        more.textContent = "Try again";
      });
    }

    more.addEventListener("click", next);
    next();
  }

  function commitView(data, c) {
    var frag = document.createDocumentFragment();
    var info = c.commit || {};
    var message = String(info.message || "").replace(/\r\n?/g, "\n");
    var cut = message.indexOf("\n");
    var title = (cut === -1 ? message : message.slice(0, cut)).trim() || "(no message)";
    var rest = cut === -1 ? "" : message.slice(cut + 1).trim();

    var head = el("section", "panel commit-head");
    head.appendChild(el("h2", "", title));
    if (rest) head.appendChild(el("pre", "msg", rest));
    var meta = el("ul", "meta-list");
    var author = info.author || {};
    var committer = info.committer || {};
    var stamp = [when(author.date), api.relativeTime(author.date)].filter(Boolean);
    meta.appendChild(el("li", "", "Authored by " + (author.name || "an unknown author") + (stamp.length ? " on " + stamp[0] : "") + (stamp.length > 1 ? " (" + stamp[1] + ")" : "")));
    if (committer.name && committer.name !== author.name) {
      meta.appendChild(el("li", "", "Committed by " + committer.name + (committer.date ? " on " + when(committer.date) : "")));
    }
    var idLine = el("li", "", "Commit ");
    idLine.appendChild(el("code", "", c.sha));
    meta.appendChild(idLine);
    var parents = c.parents || [];
    if (parents.length) {
      var parentLine = el("li", "", parents.length === 1 ? "Parent " : "Parents ");
      parents.forEach(function (parent, index) {
        if (index) parentLine.appendChild(document.createTextNode(", "));
        parentLine.appendChild(nav(to(data.name, "commit=" + parent.sha), "sha", parent.sha.slice(0, 7)));
      });
      meta.appendChild(parentLine);
    }
    if (info.verification && info.verification.verified) meta.appendChild(el("li", "", "Signature verified by GitHub"));
    head.appendChild(meta);
    frag.appendChild(head);

    var files = c.files || [];
    var stats = c.stats || {};
    var box = el("section", "files");
    var top = el("div", "files-head");
    top.appendChild(el("strong", "", files.length + (files.length === 1 ? " file changed" : " files changed")));
    var totals = el("span");
    totals.appendChild(el("span", "plus", "+" + (stats.additions || 0)));
    totals.appendChild(el("span", "minus", "−" + (stats.deletions || 0)));
    top.appendChild(totals);
    box.appendChild(top);
    if (!files.length) box.appendChild(el("p", "diff-note", "No file changes are listed for this commit."));
    files.forEach(function (file, index) {
      box.appendChild(fileNode(file, index < OPEN_FILES));
    });
    if (files.length >= 300) box.appendChild(el("p", "diff-note", "GitHub lists at most 300 files for one commit."));
    frag.appendChild(box);
    return { root: frag, title: title };
  }

  function commitDetail(data, sha, body, token) {
    var wait = waiting(body);
    api.loadCommit(data.name, sha).then(function (c) {
      if (token !== seq) return;
      wait.remove();
      var view = commitView(data, c);
      body.appendChild(view.root);
      document.title = view.title + " · " + data.name + " — Jinhong270";
    }).catch(function (err) {
      if (token !== seq) return;
      wait.remove();
      var node = notice(body, reason(err, "That commit was not found in " + data.name + ".") + " ", "error");
      node.appendChild(nav(to(data.name, "view=commits"), "", "Back to the commits."));
    });
  }

  async function show() {
    var token = ++seq;
    var params = new URLSearchParams(window.location.search);
    var name = params.get("name") || "";
    var sha = params.get("commit") || "";
    var view = sha ? "commit" : params.get("view") === "commits" ? "commits" : "overview";

    if (!/^[A-Za-z0-9._-]+$/.test(name) || name === "." || name === "..") {
      stop("Choose a repository from the public record.");
      return;
    }
    if (sha && !/^[0-9a-f]{4,40}$/i.test(sha)) {
      stop("That commit id is not valid.");
      return;
    }

    mount.replaceChildren();
    mount.setAttribute("aria-busy", "true");
    waiting(mount);

    var data;
    try {
      data = await api.loadRepo(name);
    } catch (err) {
      if (token === seq) stop(reason(err, "No public repository is named " + name + "."));
      return;
    }
    if (token !== seq) return;

    var shell = frame(data, view, sha);
    mount.replaceChildren(shell.root);
    mount.removeAttribute("aria-busy");
    document.title = (view === "commits" ? "Commits · " : "") + data.name + " — Jinhong270";
    window.scrollTo(0, 0);
    if (shown) shell.title.focus({ preventScroll: true });
    shown = true;

    if (view === "overview") overview(data, shell.body, token);
    else if (view === "commits") commitList(data, shell.body, token);
    else commitDetail(data, sha, shell.body, token);
  }

  document.addEventListener("click", function (event) {
    if (event.defaultPrevented || event.button !== 0) return;
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    var anchor = event.target.closest("a[data-nav]");
    if (!anchor) return;
    event.preventDefault();
    var target = anchor.getAttribute("href");
    if (new URL(target, window.location.href).href === window.location.href) return;
    window.history.pushState(null, "", target);
    show();
  });

  window.addEventListener("popstate", show);
  show();
})();
