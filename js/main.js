document.addEventListener("DOMContentLoaded", () => {
  detectTouch();
  initTheme();
  applyTimeTheme();
  initClock();
  loadBackground();
  loadQuote();
  loadWeather();
  initLivePreview();
  document.getElementById("themeToggle").addEventListener("click", toggleTheme);
  document.getElementById("quoteBox").addEventListener("click", loadQuote);
  document.getElementById("refreshBg").addEventListener("click", () => {
    loadBackground(true);
  });
});

const LIVE_URLS = {
  hf: "https://jinhong270-2048.static.hf.space",
  gh: "https://jinhong270.github.io/Snake/"
};

function detectTouch() {
  const isTouch = "ontouchstart" in window || navigator.maxTouchPoints > 0;
  document.documentElement.classList.toggle("is-touch", isTouch);
  document.documentElement.classList.toggle("is-desktop", !isTouch);
}

function initTheme() {
  const saved = localStorage.getItem("jinhong-theme");
  if (saved === "light") {
    document.documentElement.setAttribute("data-theme", "light");
  }
}

function toggleTheme() {
  const root = document.documentElement;
  const isLight = root.getAttribute("data-theme") === "light";
  if (isLight) {
    root.removeAttribute("data-theme");
    localStorage.setItem("jinhong-theme", "dark");
  } else {
    root.setAttribute("data-theme", "light");
    localStorage.setItem("jinhong-theme", "light");
  }
}

function applyTimeTheme() {
  const theme = API.getTimeTheme();
  document.documentElement.setAttribute("data-time", theme);
}

function initClock() {
  function update() {
    const now = new Date();
    const h = String(now.getHours()).padStart(2, "0");
    const m = String(now.getMinutes()).padStart(2, "0");
    const s = String(now.getSeconds()).padStart(2, "0");
    document.getElementById("clock").textContent = `${h}:${m}:${s}`;
    const week = ["日", "一", "二", "三", "四", "五", "六"];
    const y = now.getFullYear();
    const mo = String(now.getMonth() + 1).padStart(2, "0");
    const d = String(now.getDate()).padStart(2, "0");
    document.getElementById("date").textContent = `${y}-${mo}-${d} 星期${week[now.getDay()]}`;
    applyTimeTheme();
  }
  update();
  setInterval(update, 1000);
}

function loadBackground(force) {
  const bg = document.getElementById("bg");
  bg.classList.remove("loaded");
  const theme = API.getTimeTheme();
  bg.style.backgroundImage = "none";
  bg.style.background = API.getGradient(theme);
  requestAnimationFrame(() => {
    requestAnimationFrame(() => bg.classList.add("loaded"));
  });
}

function loadQuote() {
  const quoteEl = document.getElementById("quote");
  const fromEl = document.getElementById("quote-from");
  quoteEl.classList.add("updating");
  const data = API.getQuote();
  setTimeout(() => {
    quoteEl.textContent = data.text;
    fromEl.textContent = data.from;
    quoteEl.classList.remove("updating");
  }, 220);
}

async function loadWeather() {
  const tempEl = document.getElementById("weather-temp");
  const descEl = document.getElementById("weather-desc");
  const locEl = document.getElementById("location");
  const extraEl = document.getElementById("weather-extra");
  const feelsEl = document.getElementById("feels");
  const humidityEl = document.getElementById("humidity");
  const sunEl = document.getElementById("sun");

  try {
    const loc = await API.getLocation();
    locEl.textContent = loc.city || "未知";
    extraEl.textContent = [loc.region, loc.country].filter(Boolean).join(" · ") || "";

    if (loc.lat && loc.lon && !isNaN(loc.lat)) {
      const weather = await API.getWeather(loc.lat, loc.lon);
      if (weather) {
        tempEl.textContent = `${weather.temp}°`;
        descEl.textContent = API.weatherCodeToText(weather.code);
        extraEl.textContent = `湿度 ${weather.humidity}% · 风 ${weather.wind}km/h`;
        feelsEl.textContent = `${weather.feels}°`;
        humidityEl.textContent = `湿度 ${weather.humidity}%`;
        sunEl.textContent = `${API.formatTime(weather.sunrise)} · ${API.formatTime(weather.sunset)}`;
      } else {
        tempEl.textContent = "--°";
        descEl.textContent = "暂无数据";
      }
    }
  } catch {
    locEl.textContent = "未知";
    tempEl.textContent = "--°";
    descEl.textContent = "获取失败";
  }
}

function initLivePreview() {
  const frame = document.getElementById("liveFrame");
  const wrap = document.querySelector(".live-frame-wrap");
  const fallback = document.getElementById("frameFallback");
  const fallbackLink = document.getElementById("fallbackLink");
  const btnHf = document.getElementById("btnHf");
  const btnGh = document.getElementById("btnGh");
  const loader = document.getElementById("frameLoader");
  const openFull = document.getElementById("openFull");

  let current = "hf";
  let switching = false;

  function switchTo(key) {
    if (key === current || switching) return;
    switching = true;
    current = key;
    const url = LIVE_URLS[key];

    wrap.classList.add("switching");
    if (loader) loader.classList.add("show");

    setTimeout(() => {
      frame.src = url;
      if (fallbackLink) fallbackLink.href = url;
      if (openFull) openFull.href = url;
      if (fallback) fallback.classList.remove("show");
      btnHf.classList.toggle("active", key === "hf");
      btnGh.classList.toggle("active", key === "gh");
      localStorage.setItem("jinhong-live", key);
    }, 280);

    frame.onload = () => {
      setTimeout(() => {
        wrap.classList.remove("switching");
        if (loader) loader.classList.remove("show");
        switching = false;
      }, 200);
    };

    setTimeout(() => {
      wrap.classList.remove("switching");
      if (loader) loader.classList.remove("show");
      switching = false;
    }, 3500);
  }

  btnHf.addEventListener("click", () => switchTo("hf"));
  btnGh.addEventListener("click", () => switchTo("gh"));

  const saved = localStorage.getItem("jinhong-live");
  if (saved === "gh") {
    current = "gh";
    frame.src = LIVE_URLS.gh;
    if (fallbackLink) fallbackLink.href = LIVE_URLS.gh;
    if (openFull) openFull.href = LIVE_URLS.gh;
    btnHf.classList.remove("active");
    btnGh.classList.add("active");
  } else {
    frame.src = LIVE_URLS.hf;
    if (fallbackLink) fallbackLink.href = LIVE_URLS.hf;
    if (openFull) openFull.href = LIVE_URLS.hf;
  }

  frame.addEventListener("load", () => {
    if (fallback) fallback.classList.remove("show");
    wrap.classList.remove("switching");
    if (loader) loader.classList.remove("show");
  });
}
