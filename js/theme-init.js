(function () {
  var saved = "";
  try {
    saved = localStorage.getItem("jh270-theme") || "";
    if (saved !== "light" && saved !== "dark") {
      saved = "";
      localStorage.removeItem("jh270-theme");
    }
  } catch (error) {}
  var dark = window.matchMedia("(prefers-color-scheme: dark)").matches;
  document.documentElement.dataset.theme = saved || (dark ? "dark" : "light");
  document.documentElement.dataset.themeChoice = saved || "system";
})();
