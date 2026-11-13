(function () {
  var boot = document.getElementById("boot");
  var frame = 0;
  var elapsed = 0;
  var previous = 0;
  var text = [
      "jh270 boot 2.0",
      "locale ............. en-US",
      "session ............. guest@jh270.com",
      "github .............. Jinhong270",
      "x ................... Jinhong270",
      "hugging face ........ Jinhong270",
      "",
      "now ................. AndroidToolBox",
      "signal .............. ECHO COURIER",
      "shell ............... /terminal",
      "",
      "ready."
    ].join("\n");

  function type(time) {
    if (previous) elapsed += Math.min(time - previous, 100);
    previous = time;
    var next = text.slice(0, Math.floor(elapsed / 12));
    if (boot.textContent !== next) boot.textContent = next;
    if (next.length < text.length) frame = window.requestAnimationFrame(type);
    else frame = 0;
  }

  var clock = document.getElementById("clock");
  var timer = 0;
  var format = new Intl.DateTimeFormat("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hourCycle: "h23",
      timeZoneName: "short"
  });

  function drawClock() {
    clock.textContent = format.format(new Date());
  }

  function suspend() {
    window.cancelAnimationFrame(frame);
    window.clearInterval(timer);
    frame = timer = previous = 0;
  }

  function resume() {
    suspend();
    if (document.hidden) return;
    if (boot && boot.textContent !== text) {
      if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) boot.textContent = text;
      else frame = window.requestAnimationFrame(type);
    }
    if (clock) {
      drawClock();
      timer = window.setInterval(drawClock, 1000);
    }
  }

  document.addEventListener("visibilitychange", resume);
  window.addEventListener("pagehide", suspend);
  window.addEventListener("pageshow", resume);
  resume();
})();
