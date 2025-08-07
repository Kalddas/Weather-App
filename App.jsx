import React, { useState, useEffect } from 'react';
import { Search, ChevronLeft, Wind, Sun, Cloud, CloudRain, CloudSnow } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import kurazLogo from './assets/kuraz.png'; 

// Mock API call to simulate fetching weather data
const fetchWeather = async (latitude, longitude, setLoading, setWeatherData, setView) => {
  setLoading(true);
  setWeatherData(null);
  try {
    // Simulate a network request with a delay
    await new Promise(resolve => setTimeout(resolve, 1500));

    // Mock data matching the UI of the images
    const mockData = {
      city: 'Addis Ababa, ET',
      lat: latitude || '8.9806',
      lon: longitude || '38.7578',
      current: {
        temp: 14,
        condition: 'few_clouds',
        condition_text: 'FEW CLOUDS',
        wind_speed: 100.00,
      },
      forecast: [
        { date: 'Aug 5', temp: 14, condition: 'few_clouds' },
        { date: 'Aug 6', temp: 15, condition: 'rain' },
        { date: 'Aug 7', temp: 17, condition: 'clear' },
        { date: 'Aug 8', temp: 12, condition: 'rain' },
        { date: 'Aug 9', temp: 14, condition: 'few_clouds' },
        { date: 'Aug 10', temp: 16, condition: 'few_clouds' },
      ]
    };
    setWeatherData(mockData);
    setView('results');
  } catch (error) {
    console.error("Failed to fetch weather data:", error);
  } finally {
    setLoading(false);
  }
};

// Gemini API call to generate activity suggestions
const generateActivitySuggestions = async (weather, setActivitySuggestions, setLoadingSuggestions) => {
  if (!weather) return;
  setLoadingSuggestions(true);
  setActivitySuggestions([]);
  
  // Construct the prompt for the LLM
  const prompt = `Based on the following weather conditions: a temperature of ${weather.current.temp}°C and a sky condition of '${weather.current.condition_text.toLowerCase()}', suggest 3-4 suitable activities. Provide each activity with a short title and a one-sentence description.`;

  const chatHistory = [{ role: "user", parts: [{ text: prompt }] }];
  const payload = {
      contents: chatHistory,
      generationConfig: {
          responseMimeType: "application/json",
          responseSchema: {
              type: "ARRAY",
              items: {
                  type: "OBJECT",
                  properties: {
                      "title": { "type": "STRING" },
                      "description": { "type": "STRING" }
                  },
                  "propertyOrdering": ["title", "description"]
              }
          }
      }
  };
  const apiKey = "";
  const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-05-20:generateContent?key=${apiKey}`;

  let response;
  let retries = 0;
  const maxRetries = 5;
  let delay = 1000;

  // Implement exponential backoff for API calls
  while (retries < maxRetries) {
      try {
          response = await fetch(apiUrl, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(payload)
          });

          if (response.ok) {
              const result = await response.json();
              if (result.candidates && result.candidates.length > 0 &&
                  result.candidates[0].content && result.candidates[0].content.parts &&
                  result.candidates[0].content.parts.length > 0) {
                  const json = result.candidates[0].content.parts[0].text;
                  const parsedJson = JSON.parse(json);
                  setActivitySuggestions(parsedJson);
              }
              break; // Exit the loop on success
          } else if (response.status === 429) {
              // Too many requests, retry with exponential backoff
              retries++;
              console.warn(`Retry attempt ${retries} due to rate limiting. Retrying in ${delay}ms.`);
              await new Promise(res => setTimeout(res, delay));
              delay *= 2; // Double the delay
          } else {
              console.error("API call failed with status:", response.status);
              break; // Exit the loop on other errors
          }
      } catch (error) {
          console.error("Failed to call Gemini API:", error);
          break; // Exit the loop on fetch errors
      }
  }
  setLoadingSuggestions(false);
};

const WeatherApp = () => {
  // State to manage the app's current view
  const [view, setView] = useState('welcome'); // 'welcome', 'search', 'results'
  
  // State for the latitude and longitude input fields
  const [latitude, setLatitude] = useState('');
  const [longitude, setLongitude] = useState('');
  
  // State for the fetched weather data
  const [weatherData, setWeatherData] = useState(null);
  
  // State to handle loading status for weather data
  const [loading, setLoading] = useState(false);
  
  // State for the forecast filter ('hourly' or 'daily')
  const [filter, setFilter] = useState('daily');
  
  // New state for Gemini API generated suggestions
  const [activitySuggestions, setActivitySuggestions] = useState([]);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);

  // Utility function to get the correct icon based on weather condition
  const getWeatherIcon = (condition) => {
    switch (condition) {
      case 'clear':
        return <Sun className="w-16 h-16 text-orange-400" />;
      case 'cloudy':
        return <Cloud className="w-16 h-16 text-gray-400" />;
      case 'rain':
        return <CloudRain className="w-16 h-16 text-blue-400" />;
      case 'snow':
        return <CloudSnow className="w-16 h-16 text-blue-300" />;
      case 'few_clouds':
        return (
          <div className="relative">
            <Cloud className="w-16 h-16 text-gray-400" />
            <Sun className="absolute -bottom-2 right-0 w-8 h-8 text-orange-400" />
          </div>
        );
      default:
        return <Cloud className="w-16 h-16 text-gray-400" />;
    }
  };

  // Welcome Screen Component
  const WelcomeScreen = () => (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.5 }}
      className="flex flex-col items-center justify-center text-center p-6 sm:p-10"
    >
      <div className="flex items-center text-5xl sm:text-7xl font-bold mb-4 animate-bounce">
        <span className="mr-4">ሰላም</span>
        <span>👋</span>
      </div>
      <p className="max-w-2xl text-lg sm:text-xl text-gray-600 mb-8">
        ይህ የአየር ንብረት መተግበሪያ ነው። በ React ተሰርቶ በ KurazTech webinar ላይ ለማሳየት ተዘጋጀ።
      </p>
      <button
        onClick={() => setView('search')}
        className="flex items-center px-8 py-3 bg-orange-500 hover:bg-orange-600 text-white font-semibold rounded-full shadow-lg transition duration-300 transform hover:scale-105"
      >
        Get Started
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 ml-2" viewBox="0 0 20 20" fill="currentColor">
          <path fillRule="evenodd" d="M10.293 15.707a1 1 0 010-1.414L14.586 10l-4.293-4.293a1 1 0 111.414-1.414l5 5a1 1 0 010 1.414l-5 5a1 1 0 01-1.414 0z" clipRule="evenodd" />
          <path fillRule="evenodd" d="M4.293 15.707a1 1 0 010-1.414L8.586 10 4.293 5.707a1 1 0 011.414-1.414l5 5a1 1 0 010 1.414l-5 5a1 1 0 01-1.414 0z" clipRule="evenodd" />
        </svg>
      </button>
    </motion.div>
  );

  // Search Screen Component
  const SearchScreen = () => (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.5 }}
      className="flex flex-col items-center p-6 sm:p-10 w-full max-w-2xl mx-auto"
    >
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full mb-6">
        <label className="flex flex-col">
          <span className="text-sm font-semibold text-gray-500 mb-1">Latitude</span>
          <input
            type="number"
            value={latitude}
            onChange={(e) => setLatitude(e.target.value)}
            className="p-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-400"
            placeholder="e.g., 8.9806"
          />
        </label>
        <label className="flex flex-col">
          <span className="text-sm font-semibold text-gray-500 mb-1">Longitude</span>
          <input
            type="number"
            value={longitude}
            onChange={(e) => setLongitude(e.target.value)}
            className="p-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-400"
            placeholder="e.g., 38.7578"
          />
        </label>
      </div>
      <button
        onClick={() => fetchWeather(latitude, longitude, setLoading, setWeatherData, setView)}
        disabled={loading}
        className="flex items-center justify-center w-full px-8 py-3 bg-orange-500 hover:bg-orange-600 text-white font-semibold rounded-full shadow-lg transition duration-300 transform hover:scale-105 disabled:bg-gray-400 disabled:transform-none"
      >
        {loading ? (
          <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
        ) : (
          <>
            Search
            <Search className="w-5 h-5 ml-2" />
          </>
        )}
      </button>
    </motion.div>
  );

  // Results Screen Component
  const ResultsScreen = () => {
    if (!weatherData) return null;

    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
        transition={{ duration: 0.5 }}
        className="flex flex-col items-center p-6 sm:p-10 w-full max-w-4xl mx-auto"
      >
        <div className="bg-white p-6 sm:p-8 rounded-2xl shadow-md w-full mb-6">
          <div className="flex flex-col sm:flex-row items-center justify-between">
            {/* Current Weather */}
            <div className="flex items-center mb-4 sm:mb-0">
              {getWeatherIcon(weatherData.current.condition)}
              <div className="flex flex-col ml-4">
                <span className="text-6xl sm:text-7xl font-bold text-gray-800">{weatherData.current.temp}°C</span>
                <span className="text-xs text-gray-500 mt-1">Lat & Lon: {weatherData.lat}° N, {weatherData.lon}° E</span>
              </div>
            </div>
            {/* City and details */}
            <div className="text-center sm:text-right">
              <h2 className="text-3xl sm:text-4xl font-bold text-gray-800">{weatherData.city}</h2>
              <div className="inline-block mt-2 px-3 py-1 bg-orange-100 text-orange-600 rounded-full text-sm font-semibold">
                {weatherData.current.condition_text}
              </div>
              <div className="flex items-center justify-center sm:justify-end mt-4">
                <span className="text-sm text-gray-500 mr-2">WIND SPEED</span>
                <div className="flex items-center px-4 py-2 bg-gray-100 rounded-full">
                  <Wind className="w-5 h-5 text-gray-500 mr-2" />
                  <span className="font-semibold text-gray-800">{weatherData.current.wind_speed}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
        
        {/* Forecast Section */}
        <div className="w-full mb-6">
          <div className="flex items-center justify-start text-sm font-semibold text-gray-500 mb-4">
            <span className="mr-4">FILTER</span>
            <button
              onClick={() => setFilter('hourly')}
              className={`p-2 rounded-full transition-colors duration-200 ${filter === 'hourly' ? 'bg-orange-500 text-white' : 'hover:bg-gray-200'}`}
            >
              Hourly
            </button>
            <button
              onClick={() => setFilter('daily')}
              className={`p-2 rounded-full ml-2 transition-colors duration-200 ${filter === 'daily' ? 'bg-orange-500 text-white' : 'hover:bg-gray-200'}`}
            >
              Daily
            </button>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
            {weatherData.forecast.map((day, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.3, delay: index * 0.1 }}
                className={`flex flex-col items-center p-4 rounded-xl shadow-md transition-all duration-300 ${filter === 'daily' ? 'bg-orange-50' : 'bg-gray-100'}`}
              >
                <span className="text-sm font-semibold text-gray-500">{day.date}</span>
                <div className="my-2">{getWeatherIcon(day.condition)}</div>
                <span className="text-lg font-bold text-gray-800">{day.temp}°C</span>
              </motion.div>
            ))}
          </div>
        </div>

        {/* Gemini API Feature: Activity Suggestions */}
        <div className="w-full bg-white p-6 sm:p-8 rounded-2xl shadow-md">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-xl font-bold">Activity Suggestions</h3>
            <button
              onClick={() => generateActivitySuggestions(weatherData, setActivitySuggestions, setLoadingSuggestions)}
              disabled={loadingSuggestions}
              className="flex items-center px-4 py-2 bg-purple-500 hover:bg-purple-600 text-white font-semibold rounded-full shadow-lg transition duration-300 transform hover:scale-105 disabled:bg-gray-400 disabled:transform-none"
            >
              {loadingSuggestions ? (
                <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
              ) : (
                <>
                  Get Suggestions ✨
                </>
              )}
            </button>
          </div>
          {activitySuggestions.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="mt-4 space-y-4"
            >
              {activitySuggestions.map((suggestion, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.3, delay: index * 0.1 }}
                  className="bg-gray-100 p-4 rounded-lg shadow-sm"
                >
                  <h4 className="font-semibold text-lg text-purple-700">{suggestion.title}</h4>
                  <p className="text-gray-700">{suggestion.description}</p>
                </motion.div>
              ))}
            </motion.div>
          )}
          {activitySuggestions.length === 0 && !loadingSuggestions && (
            <p className="text-gray-500 italic">Click the button above to get activity suggestions based on the weather!</p>
          )}
        </div>
      </motion.div>
    );
  };

  // Main App Component
    return (
    <div className="bg-gray-50 min-h-screen font-sans antialiased text-gray-800 flex flex-col items-center pt-8 pb-16">
      {/* Header */}
      <header className="w-full max-w-4xl px-4 flex justify-between items-center mb-10">
        <div className="flex items-center space-x-2">
          {/* Kuraz Logo Image */}
          <img src={kurazLogo} alt="Kuraz Logo" className="w-10 h-10 object-contain" />
          <span className="text-lg font-bold text-gray-800 hidden sm:block">KurazTech</span>
        </div>
        {view !== 'welcome' && (
          <motion.button
            onClick={() => { setView('welcome'); setActivitySuggestions([]); }}
            className="flex items-center px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-600 font-semibold rounded-full transition-colors duration-300"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            transition={{ duration: 0.3 }}
          >
            <ChevronLeft className="w-4 h-4 mr-1" />
            Go Back
          </motion.button>
        )}
      </header>

      {/* Main Content Area */}
      <main className="w-full max-w-4xl px-4 flex justify-center items-center">
        <AnimatePresence mode="wait">
          {view === 'welcome' && <WelcomeScreen key="welcome" />}
          {view === 'search' && <SearchScreen key="search" />}
          {view === 'results' && <ResultsScreen key="results" />}
        </AnimatePresence>
      </main>
    </div>
  );
};

export default WeatherApp;



