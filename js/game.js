(function () {
  "use strict";

  if (window.location.pathname === "/game") {
    window.location.replace("/game/" + window.location.search + window.location.hash);
    return;
  }

  var mount = document.getElementById("game-mount");
  var surface = document.getElementById("game-surface");
  var fullButton = document.getElementById("game-fullscreen");
  var game;

  try {
    game = window.JH270Game.create(mount);
  } catch (error) {
    var message = document.createElement("div");
    message.className = "game-loading";
    message.setAttribute("role", "alert");
    var description = document.createElement("p");
    description.textContent = "The signal could not connect. Reload to try again.";
    var retry = document.createElement("a");
    retry.className = "btn";
    retry.href = "/game/";
    retry.textContent = "Reload game";
    message.append(description, retry);
    mount.replaceChildren(message);
    return;
  }

  fullButton.hidden = !document.fullscreenEnabled;
  fullButton.addEventListener("click", function () {
    var action = document.fullscreenElement === surface ? document.exitFullscreen() : surface.requestFullscreen();
    action.catch(function () { fullButton.textContent = "Unavailable"; });
  });
  document.addEventListener("fullscreenchange", function () {
    fullButton.textContent = document.fullscreenElement === surface ? "Exit full screen" : "Full screen";
  });
  window.addEventListener("pagehide", function (event) {
    if (event.persisted) game.pause();
    else game.destroy();
  });
})();
