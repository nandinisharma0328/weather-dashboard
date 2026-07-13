const cityInput = document.getElementById("city-input");
const searchBtn = document.getElementById("search-btn");
const favBtn = document.getElementById("fav-btn");
const favoritesList = document.getElementById("favorites-list");
const locationName = document.getElementById("location-name");
const currentTemp = document.getElementById("current-temp");
const weatherDesc = document.getElementById("weather-desc");
const windSpeed = document.getElementById("wind-speed");
const forecastGrid = document.getElementById("forecast-grid");

let tempChartInstance = null;
let favoriteCities =
  JSON.parse(localStorage.getItem("weather_favorites")) || [];

const weatherCodes = {
  0: { desc: "Clear sky", icon: "☀️" },
  1: { desc: "Mainly clear", icon: "🌤️" },
  2: { desc: "Partly cloudy", icon: "⛅" },
  3: { desc: "Overcast", icon: "☁️" },
  45: { desc: "Foggy", icon: "🌫️" },
  48: { desc: "Depositing rime fog", icon: "🌫️" },
  51: { desc: "Light drizzle", icon: "🌧️" },
  53: { desc: "Moderate drizzle", icon: "🌧️" },
  55: { desc: "Dense drizzle", icon: "🌧️" },
  61: { desc: "Slight rain", icon: "🌦️" },
  63: { desc: "Moderate rain", icon: "🌧️" },
  65: { desc: "Heavy rain", icon: "🌧️" },
  71: { desc: "Slight snow fall", icon: "🌨️" },
  73: { desc: "Moderate snow fall", icon: "🌨️" },
  75: { desc: "Heavy snow fall", icon: "🌨️" },
  95: { desc: "Thunderstorm", icon: "⛈️" },
};

function getWeatherMeta(code) {
  return weatherCodes[code] || { desc: "Unspecified", icon: "🌤️" };
}

async function fetchWeatherData(cityName) {
  const cleanName = cityName.trim();
  if (!cleanName) return;

  try {
    const geoUrl = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(cleanName)}&count=1&language=en&format=json`;
    const geoResponse = await fetch(geoUrl);
    const geoData = await geoResponse.json();

    if (!geoData.results || geoData.results.length === 0) {
      alert("City not found. Please try a different name.");
      return;
    }

    const { latitude, longitude, name, country } = geoData.results[0];
    const displayName = `${name}, ${country}`;

    const weatherUrl = `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current_weather=true&daily=temperature_2m_max,temperature_2m_min,weathercode&timezone=auto`;
    const weatherResponse = await fetch(weatherUrl);
    const weatherData = await weatherResponse.json();

    updateDashboard(displayName, weatherData);
  } catch (error) {
    console.error("Error fetching weather data:", error);
    alert("An error occurred while fetching data. Please try again.");
  }
}

function updateDashboard(displayName, data) {
  locationName.textContent = displayName;
  locationName.dataset.currentCity = displayName;

  const current = data.current_weather;
  currentTemp.textContent = `${Math.round(current.temperature)}°C`;
  windSpeed.textContent = current.windspeed;

  const currentMeta = getWeatherMeta(current.weathercode);
  weatherDesc.textContent = `Condition: ${currentMeta.desc}`;
  document.getElementById("weather-icon").textContent = currentMeta.icon;

  renderForecast(data.daily);
  renderChart(data.daily);
}

function renderForecast(daily) {
  forecastGrid.innerHTML = "";

  daily.time.forEach((dateStr, index) => {
    const date = new Date(dateStr);
    const dayName = date.toLocaleDateString("en-US", { weekday: "short" });

    const code = daily.weathercode[index];
    const meta = getWeatherMeta(code);
    const maxTemp = Math.round(daily.temperature_2m_max[index]);
    const minTemp = Math.round(daily.temperature_2m_min[index]);

    const itemHtml = `
            <div class="forecast-item">
                <div>${dayName}</div>
                <div class="forecast-icon">${meta.icon}</div>
                <div class="forecast-temps">${maxTemp}° / ${minTemp}°</div>
            </div>
        `;
    forecastGrid.insertAdjacentHTML("beforeend", itemHtml);
  });
}

function renderChart(daily) {
  const ctx = document.getElementById("tempChart").getContext("2d");

  const labels = daily.time.map((dateStr) => {
    return new Date(dateStr).toLocaleDateString("en-US", { weekday: "short" });
  });

  if (tempChartInstance) {
    tempChartInstance.destroy();
  }

  tempChartInstance = new Chart(ctx, {
    type: "line",
    data: {
      labels: labels,
      datasets: [
        {
          label: "Max Temp (°C)",
          data: daily.temperature_2m_max,
          borderColor: "#3b82f6",
          backgroundColor: "rgba(59, 130, 246, 0.1)",
          borderWidth: 2,
          tension: 0.3,
          fill: true,
        },
        {
          label: "Min Temp (°C)",
          data: daily.temperature_2m_min,
          borderColor: "#94a3b8",
          backgroundColor: "transparent",
          borderWidth: 2,
          tension: 0.3,
          borderDash: [4, 4],
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: "top",
          labels: {
            boxWidth: 12,
            font: { family: "Segoe UI" },
          },
        },
      },
      scales: {
        y: {
          ticks: { font: { family: "Segoe UI" } },
          grid: { color: "#f1f5f9" },
        },
        x: {
          ticks: { font: { family: "Segoe UI" } },
          grid: { display: false },
        },
      },
    },
  });
}

function renderFavorites() {
  favoritesList.innerHTML = "";
  favoriteCities.forEach((city) => {
    const chip = document.createElement("div");
    chip.className = "fav-chip";
    chip.textContent = city;
    chip.addEventListener("click", () => {
      fetchWeatherData(city);
    });
    favoritesList.appendChild(chip);
  });
}

searchBtn.addEventListener("click", () => {
  const value = cityInput.value;
  if (value.trim()) {
    fetchWeatherData(value);
    cityInput.value = "";
  }
});

cityInput.addEventListener("keypress", (e) => {
  if (e.key === "Enter") {
    const value = cityInput.value;
    if (value.trim()) {
      fetchWeatherData(value);
      cityInput.value = "";
    }
  }
});

favBtn.addEventListener("click", () => {
  const activeCity = locationName.dataset.currentCity;
  if (!activeCity || activeCity === "---") return;

  if (!favoriteCities.includes(activeCity)) {
    favoriteCities.push(activeCity);
    localStorage.setItem("weather_favorites", JSON.stringify(favoriteCities));
    renderFavorites();
  }
});

fetchWeatherData("New York");
renderFavorites();
