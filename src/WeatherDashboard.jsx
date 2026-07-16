import React, { useState, useEffect, useRef } from "react";
import Chart from "chart.js/auto";

export default function WeatherDashboard() {
  const [city, setCity] = useState("");
  const [location, setLocation] = useState("---");
  const [currentCityData, setCurrentCityData] = useState(null);
  const [forecast, setForecast] = useState([]);
  const [favorites, setFavorites] = useState(() => {
    return JSON.parse(localStorage.getItem("weather_favorites")) || [];
  });

  const chartRef = useRef(null);
  let chartInstance = useRef(null);

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

  const getWeatherMeta = (code) =>
    weatherCodes[code] || { desc: "Unspecified", icon: "🌤️" };

  const fetchWeatherData = async (cityName) => {
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

      setLocation(displayName);
      setCurrentCityData(weatherData.current_weather);

      // Process Forecast
      const processedForecast = weatherData.daily.time.map((dateStr, index) => {
        const date = new Date(dateStr);
        return {
          dayName: date.toLocaleDateString("en-US", { weekday: "short" }),
          meta: getWeatherMeta(weatherData.daily.weathercode[index]),
          maxTemp: Math.round(weatherData.daily.temperature_2m_max[index]),
          minTemp: Math.round(weatherData.daily.temperature_2m_min[index]),
        };
      });
      setForecast(processedForecast);

      renderChart(weatherData.daily);
    } catch (error) {
      console.error("Error fetching weather data:", error);
    }
  };

  const renderChart = (daily) => {
    if (!chartRef.current) return;
    const ctx = chartRef.current.getContext("2d");
    const labels = daily.time.map((dateStr) =>
      new Date(dateStr).toLocaleDateString("en-US", { weekday: "short" }),
    );

    if (chartInstance.current) {
      chartInstance.current.destroy();
    }

    chartInstance.current = new Chart(ctx, {
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
        plugins: { legend: { position: "top" } },
        scales: {
          y: { grid: { color: "#f1f5f9" } },
          x: { grid: { display: false } },
        },
      },
    });
  };

  const addFavorite = () => {
    if (location === "---" || favorites.includes(location)) return;
    const updatedFavs = [...favorites, location];
    setFavorites(updatedFavs);
    localStorage.setItem("weather_favorites", JSON.stringify(updatedFavs));
  };

  useEffect(() => {
    fetchWeatherData("New York");
    return () => {
      if (chartInstance.current) chartInstance.current.destroy();
    };
  }, []);

  const currentMeta = currentCityData
    ? getWeatherMeta(currentCityData.weathercode)
    : { desc: "--", icon: "☀️" };

  return (
    <div className="container">
      <header>
        <h1>Weather Dashboard</h1>
      </header>

      <section className="search-section">
        <input
          type="text"
          value={city}
          onChange={(e) => setCity(e.target.value)}
          onKeyDown={(e) =>
            e.key === "Enter" && (fetchWeatherData(city), setCity(""))
          }
          placeholder="Search for a city..."
          className="city-input"
          autoComplete="off"
        />
        <button
          onClick={() => {
            fetchWeatherData(city);
            setCity("");
          }}
        >
          Search
        </button>
        <button onClick={addFavorite}>⭐ Favorite</button>

        <div className="favorites-container">
          {favorites.map((favCity, idx) => (
            <div
              key={idx}
              className="fav-chip"
              onClick={() => fetchWeatherData(favCity)}
            >
              {favCity}
            </div>
          ))}
        </div>
      </section>

      <main className="dashboard">
        <div className="card current-weather">
          <h2>
            Current Weather in <span>{location}</span>
          </h2>
          <div className="weather-info">
            <span>{currentMeta.icon}</span>
            <span>
              {currentCityData
                ? `${Math.round(currentCityData.temperature)}°C`
                : "--°C"}
            </span>
          </div>
          <p>Condition: {currentMeta.desc}</p>
          <p>
            Wind Speed:{" "}
            <span>{currentCityData ? currentCityData.windspeed : "--"}</span>{" "}
            km/h
          </p>
        </div>

        <div className="bottom-cards-row">
          <div className="card chart-container">
            <h3>7-Day Temp Trend</h3>
            <canvas ref={chartRef}></canvas>
          </div>

          <div className="card forecast-section">
            <h3>7-Day Forecast</h3>
            <div className="forecast-grid">
              {forecast.map((day, idx) => (
                <div key={idx} className="forecast-item">
                  <div>{day.dayName}</div>
                  <div className="forecast-icon">{day.meta.icon}</div>
                  <div className="forecast-temps">
                    {day.maxTemp}° / {day.minTemp}°
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
