(function () {
  var clock = document.getElementById("clock");
  if (!clock) return;
  var timer;
  var format = new Intl.DateTimeFormat("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
    timeZoneName: "short"
  });

  function draw() {
    clock.textContent = format.format(new Date());
  }

  function stop() {
    window.clearInterval(timer);
  }

  function start() {
    stop();
    if (document.hidden) return;
    draw();
    timer = window.setInterval(draw, 1000);
  }

  document.addEventListener("visibilitychange", start);
  window.addEventListener("pagehide", stop);
  window.addEventListener("pageshow", start);
  start();
})();
