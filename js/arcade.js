(function () {
  var base = new URL("../", document.currentScript.src);
  var dialog;
  var surface;
  var body;
  var fullButton;
  var game = null;
  var opener = null;
  var overflow = "";
  var generation = 0;
  var assets = {};
  var active = false;
  var loading = null;

  function element(tag, className, text) {
    var node = document.createElement(tag);
    node.className = className || "";
    if (text) node.textContent = text;
    return node;
  }

  function asset(path, style) {
    if (assets[path]) return assets[path];
    assets[path] = new Promise(function (resolve, reject) {
      var node = document.createElement(style ? "link" : "script");
      var settled = false;
      var timer = window.setTimeout(function () { finish(new Error("Loading took too long. Please try again.")); }, 15000);
      function finish(error) {
        if (settled) return;
        settled = true;
        window.clearTimeout(timer);
        node.onload = node.onerror = null;
        if (error) {
          node.remove();
          delete assets[path];
          reject(error);
        } else resolve();
      }
      node.onload = function () { finish(); };
      node.onerror = function () { finish(new Error("The signal could not connect. Please try again.")); };
      if (style) {
        node.rel = "stylesheet";
        node.href = new URL(path, base).href;
      } else node.src = new URL(path, base).href;
      document.head.appendChild(node);
    });
    return assets[path];
  }

  function cleanup() {
    if (!active) return;
    active = false;
    generation += 1;
    var previous = game;
    game = null;
    loading = null;
    try {
      if (previous) previous.destroy();
    } finally {
      body.replaceChildren();
      document.body.style.overflow = overflow;
      if (document.fullscreenElement === surface && document.exitFullscreen) document.exitFullscreen().catch(function () {});
      if (opener && opener.isConnected) opener.focus({ preventScroll: true });
      opener = null;
      window.dispatchEvent(new CustomEvent("jh270-arcade-close"));
    }
  }

  function close() {
    if (dialog && dialog.open) {
      dialog.close();
      cleanup();
    }
  }

  function setup() {
    if (dialog) return;
    dialog = element("dialog", "arcade-dialog");
    dialog.setAttribute("aria-labelledby", "arcade-title");
    surface = element("div", "arcade-surface");
    var bar = element("div", "arcade-bar");
    var title = element("h2", "", "JH270 / ECHO COURIER");
    title.id = "arcade-title";
    bar.appendChild(title);
    fullButton = element("button", "", "Full screen");
    fullButton.type = "button";
    fullButton.hidden = !document.fullscreenEnabled;
    fullButton.addEventListener("click", function () {
      var action = document.fullscreenElement === surface ? document.exitFullscreen() : surface.requestFullscreen();
      action.then(function () {
        if (!active && document.fullscreenElement === surface) return document.exitFullscreen();
      }).catch(function () {
        fullButton.textContent = "Unavailable";
      });
    });
    bar.appendChild(fullButton);
    var exit = element("button", "arcade-close", "Close ×");
    exit.type = "button";
    exit.setAttribute("aria-label", "Close Echo Courier");
    exit.addEventListener("click", close);
    bar.appendChild(exit);
    body = element("div", "arcade-body");
    surface.append(bar, body);
    dialog.appendChild(surface);
    dialog.addEventListener("cancel", function (event) {
      event.preventDefault();
      close();
    });
    dialog.addEventListener("close", function () {
      if (!dialog.open) cleanup();
    });
    document.addEventListener("fullscreenchange", function () {
      fullButton.textContent = document.fullscreenElement === surface ? "Exit full screen" : "Full screen";
    });
    document.body.appendChild(dialog);
  }

  function load() {
    var token = ++generation;
    var waiting = element("p", "arcade-loading", "Connecting to your echo…");
    waiting.setAttribute("role", "status");
    body.replaceChildren(waiting);
    loading = Promise.all([
      asset("css/echo-courier.css?v=8", true),
      asset("js/echo-courier.js?v=8", false)
    ]).then(function () {
      if (token !== generation || !dialog.open) return false;
      body.replaceChildren();
      game = window.JH270Game.create(body);
      return true;
    }).catch(function (error) {
      if (token !== generation || !dialog.open) return false;
      var message = element("div", "arcade-loading");
      var description = element("p", "", error.message || "Unable to start the game.");
      description.setAttribute("role", "alert");
      var retry = element("button", "btn", "Reconnect");
      retry.type = "button";
      retry.addEventListener("click", load, { once: true });
      message.append(description, retry);
      body.replaceChildren(message);
      return false;
    });
    return loading;
  }

  function open() {
    setup();
    if (dialog.open) return loading || Promise.resolve(Boolean(game));
    if (active) cleanup();
    opener = document.activeElement;
    overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    dialog.showModal();
    active = true;
    return load();
  }

  document.addEventListener("click", function (event) {
    if (!(event.target instanceof Element)) return;
    var trigger = event.target.closest("[data-open-game]");
    if (!trigger || event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    event.preventDefault();
    open();
  });

  window.JH270Arcade = { open: open, close: close };
})();
