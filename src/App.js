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
  Sunrise,
  Sunset,
  Smile,
  Meh,
  Frown,
  Skull,
} from 'lucide-react';

function App() {
  const [city, setCity] = useState('');
  const [weather, setWeather] = useState(null);
  const [forecast, setForecast] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [unit, setUnit] = useState('metric');
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [aqi,setAqi] = useState(null);
  const [suggestions, setSuggestions] = useState([]);


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
  const trimmedCity = city.trim();  // Trim leading and trailing spaces

  if (!trimmedCity) return;

    setLoading(true);
    setError('');
    try {
      const res = await fetch(
        `https://api.openweathermap.org/data/2.5/weather?q=${encodeURIComponent(trimmedCity)}&appid=${API_KEY}&units=${useUnit}`
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

  const getAqi = async (lat, lon) => {
    try {
      const res = await fetch(
        `https://api.openweathermap.org/data/2.5/air_pollution?lat=${lat}&lon=${lon}&appid=${API_KEY}`
      );
      const data = await res.json(); 
      setAqi(data.list[0]);
    } catch (err) {
      console.error("Failed to fetch AQI:", err);
      setAqi(null);
    }
  };

const debouncedGetWeather = useRef();
const cityChangedRef = useRef(false);

// Setup for calling the AQI api
useEffect(() => {
  if (weather && weather.coord) {
    getAqi(weather.coord.lat, weather.coord.lon);
  } else {
    setAqi(null); // clear AQI when no coords
  }
}, [weather]);


// Setup debounce when getWeather changes
useEffect(() => {
  debouncedGetWeather.current = debounce(() => {
    getWeather();
  }, 500);

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

  const timezoneOffset = forecast.city?.timezone || 0;
  const dailyMap = {};

  forecast.list.forEach(item => {
    const localTimestamp = (item.dt + timezoneOffset) * 1000;
    const date = new Date(localTimestamp);
    const key = date.toISOString().split('T')[0];

    if (!dailyMap[key]) {
      dailyMap[key] = {
        items: [],
        temp_min: item.main.temp_min,
        temp_max: item.main.temp_max,
      };
    }

    dailyMap[key].temp_min = Math.min(dailyMap[key].temp_min, item.main.temp_min);
    dailyMap[key].temp_max = Math.max(dailyMap[key].temp_max, item.main.temp_max);
    dailyMap[key].items.push(item);
  });

  return Object.entries(dailyMap)
    .slice(0, 5)
    .map(([key, data]) => {
      // Pick the item closest to 12:00 PM
      const noonTimestamp = new Date(`${key}T12:00:00Z`).getTime() / 1000 - timezoneOffset;
      const closest = data.items.reduce((prev, curr) =>
        Math.abs(curr.dt - noonTimestamp) < Math.abs(prev.dt - noonTimestamp) ? curr : prev
      );

      return {
        temp_min: data.temp_min,
        temp_max: data.temp_max,
        icon: closest.weather[0].icon,
        description: closest.weather[0].description,
        dt: closest.dt,
      };
    });
};


  const getDayName = (timestamp) => {
    return new Date(timestamp * 1000).toLocaleDateString('en-US', { weekday: 'short' });
  };

  const fetchSuggestions = async (query) => {
  if (!query) {
    setSuggestions([]);
    return;
  }

  try {
    const res = await fetch(
      `https://api.openweathermap.org/geo/1.0/direct?q=${query}&limit=5&appid=${API_KEY}`
    );
    const data = await res.json();
    setSuggestions(data);
  } catch (err) {
    console.error("Error fetching suggestions:", err);
    setSuggestions([]);
  }
};

  const containerRef = useRef(null);

  // Close suggestions if clicking outside input container
  useEffect(() => {
    function handleClickOutside(event) {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setSuggestions([]);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [setSuggestions]);

  const handleInputChange = (e) => {
    const value = e.target.value;
    setCity(value);
    fetchSuggestions(value.trimStart());
  };

  const handleSuggestionClick = (s) => {
    setCity(`${s.name}${s.state ? `, ${s.state}` : ''}, ${s.country}`);
    setSuggestions([]);
  };

const sunrise = weather
  ? new Date(weather.sys.sunrise * 1000).toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
    })
  : '';

const sunset = weather
  ? new Date(weather.sys.sunset * 1000).toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
    })
  : '';

const getAqiLabel = (index) => {
  const levels = [
    { label: "Good", icon: <Smile className="inline w-5 h-5 text-green-500" /> },
    { label: "Fair", icon: <Meh className="inline w-5 h-5 text-yellow-400" /> },
    { label: "Moderate", icon: <Meh className="inline w-5 h-5 text-orange-400" /> },
    { label: "Poor", icon: <Frown className="inline w-5 h-5 text-red-500" /> },
    { label: "Very Poor", icon: <Skull className="inline w-5 h-5 text-purple-700" /> },
  ];

  return levels[index - 1] || { label: "Unknown", icon: null };
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
  const condition = desc.toLowerCase().trim();

  if (condition.includes('thunderstorm') || condition.includes('storm') || condition.includes('squall'))
    return 'bg-gradient-to-b from-gray-900 to-gray-700';

  if (condition.includes('drizzle'))
    return 'bg-gradient-to-b from-blue-300 to-blue-500';

  if (condition.includes('rain') || condition.includes('shower'))
    return 'bg-gradient-to-b from-blue-400 to-blue-700';

  if (condition.includes('snow') || condition.includes('sleet'))
    return 'bg-gradient-to-b from-blue-100 to-white';

  if (condition.includes('clear') || condition.includes('sunny'))
    return 'bg-gradient-to-b from-sky-200 to-sky-500';

  if (
    condition.includes('cloud') ||
    condition.includes('overcast') ||
    condition.includes('broken') ||
    condition.includes('scattered')
  )
    return 'bg-gradient-to-b from-gray-400 to-gray-700';

  if (
    condition.includes('fog') ||
    condition.includes('mist') ||
    condition.includes('haze') ||
    condition.includes('smoke') ||
    condition.includes('dust') ||
    condition.includes('ash') ||
    condition.includes('sand')
  )
    return 'bg-gradient-to-b from-gray-300 to-gray-500';

  if (condition.includes('wind') || condition.includes('breezy'))
    return 'bg-gradient-to-b from-sky-300 to-gray-400';

  if (condition.includes('tornado') || condition.includes('hurricane'))
    return 'bg-gradient-to-b from-black to-gray-800';

  return 'bg-gradient-to-b from-gray-100 to-gray-300'; // fallback
};

const particlesInit = async (engine) => {
  await loadFull(engine);
};

const getParticlesOptions = (desc = '') => {
  const condition = desc.toLowerCase();

if (condition.includes('snow') || condition.includes('sleet') || condition.includes('shower snow')) {
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

  if (
    condition.includes('rain') ||
    condition.includes('drizzle') ||
    condition.includes('shower rain') ||
    condition.includes('light rain') ||
    condition.includes('moderate rain')
  ) {
    return {
      fullScreen: { enable: true, zIndex: 1 },
      particles: {
        number: { value: 200 },
        size: { value: 2 },
        move: { enable: true, direction: "bottom", speed: 10 },
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
        size: { value: 4, random: { enable: true, minimumValue: 3 } },
        move: { enable: true, speed: 1, direction: "none", outModes: { default: "bounce" } },
        opacity: { value: 0.4, random: true },
        shape: { type: "circle" },
        color: { value: "#fff" }, // golden sun specks #ef8e38
      },
    };
  }

  if (
    condition.includes('cloud') ||
    condition.includes('overcast') ||
    condition.includes('scattered') ||
    condition.includes('broken clouds') ||
    condition.includes('few clouds')
  ) {
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

  if (
    condition.includes('mist') ||
    condition.includes('fog') ||
    condition.includes('haze') ||
    condition.includes('smoke') ||
    condition.includes('dust') ||
    condition.includes('sand') ||
    condition.includes('ash')
  ) {
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
        color: { value: "#fffb91" },
      },
      background: {
        color: "#000000",
      },
    };
  }

  if (condition.includes('wind') || condition.includes('breezy')) {
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

if (condition.includes('tornado') || condition.includes('hurricane') || condition.includes('squalls')) {
    return {
      fullScreen: { enable: true, zIndex: 1 },
      particles: {
        number: { value: 150 },
        size: { value: 4 },
        move: { enable: true, direction: "none", speed: 10 },
        opacity: { value: 0.7 },
        shape: { type: "circle" },
        color: { value: "#888" },
      },
      background: {
        color: "#2b2b2b",
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

      <div className="flex flex-col sm:flex-row items-center justify-center gap-3 mb-6 w-full max-w-md mx-auto">
      <div className="relative flex-grow w-full sm:w-auto"  ref={containerRef}>
        <input
          type="text"
          placeholder="Enter city"
          value={city}
          onChange={handleInputChange}
          className="z-10 border border-gray-300 p-2 rounded w-full transition focus:outline-none focus:ring-2 focus:ring-blue-500 dark:text-black"
        />

        {suggestions.length > 0 && (
          <ul className="absolute top-full left-0 right-0 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 mt-1 rounded shadow z-50 max-h-60 overflow-y-auto">
            {suggestions.map((s, idx) => (
              <li
                key={idx}
                className="p-2 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 dark:text-white"
                onClick={() => handleSuggestionClick(s)}
              >
                {s.name}{s.state ? `, ${s.state}` : ''}, {s.country}
              </li>
            ))}
          </ul>
        )}
</div>
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
              className="w-20 h-20"
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
  <ThermometerSun size={18} className="text-rose-400" />
  <p>Feels like: {weather.main.feels_like}°{unit === 'metric' ? 'C' : 'F'}</p>
</div>
<div className="flex items-center gap-2">
  <Sunrise size={18} className="text-amber-400" />
  <p>Sunrise: {sunrise}</p>
  </div>
  <div className="flex items-center gap-2">
  <Sunset size={18} className="text-orange-500" />
  <p>Sunset: {sunset}</p>
  </div>

            <p className="text-sm text-gray-700 dark:text-gray-400 mt-2">
              Last updated: {new Date(weather.dt * 1000).toLocaleString()}
            </p>
          </div>
        </div>
      )}

    {aqi && (() => {
  const aqiData = getAqiLabel(aqi.main.aqi);
  return (
    <div className="mt-6 p-6 rounded-xl bg-white/10 dark:bg-gray-800/10 backdrop-blur-md border border-white/20 dark:border-gray-700 shadow-md text-black dark:text-white transition w-full max-w-md mx-auto text-center">
      <h4 className="text-xl font-semibold">Air Quality Index</h4>
      <p className="text-lg flex items-center justify-center gap-2">
        {aqiData.icon}
        <span>{aqiData.label}</span> (Level {aqi.main.aqi})
      </p>
      <div className="text-sm text-gray-700 dark:text-gray-400 mt-2">
        PM2.5: {aqi.components.pm2_5} µg/m³ | PM10: {aqi.components.pm10} µg/m³
      </div>
    </div>
  );
})()}



{forecast && forecast.list && (
  <div className="mt-4 rounded text-center">
    <h2 className="text-2xl font-semibold mb-4 dark:text-white">5-Day Forecast</h2>
    <div className="w-full overflow-x-auto sm:overflow-visible">
      <div className="flex gap-4 sm:justify-center w-max sm:w-full mx-auto pb-2">
        {getDailyForecast().map((item, index) => (
          <div
            key={index}
            className="min-w-[150px] flex-shrink-0 p-4 rounded-xl bg-white/10 dark:bg-gray-800/10 backdrop-blur-md border border-white/20 dark:border-gray-700 shadow-md text-black dark:text-white transition"
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
              className="w-20 h-20 mx-auto"
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
