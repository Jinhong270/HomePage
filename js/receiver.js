(function () {
  "use strict";

  const receiver = document.querySelector("[data-receiver]");
  if (!receiver) return;

  const stations = [
    {
      label: "Station",
      frequency: "27.0",
      callSign: "JH270",
      message: "Station JH270 calling. The guest terminal is open.",
      signal: t => Math.sin(t * 52) * (0.34 + 0.66 * Math.cos(t * 7 - 0.5) ** 2)
    },
    {
      label: "Workbench",
      frequency: "54.0",
      callSign: "JH-TOOL",
      message: "AndroidToolBox connects remote files and shells to your phone.",
      signal: t => Math.tanh(Math.sin(t * 31 + 0.2) * 4) * (0.8 + 0.12 * Math.cos(t * 9))
    },
    {
      label: "Arcade",
      frequency: "108.0",
      callSign: "JH-ECHO",
      message: "Courier to base. My echo is trailing by 2.7 seconds.",
      signal: t => Math.sin(t * 81) * (0.18 + 0.82 * Math.cos(t * 12 + 0.6) ** 8)
    }
  ];

  function tracePath(station) {
    const points = [];
    for (let x = 0; x <= 600; x += 2) {
      const y = 60 - 48 * station.signal(x / 600);
      points.push((x ? "L" : "M") + x + " " + y.toFixed(1));
    }
    return points.join(" ");
  }

  const frequency = receiver.querySelector("[data-frequency]");
  const callSign = receiver.querySelector("[data-call-sign]");
  const message = receiver.querySelector(".receiver-message");
  const wave = receiver.querySelector(".receiver-wave");
  const presets = receiver.querySelector(".receiver-presets");
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

  function tune(station, animate) {
    frequency.textContent = station.frequency;
    callSign.textContent = station.callSign;
    message.textContent = station.message;
    wave.setAttribute("d", tracePath(station));
    if (animate && !document.hidden && !reducedMotion.matches && wave.animate) {
      wave.getAnimations().forEach(animation => animation.cancel());
      wave.animate([{ opacity: 0.2 }, { opacity: 1 }], { duration: 260 });
    }
  }

  stations.forEach((station, index) => {
    const label = document.createElement("label");
    const input = document.createElement("input");
    const caption = document.createElement("span");
    input.type = "radio";
    input.name = "receiver-station";
    input.checked = index === 0;
    input.addEventListener("change", () => tune(station, true));
    caption.textContent = station.label;
    label.append(input, caption);
    presets.append(label);
  });

  tune(stations[0], false);
  receiver.querySelector(".receiver-controls").hidden = false;
})();
