(function () {
  "use strict";

  if (window.location.pathname === "/game") {
    window.location.replace("/game/" + window.location.search + window.location.hash);
    return;
  }

  var mount = document.getElementById("game-mount");
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

  window.addEventListener("pagehide", function (event) {
    if (event.persisted) game.pause();
    else game.destroy();
  });
})();
