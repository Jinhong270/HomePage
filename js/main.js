document.addEventListener("DOMContentLoaded", () => {
  initTheme();
  initClock();
  loadBackground();
  loadQuote();
  loadWeather();
  initLivePreview();
  document.getElementById("themeToggle").addEventListener("click", toggleTheme);
  document.getElementById("quoteBox").addEventListener("click", loadQuote);
  document.getElementById("refreshBg").addEventListener("click", loadBackground);
});

const LIVE_URLS = {
  hf: "https://jinhong270-2048.static.hf.space",
  gh: "https://jinhong270.github.io/Snake/"
};

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
  }
  update();
  setInterval(update, 1000);
}

function loadBackground() {
  const bg = document.getElementById("bg");
  bg.classList.remove("loaded");
  bg.style.backgroundImage = "none";
  bg.style.background = API.getGradient();
  requestAnimationFrame(() => bg.classList.add("loaded"));
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
  const moonEl = document.getElementById("moon");

  try {
    const loc = await API.getLocation();
    locEl.textContent = loc.city;
    extraEl.textContent = loc.country || loc.region || "";

    if (loc.lat && loc.lon) {
      const weather = await API.getWeather(loc.lat, loc.lon);
      if (weather) {
        tempEl.textContent = `${weather.temp}°`;
        descEl.textContent = API.weatherCodeToText(weather.code);
        extraEl.textContent = `湿度 ${weather.humidity}% · 风 ${weather.wind}km/h`;
        feelsEl.textContent = `${weather.feels}°`;
        humidityEl.textContent = `湿度 ${weather.humidity}%`;
        sunEl.textContent = `${API.formatTime(weather.sunrise)} · ${API.formatTime(weather.sunset)}`;
        moonEl.textContent = "—";
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
  const fallback = document.getElementById("frameFallback");
  const fallbackLink = document.getElementById("fallbackLink");
  const btnHf = document.getElementById("btnHf");
  const btnGh = document.getElementById("btnGh");

  let current = "hf";

  function switchTo(key) {
    if (key === current) return;
    current = key;
    const url = LIVE_URLS[key];
    frame.src = url;
    fallbackLink.href = url;
    fallback.classList.remove("show");
    btnHf.classList.toggle("active", key === "hf");
    btnGh.classList.toggle("active", key === "gh");
    localStorage.setItem("jinhong-live", key);
  }

  btnHf.addEventListener("click", () => switchTo("hf"));
  btnGh.addEventListener("click", () => switchTo("gh"));

  const saved = localStorage.getItem("jinhong-live");
  if (saved === "gh") {
    switchTo("gh");
  } else {
    frame.src = LIVE_URLS.hf;
    fallbackLink.href = LIVE_URLS.hf;
  }

  frame.addEventListener("load", () => fallback.classList.remove("show"));
}
