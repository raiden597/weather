import React, { useState, useEffect, useCallback, useRef  } from 'react';
import './App.css'; 
import { debounce } from 'lodash';
import Particles from "react-tsparticles";
import { loadFull } from "tsparticles";
import {
  Sun,
  Moon,
  Droplet,
  Wind,
  ThermometerSun,
  CloudRain,
  CloudSnow,
  CloudSun,
  CloudFog,
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

    useEffect(() => {
    const savedDark = localStorage.getItem('darkMode');
    if (savedDark === 'true') {
      setIsDarkMode(true);
      document.documentElement.classList.add('dark');
    }
  }, []);

  const toggleDarkMode = () => {
    setIsDarkMode((prev) => {
      const newMode = !prev;
      localStorage.setItem('darkMode', newMode);
      const html = document.documentElement;
      if (newMode) {
        html.classList.add('dark');
      } else {
        html.classList.remove('dark');
      }
      return newMode;
    });
  };

  const getForecast = useCallback(async (lat, lon, unitOverride) => {
  const useUnit = unitOverride || unit;
    try {
      const res = await fetch(
        `https://api.openweathermap.org/data/2.5/forecast?lat=${lat}&lon=${lon}&appid=${API_KEY}&units=${useUnit}`
      );
      const data = await res.json();
      setForecast(data);
    } catch {
      setError('Failed to fetch forecast. Please try again.');
    }
  }, [unit]);

  const getWeather = useCallback(async (unitOverride) => {
  const useUnit = unitOverride || unit;
    if (!city) return;
    setLoading(true);
    setError('');
    try {
      const res = await fetch(
        `https://api.openweathermap.org/data/2.5/weather?q=${city}&appid=${API_KEY}&units=${useUnit}`
      );
      const data = await res.json();
      if (data.cod !== 200) {
        setError(data.message);
        setWeather(null);
      } else {
        setWeather(data);
        setError('');
        await getForecast(data.coord.lat, data.coord.lon, useUnit);
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
            await getForecast(latitude, longitude,unit);
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
  const newUnit = unit === 'metric' ? 'imperial' : 'metric';
  setUnit(newUnit);
  getWeather(newUnit); // fetch with new unit immediately
};


const debouncedGetWeather = useRef();
const cityChangedRef = useRef(false);

// Setup debounce when getWeather changes
useEffect(() => {
  debouncedGetWeather.current = debounce(() => {
    getWeather();
  }, 1000);

  return () => {
    debouncedGetWeather.current?.cancel();
  };
}, [getWeather]);

// Get location weather if city is not set
useEffect(() => {
  getLocationWeather();
  // eslint-disable-next-line react-hooks/exhaustive-deps
}, []);


// Rename to trigger only on city change
useEffect(() => {
  if (!cityChangedRef.current) {
    cityChangedRef.current = true;
    return;
  }

  if (city) {
    debouncedGetWeather.current?.();
  }
}, [city]);

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

const getWeatherIcon = (desc = '') => {
  const condition = desc.toLowerCase();

  if (condition.includes('thunderstorm') || condition.includes('storm'))
    return <Zap className="text-yellow-600" size={32} />;

  if (condition.includes('drizzle') || condition.includes('light rain'))
    return <CloudRain className="text-blue-400" size={32} />;

  if (condition.includes('rain'))
    return <CloudRain className="text-blue-600" size={32} />;

  if (condition.includes('snow'))
    return <CloudSnow className="text-cyan-400" size={32} />;

  if (condition.includes('fog') || condition.includes('mist') || condition.includes('haze'))
    return <CloudFog className="text-gray-400" size={32} />;

  if (condition.includes('cloud') && condition.includes('sun'))
    return <CloudSun className="text-yellow-500" size={32} />;

  if (condition.includes('cloud'))
    return <Cloud className="text-gray-500" size={32} />;

  if (condition.includes('tornado'))
    return <Zap className="text-red-600" size={32} />;

  if (condition.includes('wind'))
    return <Cloud className="text-gray-400 animate-pulse" size={32} />;

  return <Sun className="text-yellow-400" size={32} />;
};

    // 🆕 Utility to get background class based on weather
const getWeatherBackground = (desc = '') => {
  const condition = desc.toLowerCase();

  if (condition.includes('thunderstorm') || condition.includes('storm'))
    return 'bg-gradient-to-b from-gray-900 to-gray-700';

  if (condition.includes('drizzle'))
    return 'bg-gradient-to-b from-blue-300 to-blue-500';

  if (condition.includes('rain'))
    return 'bg-gradient-to-b from-gray-500 to-blue-700';

  if (condition.includes('snow'))
    return 'bg-gradient-to-b from-blue-100 to-white';

  if (condition.includes('clear'))
    return 'bg-gradient-to-b from-sky-100 to-sky-400';

  if (condition.includes('clouds') || condition.includes('cloud'))
    return 'bg-gradient-to-b from-gray-300 to-gray-500';

  if (condition.includes('fog') || condition.includes('mist') || condition.includes('haze'))
    return 'bg-gradient-to-b from-gray-200 to-gray-400';
  
  if (condition.includes('wind'))
    return 'bg-gradient-to-b from-sky-300 to-gray-400';

  return 'bg-gradient-to-b from-blue-100 to-blue-300';
};

const particlesInit = async (engine) => {
  await loadFull(engine);
};

const getParticlesOptions = (desc = '') => {
  const condition = desc.toLowerCase();

  if (condition.includes('snow')) {
    return {
      fullScreen: { enable: true, zIndex: 1 },
      particles: {
        number: { value: 120 },
        size: { value: 4 },
        move: { enable: true, direction: "bottom", speed: 1.5 },
        opacity: { value: 0.7 },
        shape: { type: "circle" },
        color: { value: "#e0f7fa" },
      },
    };
  }

  if (condition.includes('rain')) {
    return {
      fullScreen: { enable: true, zIndex: 1 },
      particles: {
        number: { value: 200 },
        size: { value: 2 },
        move: { enable: true, direction: "bottom", speed: 8 },
        opacity: { value: 0.4 },
        shape: { type: "circle" },
        color: { value: "#89c4f4" },
      },
    };
  }

  if (condition.includes('clear')) {
    return {
      fullScreen: { enable: true, zIndex: 1 },
      particles: {
        number: { value: 40 },
        size: { value: 3, random: { enable: true, minimumValue: 4 } },
        move: { enable: true, speed: 1 },
        opacity: { value: 0.4 },
        shape: { type: "circle" },
        color: { value: "#ef8e38" }, // golden sun specks
      },
    };
  }

  if (condition.includes('cloud')) {
    return {
      fullScreen: { enable: true, zIndex: 1 },
      particles: {
        number: { value: 70 },
        size: { value: 20, random: { enable: true, minimumValue: 10 } },
        move: { enable: true, speed: 0.4, direction: "right" },
        opacity: { value: 0.12 },
        shape: { type: "circle" },
        color: { value: "#b0c4de" },
      },
    };
  }

  if (condition.includes('mist') || condition.includes('fog') || condition.includes('haze')) {
    return {
      fullScreen: { enable: true, zIndex: 1 },
      particles: {
        number: { value: 90 },
        size: { value: 12 },
        move: { enable: true, speed: 0.2 },
        opacity: { value: 0.1 },
        shape: { type: "circle" },
        color: { value: "#cfcfcf" },
      },
    };
  }

  if (condition.includes('thunderstorm')) {
    return {
      fullScreen: { enable: true, zIndex: 1 },
      particles: {
        number: { value: 60 },
        size: { value: 2 },
        move: { enable: true, speed: 6 },
        opacity: { value: 0.6 },
        shape: { type: "circle" },
        color: { value: "fffb91" },
      },
      background: {
        color: "#000000",
      },
    };
  }

  if (condition.includes('wind')) {
  return {
    fullScreen: { enable: true, zIndex: 1 },
    particles: {
      number: { value: 70 },
      size: { value: 3 },
      move: { enable: true, direction: "right", speed: 4 },
      opacity: { value: 0.25 },
      shape: { type: "triangle" },
      color: { value: ["#d0e7ff", "#b0dfff"]  },
    },
  };
}

  return null;
};


  const backgroundClass = isDarkMode ? 'dark bg-gray-900' : getWeatherBackground(weather?.weather?.[0]?.description);
  const particlesOptions = getParticlesOptions(weather?.weather?.[0]?.description);

  return (
    <div className={`App relative min-h-screen py-6 transition-all duration-500 ${backgroundClass}`}>
      {particlesOptions && <Particles className="absolute inset-0" init={particlesInit} options={particlesOptions} />}
      <div className="max-w-2xl mx-auto px-4 sm:px-6">
      <div className="absolute top-4 right-4">
        <button
          onClick={toggleDarkMode}
          className="p-2 rounded-full bg-gray-700 text-yellow-300 hover:bg-gray-600 shadow-md hover:shadow-lg transition-all duration-300"
          title="Toggle dark mode"
        >
          {isDarkMode ? <Sun className="text-yellow-400" /> : <Moon className="text-blue-400" />}
        </button>
      </div>

      <h1 className="text-3xl sm:text-4xl font-noto font-bold text-black dark:text-white mb-6 text-center flex items-center justify-center gap-2"><Sun className="w-8 h-8 text-black dark:text-white" /> Weather App</h1>

      <div className="flex flex-col sm:flex-row items-center justify-center gap-3 mb-6">
        <input
          type="text"
          placeholder="Enter city"
          value={city}
          onChange={(e) => setCity(e.target.value.trimStart())}
          className="z-10 border border-gray-300 p-2 rounded w-full sm:w-64 transition focus:outline-none focus:ring-2 focus:ring-blue-500 dark:text-black"
        />
        <button
          onClick={toggleUnit}
          className="z-10 bg-transparent shadow-md border border-white/20 text-white p-2 px-4 rounded transition focus:outline-none focus:ring-2 focus:ring-black dark:focus:ring-white font-semibold"
          title="Switch units"
        >
          {unit === 'metric' ? 'Switch to °F' : 'Switch to °C'}
        </button>
      </div>

      {loading && (
        <div className="mt-4 flex items-center justify-center">
          <div className="w-8 h-8 border-4 border-blue-700 border-t-transparent rounded-full animate-spin"></div>
        </div>
      )}

      {error && <p className="mt-4 text-red-500 text-center">{error}</p>}

      {weather && weather.main && (
        <div className="mt-6 p-6 rounded-xl bg-white/10 dark:bg-gray-800/10 backdrop-blur-md border border-white/20 dark:border-gray-700 shadow-md text-black dark:text-white transition w-full max-w-md mx-auto text-center">
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
            <p className="text-sm text-gray-700 dark:text-gray-400 mt-2">
              Last updated: {new Date(weather.dt * 1000).toLocaleString()}
            </p>
          </div>
        </div>
      )}


{forecast && forecast.list && (
  <div className="mt-6 p-6 rounded text-center">
    <h2 className="text-2xl font-semibold mb-4 dark:text-white">5-Day Forecast</h2>
    <div className="w-full overflow-x-auto sm:overflow-visible">
      <div className="flex gap-4 sm:justify-center w-max sm:w-full mx-auto pb-2">
        {getDailyForecast().map((item, index) => (
          <div
            key={index}
            className="min-w-[150px] flex-shrink-0 p-4 rounded-xl bg-white/10 dark:bg-gray-800/10 backdrop-blur-md border border-white/20 dark:border-gray-700 shadow-md text-black dark:text-white transition-transform"
          >
            <h3 className="text-xl font-semibold">{getDayName(item.dt)}</h3>
            <div className="flex justify-center text-xl mb-2">{getWeatherIcon(item.description)}</div>
            <p className="text-xs">
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
            <p className="capitalize text-sm ">
              {item.description}
            </p>
            <p className="text-lg">
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
