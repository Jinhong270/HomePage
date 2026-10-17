(function () {
  var JH_boot = document.getElementById("boot");
  if (JH_boot) {
    var JH_lines = [
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
    var JH_text = JH_lines.join("\n");
    var JH_reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (JH_reduce) {
      JH_boot.textContent = JH_text;
    } else {
      var JH_index = 0;
      var JH_step = function () {
        JH_index += 1;
        JH_boot.textContent = JH_text.slice(0, JH_index);
        if (JH_index < JH_text.length) {
          window.setTimeout(JH_step, JH_text.charAt(JH_index - 1) === "\n" ? 36 : 12);
        }
      };
      JH_step();
    }
  }

  var JH_clock = document.getElementById("clock");
  if (!JH_clock) return;
  var JH_draw = function () {
    JH_clock.textContent = new Date().toLocaleString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hourCycle: "h23",
      timeZoneName: "short"
    });
  };
  JH_draw();
  window.setInterval(JH_draw, 1000);
})();
