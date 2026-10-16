(function () {
  var boot = document.getElementById("boot");
  if (boot) {
    var lines = [
      "jh270 boot 1.0",
      "locale ............. en-US",
      "session ............. guest@jh270.com",
      "github .............. Jinhong270",
      "x ................... Jinhong270",
      "hugging face ........ Jinhong270",
      "",
      "now ................. AndroidToolBox",
      "shell ............... /terminal",
      "",
      "ready."
    ];
    var text = lines.join("\n");
    var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce) {
      boot.textContent = text;
    } else {
      var index = 0;
      var step = function () {
        index += 1;
        boot.textContent = text.slice(0, index);
        if (index < text.length) {
          window.setTimeout(step, text.charAt(index - 1) === "\n" ? 36 : 12);
        }
      };
      step();
    }
  }

  var clock = document.getElementById("clock");
  if (!clock) return;
  var draw = function () {
    clock.textContent = new Date().toLocaleString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hourCycle: "h23",
      timeZoneName: "short"
    });
  };
  draw();
  window.setInterval(draw, 1000);
})();
