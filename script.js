/* ═══════════════════════════════════════════════════
   NIMBUS WEATHER  |  script.js
   ─ OpenWeatherMap + local backend auth + favourites
═══════════════════════════════════════════════════ */

"use strict";

/* ── CONFIG ── */
const OWM_KEY    = "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"; // ← replace
const OWM_BASE   = "https://api.openweathermap.org/data/2.5";
const OWM_GEO    = "https://api.openweathermap.org/geo/1.0";
const BACKEND    = "http://localhost:5000/api";    // backend base URL

/* ── STATE ── */
let state = {
  unit:      "metric",   // metric | imperial
  lang:      "en",
  theme:     "dark",
  token:     localStorage.getItem("nimbusToken") || null,
  user:      JSON.parse(localStorage.getItem("nimbusUser") || "null"),
  favourites: [],
  currentCity: null,
};

/* ── TRANSLATIONS ── */
const i18n = {
  en: { search:"Search city or country…", humidity:"Humidity", wind:"Wind", visibility:"Visibility", pressure:"Pressure", forecast:"5-Day Forecast", favs:"⭐ My Favourites", discover:"Discover your weather", searchHint:"Search any city or allow location access to begin", detect:"Detect My Location" },
  hi: { search:"शहर या देश खोजें…", humidity:"आर्द्रता", wind:"हवा", visibility:"दृश्यता", pressure:"दबाव", forecast:"5-दिन का पूर्वानुमान", favs:"⭐ मेरे पसंदीदा", discover:"मौसम खोजें", searchHint:"किसी भी शहर को खोजें", detect:"मेरी लोकेशन" },
  fr: { search:"Rechercher ville ou pays…", humidity:"Humidité", wind:"Vent", visibility:"Visibilité", pressure:"Pression", forecast:"Prévisions 5 jours", favs:"⭐ Mes favoris", discover:"Découvrez la météo", searchHint:"Cherchez une ville ou activez la localisation", detect:"Ma position" },
};

/* ── DOM REFS ── */
const $ = id => document.getElementById(id);
const searchInput   = $("searchInput");
const suggestions   = $("suggestions");
const heroContent   = $("heroContent");
const heroPlaceholder = $("heroPlaceholder");
const heroBg        = $("heroBg");
const forecastSection = $("forecastSection");
const forecastGrid  = $("forecastGrid");
const favsSection   = $("favsSection");
const favsGrid      = $("favsGrid");
const authModal     = $("authModal");
const loginPane     = $("loginPane");
const signupPane    = $("signupPane");
const authBtn       = $("authBtn");
const logoutBtn     = $("logoutBtn");
const favBtn        = $("favBtn");
const unitToggle    = $("unitToggle");
const themeToggle   = $("themeToggle");
const langSelect    = $("langSelect");

/* ══════════════════════════════
   UTILITY HELPERS
══════════════════════════════ */

function showToast(msg, duration = 3000) {
  const t = $("toast");
  t.textContent = msg;
  t.classList.add("show");
  setTimeout(() => t.classList.remove("show"), duration);
}

function formatDate(dt, lang = "en") {
  return new Date(dt * 1000).toLocaleString(lang, {
    weekday:"long", month:"short", day:"numeric",
    hour:"2-digit", minute:"2-digit"
  });
}

function conditionToBg(main) {
  const map = { Clear:"clear", Clouds:"clouds", Rain:"rain", Drizzle:"rain",
                Snow:"snow", Thunderstorm:"thunder", Mist:"mist",
                Haze:"mist", Fog:"mist", Smoke:"mist" };
  return "bg-" + (map[main] || "clear");
}

function weatherEmoji(main, icon) {
  const isNight = icon && icon.endsWith("n");
  const map = {
    Clear: isNight ? "🌙" : "☀️",
    Clouds: "☁️",
    Rain: "🌧️",
    Drizzle: "🌦️",
    Thunderstorm: "⛈️",
    Snow: "❄️",
    Mist: "🌫️",
    Fog: "🌫️",
    Haze: "🌫️",
    Smoke: "🌫️",
  };
  return map[main] || "🌤️";
}

function tempDisplay(kelvinOrC) {
  // OWM returns Celsius when units=metric, Fahrenheit when units=imperial
  return Math.round(kelvinOrC);
}

/* ══════════════════════════════
   WEATHER API
══════════════════════════════ */

async function fetchWeather(city) {
  const url = `${OWM_BASE}/weather?q=${encodeURIComponent(city)}&units=${state.unit}&appid=${OWM_KEY}&lang=${state.lang}`;
  const res  = await fetch(url);
  if (!res.ok) throw new Error(res.status === 404 ? "City not found" : "Weather API error");
  return res.json();
}

async function fetchWeatherByCoords(lat, lon) {
  const url = `${OWM_BASE}/weather?lat=${lat}&lon=${lon}&units=${state.unit}&appid=${OWM_KEY}&lang=${state.lang}`;
  const res  = await fetch(url);
  if (!res.ok) throw new Error("Location weather unavailable");
  return res.json();
}

async function fetchForecast(city) {
  const url = `${OWM_BASE}/forecast?q=${encodeURIComponent(city)}&units=${state.unit}&cnt=40&appid=${OWM_KEY}&lang=${state.lang}`;
  const res  = await fetch(url);
  if (!res.ok) return null;
  return res.json();
}

async function fetchGeoSuggestions(q) {
  if (q.length < 2) return [];
  const url = `${OWM_GEO}/direct?q=${encodeURIComponent(q)}&limit=5&appid=${OWM_KEY}`;
  const res  = await fetch(url);
  if (!res.ok) return [];
  return res.json();
}

/* ══════════════════════════════
   RENDER WEATHER
══════════════════════════════ */

async function loadWeather(city) {
  try {
    const [data, forecast] = await Promise.all([
      fetchWeather(city),
      fetchForecast(city),
    ]);
    renderCurrent(data);
    if (forecast) renderForecast(forecast);
    state.currentCity = data.name;
    updateFavBtn();
  } catch (err) {
    showToast("⚠️ " + err.message);
  }
}

async function loadWeatherByCoords(lat, lon) {
  try {
    const data = await fetchWeatherByCoords(lat, lon);
    renderCurrent(data);
    const forecast = await fetchForecast(data.name).catch(() => null);
    if (forecast) renderForecast(forecast);
    state.currentCity = data.name;
    updateFavBtn();
  } catch (err) {
    showToast("⚠️ " + err.message);
  }
}

function renderCurrent(data) {
  const t  = i18n[state.lang];
  const bg = conditionToBg(data.weather[0].main);

  // hero background
  heroBg.className = "hero-bg " + bg;

  // show content
  heroPlaceholder.classList.add("hidden");
  heroContent.classList.remove("hidden");

  $("cityName").textContent   = data.name;
  $("cityMeta").textContent   = `${data.sys.country} · ${data.coord.lat.toFixed(2)}°N ${data.coord.lon.toFixed(2)}°E`;
  $("tempValue").textContent  = tempDisplay(data.main.temp);
  $("unitLabel").textContent  = state.unit === "metric" ? "C" : "F";
  $("weatherIcon").textContent = weatherEmoji(data.weather[0].main, data.weather[0].icon);
  $("weatherDesc").textContent = data.weather[0].description;
  $("humidity").textContent   = data.main.humidity + "%";
  $("windSpeed").textContent  = (state.unit === "metric"
    ? Math.round(data.wind.speed * 3.6)
    : Math.round(data.wind.speed)) + (state.unit === "metric" ? " km/h" : " mph");
  $("visibility").textContent = ((data.visibility || 0) / 1000).toFixed(1) + " km";
  $("pressure").textContent   = data.main.pressure + " hPa";
  $("datetime").textContent   = formatDate(data.dt, state.lang);
}

function renderForecast(data) {
  // one entry per day (noon)
  const days = {};
  data.list.forEach(item => {
    const d = new Date(item.dt * 1000);
    const key = d.toDateString();
    if (!days[key]) days[key] = item;
  });

  const entries = Object.values(days).slice(0, 5);
  forecastGrid.innerHTML = entries.map((item, i) => {
    const d    = new Date(item.dt * 1000);
    const day  = d.toLocaleDateString(state.lang, { weekday:"short" });
    const icon = weatherEmoji(item.weather[0].main, item.weather[0].icon);
    return `
      <div class="forecast-card" style="animation-delay:${i * .07}s">
        <div class="forecast-day">${day}</div>
        <div class="forecast-icon">${icon}</div>
        <div class="forecast-temp">${tempDisplay(item.main.temp)}°${state.unit === "metric" ? "C" : "F"}</div>
        <div class="forecast-desc">${item.weather[0].description}</div>
      </div>`;
  }).join("");

  forecastSection.querySelector(".section-title").textContent = i18n[state.lang].forecast;
  forecastSection.classList.remove("hidden");
}

/* ══════════════════════════════
   AUTOCOMPLETE / SUGGESTIONS
══════════════════════════════ */

let debounceTimer;
searchInput.addEventListener("input", () => {
  clearTimeout(debounceTimer);
  const q = searchInput.value.trim();
  if (!q) { suggestions.classList.add("hidden"); return; }
  debounceTimer = setTimeout(() => showSuggestions(q), 300);
});

searchInput.addEventListener("keydown", e => {
  if (e.key === "Enter") {
    const q = searchInput.value.trim();
    if (q) { suggestions.classList.add("hidden"); loadWeather(q); }
  }
});

document.addEventListener("click", e => {
  if (!suggestions.contains(e.target) && e.target !== searchInput)
    suggestions.classList.add("hidden");
});

async function showSuggestions(q) {
  const results = await fetchGeoSuggestions(q);
  if (!results.length) { suggestions.classList.add("hidden"); return; }
  suggestions.innerHTML = results.map(r => {
    const label = [r.name, r.state, r.country].filter(Boolean).join(", ");
    return `<div class="suggestion-item" data-city="${r.name}">${label}</div>`;
  }).join("");
  suggestions.classList.remove("hidden");
  suggestions.querySelectorAll(".suggestion-item").forEach(el => {
    el.addEventListener("click", () => {
      searchInput.value = el.dataset.city;
      suggestions.classList.add("hidden");
      loadWeather(el.dataset.city);
    });
  });
}

/* ══════════════════════════════
   HOME & LOCATION BUTTONS
══════════════════════════════ */

$("homeBtn").addEventListener("click", () => {
  searchInput.value = "";
  heroContent.classList.add("hidden");
  heroPlaceholder.classList.remove("hidden");
  forecastSection.classList.add("hidden");
  state.currentCity = null;
});

$("detectBtn").addEventListener("click", detectLocation);
$("locBtn").addEventListener("click", detectLocation);

function detectLocation() {
  if (!navigator.geolocation) { showToast("Geolocation not supported"); return; }
  showToast("📍 Detecting location…");
  navigator.geolocation.getCurrentPosition(
    pos => loadWeatherByCoords(pos.coords.latitude, pos.coords.longitude),
    ()  => showToast("Location access denied")
  );
}

/* ══════════════════════════════
   UNIT TOGGLE
══════════════════════════════ */

unitToggle.addEventListener("click", () => {
  state.unit = state.unit === "metric" ? "imperial" : "metric";
  unitToggle.textContent = state.unit === "metric" ? "°C" : "°F";
  if (state.currentCity) loadWeather(state.currentCity);
});

/* ══════════════════════════════
   THEME TOGGLE
══════════════════════════════ */

themeToggle.addEventListener("click", () => {
  state.theme = state.theme === "dark" ? "light" : "dark";
  document.documentElement.setAttribute("data-theme", state.theme);
  themeToggle.innerHTML = state.theme === "dark"
    ? '<i class="fa fa-moon"></i>' : '<i class="fa fa-sun"></i>';
});

/* ══════════════════════════════
   LANGUAGE SELECTOR
══════════════════════════════ */

langSelect.addEventListener("change", () => {
  state.lang = langSelect.value;
  applyTranslations();
  if (state.currentCity) loadWeather(state.currentCity);
});

function applyTranslations() {
  const t = i18n[state.lang];
  searchInput.placeholder = t.search;
  $("detectBtn").innerHTML  = `<i class="fa fa-location-crosshairs"></i> ${t.detect}`;
  document.querySelector(".hero-placeholder p").textContent = t.searchHint;
  document.querySelector(".hero-placeholder h2").textContent = t.discover;
  document.querySelectorAll(".stat-chip small")[0].textContent = t.humidity;
  document.querySelectorAll(".stat-chip small")[1].textContent = t.wind;
  document.querySelectorAll(".stat-chip small")[2].textContent = t.visibility;
  document.querySelectorAll(".stat-chip small")[3].textContent = t.pressure;
}

/* ══════════════════════════════
   AUTH MODAL
══════════════════════════════ */

authBtn.addEventListener("click", () => authModal.classList.remove("hidden"));
$("closeModal").addEventListener("click", () => authModal.classList.add("hidden"));
authModal.addEventListener("click", e => { if (e.target === authModal) authModal.classList.add("hidden"); });

$("goSignup").addEventListener("click", () => { loginPane.classList.remove("active"); signupPane.classList.add("active"); });
$("goLogin").addEventListener("click",  () => { signupPane.classList.remove("active"); loginPane.classList.add("active"); });

$("loginBtn").addEventListener("click", async () => {
  const email    = $("loginEmail").value.trim();
  const password = $("loginPassword").value;
  if (!email || !password) { showToast("Please fill all fields"); return; }
  try {
    const res = await apiFetch("/auth/login", "POST", { email, password });
    saveAuth(res);
    authModal.classList.add("hidden");
    showToast("Welcome back, " + res.user.name + "! 👋");
    updateAuthUI();
    loadFavourites();
  } catch (err) { showToast("❌ " + err.message); }
});

$("signupBtn").addEventListener("click", async () => {
  const name     = $("signupName").value.trim();
  const email    = $("signupEmail").value.trim();
  const password = $("signupPassword").value;
  if (!name || !email || !password) { showToast("Please fill all fields"); return; }
  try {
    const res = await apiFetch("/auth/register", "POST", { name, email, password });
    saveAuth(res);
    authModal.classList.add("hidden");
    showToast("Account created! 🎉");
    updateAuthUI();
    loadFavourites();
  } catch (err) { showToast("❌ " + err.message); }
});

logoutBtn.addEventListener("click", () => {
  state.token = null; state.user = null;
  localStorage.removeItem("nimbusToken");
  localStorage.removeItem("nimbusUser");
  state.favourites = [];
  updateAuthUI();
  renderFavourites();
  showToast("Logged out. See you soon!");
});

function saveAuth(res) {
  state.token = res.token;
  state.user  = res.user;
  localStorage.setItem("nimbusToken", res.token);
  localStorage.setItem("nimbusUser", JSON.stringify(res.user));
}

function updateAuthUI() {
  if (state.token) {
    authBtn.classList.add("hidden");
    logoutBtn.classList.remove("hidden");
    logoutBtn.textContent = state.user?.name?.split(" ")[0] + " · Logout";
  } else {
    authBtn.classList.remove("hidden");
    logoutBtn.classList.add("hidden");
  }
}

/* ══════════════════════════════
   BACKEND API HELPER
══════════════════════════════ */

async function apiFetch(path, method = "GET", body = null) {
  const headers = { "Content-Type": "application/json" };
  if (state.token) headers["Authorization"] = "Bearer " + state.token;
  const opts = { method, headers };
  if (body) opts.body = JSON.stringify(body);
  const res = await fetch(BACKEND + path, opts);
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || "Server error");
  return data;
}

/* ══════════════════════════════
   FAVOURITES
══════════════════════════════ */

favBtn.addEventListener("click", async () => {
  if (!state.token) { showToast("Please sign in to save favourites"); return; }
  if (!state.currentCity) return;

  const isFav = state.favourites.some(f => f.city.toLowerCase() === state.currentCity.toLowerCase());
  if (isFav) {
    await removeFavourite(state.currentCity);
  } else {
    await addFavourite(state.currentCity);
  }
});

async function addFavourite(city) {
  try {
    await apiFetch("/favourites", "POST", { city });
    state.favourites.push({ city });
    showToast("⭐ " + city + " added to favourites");
    updateFavBtn();
    renderFavourites();
  } catch (err) { showToast("❌ " + err.message); }
}

async function removeFavourite(city) {
  try {
    await apiFetch("/favourites/" + encodeURIComponent(city), "DELETE");
    state.favourites = state.favourites.filter(f => f.city !== city);
    showToast("Removed " + city + " from favourites");
    updateFavBtn();
    renderFavourites();
  } catch (err) { showToast("❌ " + err.message); }
}

async function loadFavourites() {
  if (!state.token) { favsSection.classList.add("hidden"); return; }
  try {
    const data = await apiFetch("/favourites");
    state.favourites = data.favourites || [];
    renderFavourites();
    updateFavBtn();
  } catch {}
}

function renderFavourites() {
  if (!state.token || !state.favourites.length) {
    favsSection.classList.add("hidden");
    return;
  }
  favsSection.querySelector(".section-title").textContent = i18n[state.lang].favs;
  favsGrid.innerHTML = state.favourites.map((f, i) => `
    <div class="fav-card" data-city="${f.city}" style="animation-delay:${i * .06}s">
      <button class="fav-remove" data-city="${f.city}" title="Remove"><i class="fa fa-xmark"></i></button>
      <div class="fav-name">${f.city}</div>
      <div class="fav-country">${f.country || ""}</div>
    </div>`).join("");

  favsSection.classList.remove("hidden");

  favsGrid.querySelectorAll(".fav-card").forEach(card => {
    card.addEventListener("click", e => {
      if (e.target.closest(".fav-remove")) return;
      loadWeather(card.dataset.city);
      window.scrollTo({ top: 0, behavior:"smooth" });
    });
  });

  favsGrid.querySelectorAll(".fav-remove").forEach(btn => {
    btn.addEventListener("click", e => {
      e.stopPropagation();
      removeFavourite(btn.dataset.city);
    });
  });
}

function updateFavBtn() {
  if (!state.currentCity) return;
  const isFav = state.favourites.some(f => f.city.toLowerCase() === state.currentCity.toLowerCase());
  favBtn.classList.toggle("starred", isFav);
  favBtn.title = isFav ? "Remove from favourites" : "Add to favourites";
}

/* ══════════════════════════════
   INIT
══════════════════════════════ */

function init() {
  updateAuthUI();
  if (state.token) loadFavourites();
  applyTranslations();
}

init();
