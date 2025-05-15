import React, { useState, useEffect, useCallback } from 'react';
import {
  Sun,
  Moon,
  Droplet,
  Wind,
  ThermometerSun,
  CloudRain,
  CloudSnow,
  CloudSun,
  Cloud,
  Zap,
} from 'lucide-react';

function App() {
  const [city, setCity] = useState('');
  const [weather, setWeather] = useState(null);
  const [forecast, setForecast] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [unit, setUnit] = useState('metric');
  const [isDarkMode, setIsDarkMode] = useState(false);

  const API_KEY = '0080ceb60312740ef68b6fda95b49adf';

  const getForecast = useCallback(async (lat, lon) => {
    try {
      const res = await fetch(
        `https://api.openweathermap.org/data/2.5/forecast?lat=${lat}&lon=${lon}&appid=${API_KEY}&units=${unit}`
      );
      const data = await res.json();
      setForecast(data);
    } catch {
      setError('Failed to fetch forecast. Please try again.');
    }
  }, [unit]);

  const getWeather = useCallback(async () => {
    if (!city) return;
    setLoading(true);
    setError('');
    try {
      const res = await fetch(
        `https://api.openweathermap.org/data/2.5/weather?q=${city}&appid=${API_KEY}&units=${unit}`
      );
      const data = await res.json();
      if (data.cod !== 200) {
        setError(data.message);
        setWeather(null);
      } else {
        setWeather(data);
        setError('');
        await getForecast(data.coord.lat, data.coord.lon);
      }
    } catch {
      setError('Failed to fetch weather. Please try again.');
      setWeather(null);
    } finally {
      setLoading(false);
    }
  }, [city, unit, getForecast]);

  const getLocationWeather = useCallback(() => {
    if (navigator.geolocation) {
      setLoading(true);
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const { latitude, longitude } = position.coords;
          try {
            const res = await fetch(
              `https://api.openweathermap.org/data/2.5/weather?lat=${latitude}&lon=${longitude}&appid=${API_KEY}&units=${unit}`
            );
            const data = await res.json();
            setWeather(data);
            setCity(data.name);
            setError('');
            await getForecast(latitude, longitude);
          } catch {
            setError('Failed to fetch weather data for your location.');
            setWeather(null);
          } finally {
            setLoading(false);
          }
        },
        () => {
          setError('Geolocation permission denied or unavailable.');
          setLoading(false);
        }
      );
    } else {
      setError('Geolocation not available in your browser.');
    }
  }, [unit, getForecast]);

  const toggleUnit = () => {
    setUnit(unit === 'metric' ? 'imperial' : 'metric');
  };

  const toggleDarkMode = () => setIsDarkMode(!isDarkMode);

  useEffect(() => {
    if (!city) {
      getLocationWeather();
    } else {
      getWeather();
    }
  }, [unit, city, getLocationWeather, getWeather]);

  const getDailyForecast = () => {
    if (!forecast || !forecast.list) return [];

    const dailyMap = {};

    forecast.list.forEach(item => {
      const date = new Date(item.dt * 1000);
      const key = date.toLocaleDateString();

      if (!dailyMap[key]) {
        dailyMap[key] = {
          temp_min: item.main.temp_min,
          temp_max: item.main.temp_max,
          icon: item.weather[0].icon,
          description: item.weather[0].description,
          dt: item.dt,
        };
      } else {
        dailyMap[key].temp_min = Math.min(dailyMap[key].temp_min, item.main.temp_min);
        dailyMap[key].temp_max = Math.max(dailyMap[key].temp_max, item.main.temp_max);
      }
    });

    return Object.values(dailyMap).slice(0, 5);
  };

  const getDayName = (timestamp) => {
    return new Date(timestamp * 1000).toLocaleDateString('en-US', { weekday: 'short' });
  };

  const getWeatherIcon = (desc) => {
    desc = desc.toLowerCase() || '';
    if (desc.includes('rain')) return <CloudRain className="text-blue-500" size={32} />;
    if (desc.includes('snow')) return <CloudSnow className="text-cyan-400" size={32} />;
    if (desc.includes('cloud') && desc.includes('sun')) return <CloudSun className="text-yellow-500" size={32} />;
    if (desc.includes('cloud')) return <Cloud className="text-gray-500" size={32} />;
    if (desc.includes('storm')) return <Zap className="text-yellow-600" size={32} />;
    return <Sun className="text-yellow-400" size={32} />;
  };

  const cardBg = isDarkMode ? 'bg-gray-900 text-white' : 'bg-white text-black';

  return (
    <div className={`${isDarkMode ? 'bg-gray-900 text-white' : 'bg-white text-black'} transition-colors min-h-screen py-6`}>
      <div className="max-w-2xl mx-auto px-4 sm:px-6">
      <div className="absolute top-4 right-4">
        <button
          onClick={toggleDarkMode}
          className="p-2 rounded-full bg-gray-700 text-yellow-300 hover:bg-gray-600 shadow-md hover:shadow-lg transition-all duration-300"
          title="Toggle dark mode"
        >
          {isDarkMode ? <Sun className="text-yellow-400" /> : <Moon className="text-blue-500" />}
        </button>
      </div>

      <h1 className="text-3xl sm:text-4xl font-bold text-purple-700 mb-6 text-center">🌤️ Weather App</h1>

      <div className="flex flex-col sm:flex-row items-center gap-3 mb-6">
        <input
          type="text"
          placeholder="Enter city"
          value={city}
          onChange={(e) => setCity(e.target.value)}
          className="border border-gray-300 p-2 rounded w-full sm:w-64 transition focus:outline-none focus:ring-2 focus:ring-purple-400"
        />
        <button
          onClick={getWeather}
          className="bg-purple-600 hover:bg-purple-700 text-white p-2 px-4 rounded transition focus:outline-none focus:ring-2 focus:ring-purple-400 font-semibold"
        >
          Get Weather
        </button>
        <button
          onClick={toggleUnit}
          className="bg-blue-600 hover:bg-blue-700 text-white p-2 px-4 rounded shadow transition focus:outline-none focus:ring-2 focus:ring-blue-400 font-semibold"
          title="Switch units"
        >
          {unit === 'metric' ? 'Switch to °F' : 'Switch to °C'}
        </button>
      </div>

      {loading && (
        <div className="mt-4 flex items-center justify-center">
          <div className="w-8 h-8 border-4 border-purple-600 border-t-transparent rounded-full animate-spin"></div>
        </div>
      )}

      {error && <p className="mt-4 text-red-500 text-center">{error}</p>}

      {weather && weather.main && (
        <div className={`mt-6 p-6 rounded text-center transition w-full max-w-md mx-auto ${cardBg}`}>
          <h2 className="text-2xl font-semibold">{weather.name}</h2>
          <div className="flex flex-col items-center">
            <img
              src={`https://openweathermap.org/img/wn/${weather.weather[0].icon}@2x.png`}
              alt="weather icon"
            />
            <p className="text-lg">{weather.main.temp}°{unit === 'metric' ? 'C' : 'F'}</p>
            <p className="text-lg capitalize">{weather.weather[0].description}</p>
            <div className="flex items-center gap-2">
            <Droplet size={18} className="text-blue-500" />
            <p>Humidity: {weather.main.humidity}%</p>
            </div>

            <div className="flex items-center gap-2">
  <Wind size={18} className="text-gray-600" />
  <p>Wind: {weather.wind.speed} {unit === 'metric' ? 'm/s' : 'mph'}</p>
</div>

<div className="flex items-center gap-2">
  <ThermometerSun size={18} className="text-orange-500" />
  <p>Feels like: {weather.main.feels_like}°{unit === 'metric' ? 'C' : 'F'}</p>
</div>
            <p className="text-sm text-gray-400 mt-2">
              Last updated: {new Date(weather.dt * 1000).toLocaleString()}
            </p>
          </div>
        </div>
      )}


{forecast && forecast.list && (
  <div className="mt-6 p-6 rounded text-center">
    <h2 className="text-2xl font-semibold mb-4">5-Day Forecast</h2>

    {/* Responsive container */}
    <div className="w-full overflow-x-auto sm:overflow-visible">
      <div className="flex gap-4 justify-center sm:justify-center w-max sm:w-full mx-auto pb-2">
        {getDailyForecast().map((item, index) => (
          <div
            key={index}
            className="min-w-[150px] flex-shrink-0 p-4 rounded-xl shadow-md border transition-transform duration-100"
          >
            <h3 className="text-xl font-semibold">{getDayName(item.dt)}</h3>
            <div className="text-xl mb-2">{getWeatherIcon(item.description)}</div>
            <p className="text-xs text-gray-500 dark:text-gray-300">
              {new Date(item.dt * 1000).toLocaleDateString(undefined, {
                month: 'short',
                day: 'numeric',
              })}
            </p>
            <img
              src={`https://openweathermap.org/img/wn/${item.icon}@2x.png`}
              alt="weather icon"
              className="mx-auto"
            />
            <p className="capitalize text-sm text-gray-500 dark:text-gray-300">
              {item.description}
            </p>
            <p className="text-lg text-gray-600 dark:text-gray-300">
              {Math.round(item.temp_max)}° / {Math.round(item.temp_min)}°{unit === 'metric' ? 'C' : 'F'}
            </p>
          </div>
        ))}
      </div>
    </div>
  </div>
)}




    </div>
    </div>
  );
}

export default App;
