/** 
 * Before coding, go to power shell and type: 
 * After type: npm install --save react react-dom @types/react @types/react-dom
 * This was written by Coco 
 */


/**
 * React is used for UIs 
 * Lucide-react is used for icons
 * 
 */
// Import React hooks - these let us manage data and respond to changes
import { useState, useEffect, useCallback } from 'react';
// Import icons from lucide-react library - these are the little pictures we use in the app
import { Calendar, Clock, Tag, Search, Database, Globe, Plus, Minus } from 'lucide-react';
// Import our database connection and the type definition for database events
import { supabase, HistoricalEvent } from './lib/supabase';
import { listApproved as listApprovedLocal } from './lib/localEvents';
// Import the function to get events from the internet and the type for those events
import { fetchHistoricalEvents, ApiHistoricalEvent } from './lib/historyApi';
// Import the form component that lets users add their own events
import { AddEventForm } from './components/AddEventForm';
import { SimpleAuthProvider, useSimpleAuth } from './context/SimpleAuthContext';
import { AuthPanel } from './components/AuthPanel';
import { AdminDashboard } from './components/AdminDashboard';


/**
 * CombinedEvent is structure of events from the API and the Database. It contains the following:
 * Id of the event 
 * The title of the event with its description
 * The month, day, year of the event
 * The category of the event
 * The source of the event (api or database)
 */
// This defines what information each historical event should have
interface CombinedEvent {
  id: string;        // A unique identifier for each event
  title: string;     // The main title/name of the event
  description: string; // A longer explanation of what happened
  month: number;     // Which month it happened (1-12)
  day: number;       // Which day it happened (1-31)
  year: number;      // Which year it happened (numeric)
  yearDisplay: string; // The year as displayed (may include BC/AD)
  category: string;  // What type of event (Science, Politics, etc.)  
  source: 'api' | 'database'; // Where the event came from - internet or our database
  html?: string;     // HTML content with links (for API events)
  links?: Array<{    // Links to Wikipedia and other sources (for API events)
    title: string;
    link: string;
  }>;
}
/**
 * 
 * @returns 
 */
// This is the main component that makes up our entire app
function MainApp() {
  // Create a list to store all the historical events we find
  const [events, setEvents] = useState<CombinedEvent[]>([]);
  // Keep track of whether we're currently loading data (showing spinner)
  const [loading, setLoading] = useState(false);
  // Store which month the user has selected (starts with current month)
  const [selectedMonth, setSelectedMonth] = useState<number>(new Date().getMonth() + 1);
  // Store which day the user has selected (starts with current day)
  const [selectedDay, setSelectedDay] = useState<number>(new Date().getDate());
  // Store the year the user wants to search for (optional, starts empty)
  const [searchYear, setSearchYear] = useState<string>('');
  // Store which category of events to show (starts with 'all' to show everything)
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  // Whether to show events from the internet API (starts as true)
  const [showApiEvents, setShowApiEvents] = useState(true);
  // Whether to show events from our custom database (starts as true)
  const [showDbEvents, setShowDbEvents] = useState(true);
  // Track if API is blocked
  const [apiBlocked, setApiBlocked] = useState(false);
  
  // Time slider state
  const [selectedYear, setSelectedYear] = useState<number>(Math.min(new Date().getFullYear(), 2025));
  const [zoomLevel, setZoomLevel] = useState<number>(100); // Start at 100 years zoom to show full range
  const [earliestYear, setEarliestYear] = useState<number | null>(null); // Will be set from actual events
  const [latestYear, setLatestYear] = useState<number | null>(null); // Will be set from actual events
  
  // Helper function to parse year string (handles "42 BC", "1969", etc.)
  const parseYear = (yearString: string): number => {
    const yearMatch = yearString.match(/(-?\d+)/);
    if (!yearMatch) return 0;
    const numericYear = parseInt(yearMatch[1]);
    // If the string contains "BC", make it negative
    if (yearString.toLowerCase().includes('bc')) {
      return -Math.abs(numericYear);
    }
    return numericYear;
  };

  // List of all month names for the dropdown menu
  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  // List of all event categories for the dropdown menu
  const categories = ['all', 'Science', 'Politics', 'History', 'Technology', 'Arts', 'Economics'];
  
  // Zoom levels for the time slider
  const zoomLevels = [1, 5, 10, 100];
  const zoomLabels = ['1 Year', '5 Years', '10 Years', '100 Years'];

  // Update earliest/latest year from loaded events
  const updateYearRange = (events: CombinedEvent[]) => {
    if (events.length === 0) return;
    
    const years = events.map(e => e.year).filter(year => !isNaN(year));
    if (years.length > 0) {
      const minYear = Math.min(...years);
      const maxYear = Math.min(Math.max(...years), 2025); // Cap max at 2025
      
      // Update earliest year - set to minYear if not set, or if minYear is earlier
      setEarliestYear(prev => prev === null ? minYear : Math.min(prev, minYear));
      // Update latest year - set to maxYear if not set, or if maxYear is later
      setLatestYear(prev => prev === null ? maxYear : Math.max(prev, maxYear));
    }
  };

  // This function searches for historical events based on user's selections
  const searchEvents = useCallback(async () => {
    setLoading(true); // Show the loading spinner
    try {
      const combinedEvents: CombinedEvent[] = []; // Start with an empty list

      // If user wants to see events from the internet API
      if (showApiEvents) {
        // Get events from the internet for the selected month and day
        const apiEvents = await fetchHistoricalEvents(selectedMonth, selectedDay);
        
        // Check if we got sample data (API was blocked)
        if (apiEvents.length > 0 && apiEvents[0].text.includes('Apollo 11')) {
          setApiBlocked(true);
        } else {
          setApiBlocked(false);
        }
        
        // Convert the internet events to our standard format
        const formattedApiEvents: CombinedEvent[] = apiEvents.map((event: ApiHistoricalEvent) => {
          // Extract a clean title (first sentence or first 80 chars, whichever is shorter)
          const firstSentence = event.text.split('.')[0].trim();
          const truncated = event.text.substring(0, 80).trim();
          const title = firstSentence.length > 0 && firstSentence.length <= 100 
            ? firstSentence 
            : truncated.length < event.text.length 
              ? truncated + '...' 
              : event.text;
          // Parse year - handle formats like "42 BC", "1969", etc.
          const numericYear = parseYear(event.year);
          
          return {
            id: `api-${event.year}-${event.text.substring(0, 20).replace(/\s/g, '-')}`, // Create a unique ID
            title: title.trim(), // Use first sentence or truncated text as title
            description: event.text, // Use full text as description
            month: selectedMonth, // Use the month user selected
            day: selectedDay, // Use the day user selected
            year: numericYear, // Convert year to a number for sorting/filtering
            yearDisplay: event.year, // Keep original year format for display
            category: 'History', // All API events are categorized as History
            source: 'api' as const, // Mark this as coming from the internet
            html: event.html, // Store HTML content with links
            links: event.links // Store links array
          };
        });

        let filteredApiEvents = formattedApiEvents; // Start with all API events
        // If user specified a year, only keep events from that year
        if (searchYear) {
          filteredApiEvents = filteredApiEvents.filter(e => e.year === parseInt(searchYear));
        }
        // If user selected a specific category, only keep events from that category
        if (selectedCategory !== 'all') {
          filteredApiEvents = filteredApiEvents.filter(e => e.category === selectedCategory);
        }
        combinedEvents.push(...filteredApiEvents); // Add filtered events to our list
      }

      // If user wants to see events from our custom store (approved only)
      if (showDbEvents) {
        const local = listApprovedLocal()
          .filter(e => e.month === selectedMonth && e.day === selectedDay)
          .filter(e => (searchYear ? e.year === parseInt(searchYear) : true))
          .filter(e => (selectedCategory !== 'all' ? e.category === selectedCategory : true));
        const formatted: CombinedEvent[] = local.map(e => ({
          id: e.id,
          title: e.title,
          description: e.description,
          month: e.month,
          day: e.day,
          year: e.year,
          yearDisplay: e.year.toString(), // Use numeric year as display for database events
          category: e.category,
          source: 'database',
        }));
        combinedEvents.push(...formatted);
      }

      // Sort all events by year (newest first) and save them
      combinedEvents.sort((a, b) => b.year - a.year);
      setEvents(combinedEvents);
      
      // Update the year range based on loaded events
      updateYearRange(combinedEvents);
    } catch (error) {
      console.error('Error fetching events:', error);
      setEvents([]); // If something goes wrong, show no events
    } finally {
      setLoading(false); // Hide the loading spinner
    }
  }, [selectedMonth, selectedDay, searchYear, selectedCategory, showApiEvents, showDbEvents]);

  // Time slider functions
  const handleSliderChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const newYear = parseInt(event.target.value);
    const sliderRange = getSliderRange();
    // Ensure the year is within the valid range
    const cappedYear = Math.min(Math.max(newYear, sliderRange.min), sliderRange.max);
    setSelectedYear(cappedYear);
    setSearchYear(cappedYear.toString());
  };

  const handleZoomIn = () => {
    const currentIndex = zoomLevels.indexOf(zoomLevel);
    if (currentIndex < zoomLevels.length - 1) {
      setZoomLevel(zoomLevels[currentIndex + 1]);
    }
  };

  const handleZoomOut = () => {
    const currentIndex = zoomLevels.indexOf(zoomLevel);
    if (currentIndex > 0) {
      setZoomLevel(zoomLevels[currentIndex - 1]);
    }
  };

  // Calculate slider range based on zoom level
  const getSliderRange = () => {
    // If we don't have year range yet, use current year as default
    const minYear = earliestYear ?? new Date().getFullYear();
    const maxYear = latestYear ?? new Date().getFullYear();
    
    // For zoomed views, show a range around the selected year
    // For full range, show from earliest to latest
    if (zoomLevel === 100) {
      // At maximum zoom, show full range
      return {
        min: minYear,
        max: maxYear
      };
    } else {
      // For other zoom levels, show range around selected year
      const range = zoomLevel * 50; // Show 50 increments of the zoom level
      return {
        min: Math.max(minYear, selectedYear - range),
        max: Math.min(maxYear, selectedYear + range)
      };
    }
  };

  const sliderRange = getSliderRange();

  // This runs automatically whenever the user changes any search settings
  useEffect(() => {
    searchEvents(); // Go find events based on current settings
  }, [searchEvents]);

  // This function converts month/day/year numbers into a nice readable date
  const formatDate = (month: number, day: number, year: number) => {
    return `${months[month - 1]} ${day}, ${year}`; // Example: "January 15, 1969"
  };

  const { profile } = useSimpleAuth();
  const [showAdmin, setShowAdmin] = useState(false);

  // This is what gets displayed on the webpage
  return (
    // Main container with dark gradient background that fills the whole screen
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      {/* Content container with max width and padding */}
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        {/* Header section with title and subtitle */}
        <header className="text-center mb-12">
          <div className="flex items-center justify-center mb-4">
            {/* Clock icon */}
            <Clock className="w-12 h-12 text-blue-400 mr-3" />
            {/* Main title */}
            <h1 className="text-5xl font-bold text-white">Historical Events</h1>
          </div>
          {/* Subtitle explaining what the app does */}
          <p className="text-slate-300 text-lg">Discover what happened on any date in history</p>
        </header>

        {/* Auth panel and Admin toggle */}
        <div className="mb-8 grid grid-cols-1 gap-4">
          <AuthPanel />
          {profile?.role === 'admin' && (
            <div className="text-right">
              <button
                onClick={() => setShowAdmin((v) => !v)}
                className="px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-lg"
              >
                {showAdmin ? 'Hide Admin Dashboard' : 'Open Admin Dashboard'}
              </button>
            </div>
          )}
          {showAdmin && profile?.role === 'admin' && (
            <AdminDashboard />
          )}
        </div>

        {/* Time Slider Section */}
        <div className="bg-slate-800/50 backdrop-blur-sm rounded-2xl shadow-2xl p-6 mb-8 border border-slate-700">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-white flex items-center">
              <Clock className="w-5 h-5 text-blue-400 mr-2" />
              Time Slider
            </h2>
            
            {/* Zoom Controls */}
            <div className="flex items-center gap-2">
              <button
                onClick={handleZoomOut}
                disabled={zoomLevel === zoomLevels[0]}
                className="p-2 bg-slate-700 hover:bg-slate-600 disabled:bg-slate-800 disabled:opacity-50 text-white rounded-lg transition"
                title="Zoom Out"
              >
                <Minus className="w-4 h-4" />
              </button>
              
              <span className="text-slate-300 text-sm px-3 py-1 bg-slate-700 rounded-lg">
                {zoomLabels[zoomLevels.indexOf(zoomLevel)]}
              </span>
              
              <button
                onClick={handleZoomIn}
                disabled={zoomLevel === zoomLevels[zoomLevels.length - 1]}
                className="p-2 bg-slate-700 hover:bg-slate-600 disabled:bg-slate-800 disabled:opacity-50 text-white rounded-lg transition"
                title="Zoom In"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>
          </div>
          
          {/* Time Slider */}
          <div className="space-y-4">
            <div className="flex items-center justify-between text-sm text-slate-400">
              <span>{sliderRange.min < 0 ? `${Math.abs(sliderRange.min)} BC` : sliderRange.min}</span>
              <span className="text-blue-400 font-semibold text-lg">
                {selectedYear < 0 ? `${Math.abs(selectedYear)} BC` : selectedYear}
              </span>
              <span>{sliderRange.max < 0 ? `${Math.abs(sliderRange.max)} BC` : sliderRange.max}</span>
            </div>
            
            <div className="relative w-full h-8 flex items-center group">
              {/* Background track */}
              <div className="absolute inset-0 h-2 bg-slate-700 rounded-lg group-hover:bg-slate-600 transition-colors"></div>
              
              {/* Container for the blue bar to prevent overflow */}
              <div className="absolute inset-0 h-2 overflow-hidden rounded-lg">
                {/* Active range indicator - shows the current zoom level as a bar */}
                <div 
                  className="absolute h-2 bg-gradient-to-r from-blue-500 to-blue-400 rounded-lg transition-all duration-300 shadow-lg group-hover:shadow-blue-500/25"
                  style={{
                    left: `${Math.max(0, ((selectedYear - sliderRange.min) / (sliderRange.max - sliderRange.min)) * 100 - (zoomLevel / (sliderRange.max - sliderRange.min)) * 50)}%`,
                    width: `${Math.max(4, (zoomLevel / (sliderRange.max - sliderRange.min)) * 100)}%`
                  }}
                ></div>
              </div>
              
              {/* Invisible slider input - covers the entire bar area */}
              <input
                type="range"
                min={sliderRange.min}
                max={sliderRange.max}
                step={zoomLevel}
                value={selectedYear}
                onChange={handleSliderChange}
                className="absolute inset-0 w-full h-8 bg-transparent appearance-none cursor-pointer slider-thumb opacity-0"
              />
            </div>
            
            <div className="text-center text-slate-400 text-sm">
              Drag the slider to explore different years • Current zoom: {zoomLevel} year{zoomLevel !== 1 ? 's' : ''} per step
            </div>
          </div>
        </div>

        {/* Warning message if API is blocked */}
        {apiBlocked && (
          <div className="bg-yellow-900/50 backdrop-blur-sm rounded-2xl shadow-2xl p-6 mb-8 border border-yellow-600">
            <div className="flex items-center mb-3">
              <div className="w-6 h-6 text-yellow-400 mr-3">⚠️</div>
              <h3 className="text-xl font-semibold text-yellow-300">API Blocked by Ad Blocker</h3>
            </div>
            <p className="text-yellow-200 mb-3">
              Your ad blocker is preventing the app from fetching real historical events. 
              You're seeing sample data instead.
            </p>
            <p className="text-yellow-300 text-sm">
              <strong>To fix:</strong> Disable your ad blocker for localhost:5173 or add this site to your whitelist.
            </p>
          </div>
        )}

        {/* Search controls section with dark background and rounded corners */}
        <div className="bg-slate-800/50 backdrop-blur-sm rounded-2xl shadow-2xl p-8 mb-8 border border-slate-700">
          <div className="flex items-center mb-6">
            {/* Search icon */}
            <Search className="w-6 h-6 text-blue-400 mr-3" />
            {/* Section title */}
            <h2 className="text-2xl font-semibold text-white">Search by Date</h2>
          </div>

          {/* Grid of search controls - 4 columns on desktop, 1 on mobile */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            {/* Month selector dropdown */}
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">Month</label>
              <select
                value={selectedMonth} // Show currently selected month
                onChange={(e) => setSelectedMonth(parseInt(e.target.value))} // Update when user changes selection
                className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
              >
                {/* Create an option for each month */}
                {months.map((month, index) => (
                  <option key={month} value={index + 1}>
                    {month}
                  </option>
                ))}
              </select>
            </div>

            {/* Day selector dropdown */}
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">Day</label>
              <select
                value={selectedDay} // Show currently selected day
                onChange={(e) => setSelectedDay(parseInt(e.target.value))} // Update when user changes selection
                className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
              >
                {/* Create options for days 1-31 */}
                {Array.from({ length: 31 }, (_, i) => i + 1).map((day) => (
                  <option key={day} value={day}>
                    {day}
                  </option>
                ))}
              </select>
            </div>

            {/* Year input field (optional) */}
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">Year (Optional)</label>
              <input
                type="number" // Only allow numbers
                value={searchYear} // Show currently entered year
                onChange={(e) => setSearchYear(e.target.value)} // Update when user types
                placeholder="Any year" // Hint text when field is empty
                className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
              />
            </div>

            {/* Category selector dropdown */}
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">Category</label>
              <select
                value={selectedCategory} // Show currently selected category
                onChange={(e) => setSelectedCategory(e.target.value)} // Update when user changes selection
                className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
              >
                {/* Create an option for each category */}
                {categories.map((category) => (
                  <option key={category} value={category}>
                    {category.charAt(0).toUpperCase() + category.slice(1)} {/* Capitalize first letter */}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Toggle switches and current selection display */}
          <div className="space-y-4">
            {/* Toggle switches for data sources */}
            <div className="flex items-center justify-center gap-6">
              {/* Toggle for internet API events */}
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox" // This is a checkbox input
                  checked={showApiEvents} // Checked if we want to show API events
                  onChange={(e) => setShowApiEvents(e.target.checked)} // Update when user clicks
                  className="w-4 h-4 rounded border-slate-600 bg-slate-700 text-blue-500 focus:ring-2 focus:ring-blue-500"
                />
                {/* Globe icon to represent internet events */}
                <Globe className="w-4 h-4 text-green-400" />
                <span className="text-slate-300">API Events</span>
              </label>
              {/* Toggle for custom database events */}
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox" // This is a checkbox input
                  checked={showDbEvents} // Checked if we want to show database events
                  onChange={(e) => setShowDbEvents(e.target.checked)} // Update when user clicks
                  className="w-4 h-4 rounded border-slate-600 bg-slate-700 text-blue-500 focus:ring-2 focus:ring-blue-500"
                />
                {/* Database icon to represent custom events */}
                <Database className="w-4 h-4 text-blue-400" />
                <span className="text-slate-300">Custom Events</span>
              </label>
            </div>
            {/* Display what date we're currently searching */}
            <div className="text-center">
              <p className="text-slate-400">
                Showing events for{' '}
                <span className="text-blue-400 font-semibold">
                  {months[selectedMonth - 1]} {selectedDay} {/* Show selected month and day */}
                </span>
                {/* If user specified a year, show it too */}
                {searchYear && (
                  <span className="text-blue-400 font-semibold">, {searchYear}</span>
                )}
              </p>
            </div>
          </div>
        </div>

        {/* Show different content based on loading state and results */}
        {loading ? (
          // Show loading spinner while fetching data
          <div className="text-center py-12">
            {/* Spinning circle animation */}
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-400"></div>
            <p className="text-slate-300 mt-4">Loading events...</p>
          </div>
        ) : events.length > 0 ? (
          // Show events if we found any
          <div className="space-y-6">
            {/* Header showing how many events were found */}
            <h3 className="text-2xl font-semibold text-white mb-4">
              Found {events.length} event{events.length !== 1 ? 's' : ''} {/* Add 's' for plural */}
            </h3>
            {/* Loop through each event and create a card for it */}
            {events.map((event) => (
              <div
                key={event.id} // Each card needs a unique key
                className="bg-slate-800/50 backdrop-blur-sm rounded-xl shadow-lg p-6 border border-slate-700 hover:border-blue-500 transition-all duration-300 hover:shadow-xl hover:shadow-blue-500/10"
              >
                {/* Event header with title and badges */}
                <div className="mb-3">
                  {/* Event title - full width */}
                  <h4 className="text-xl font-semibold text-white mb-3 leading-relaxed">{event.title}</h4>
                  {/* Badges showing category and source */}
                  <div className="flex gap-2">
                    {/* Category badge */}
                    <span className="px-3 py-1 bg-blue-500/20 text-blue-300 rounded-full text-sm font-medium flex items-center">
                      <Tag className="w-3 h-3 mr-1" />
                      {event.category}
                    </span>
                    {/* Source badge - different colors for API vs database */}
                    <span className={`px-3 py-1 rounded-full text-sm font-medium flex items-center ${
                      event.source === 'api'
                        ? 'bg-green-500/20 text-green-300' // Green for API events
                        : 'bg-blue-500/20 text-blue-300' // Blue for database events
                    }`}>
                      {/* Show different icons based on source */}
                      {event.source === 'api' ? <Globe className="w-3 h-3 mr-1" /> : <Database className="w-3 h-3 mr-1" />}
                      {event.source === 'api' ? 'API' : 'Custom'}
                    </span>
                  </div>
                </div>
                {/* Event date */}
                <div className="flex items-center text-slate-400 mb-3">
                  <Calendar className="w-4 h-4 mr-2" />
                  <span className="font-medium">
                    {months[event.month - 1]} {event.day}, {event.yearDisplay}
                  </span>
                </div>
                {/* Event description */}
                <p className="text-slate-300 leading-relaxed mb-3">{event.description}</p>
                {/* Links section for API events */}
                {event.links && event.links.length > 0 && (
                  <div className="mt-4 pt-4 border-t border-slate-700">
                    <h5 className="text-sm font-semibold text-slate-400 mb-2 flex items-center">
                      <Globe className="w-4 h-4 mr-1" />
                      Related Links:
                    </h5>
                    <div className="flex flex-wrap gap-2">
                      {event.links.map((link, index) => (
                        <a
                          key={index}
                          href={link.link}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="px-3 py-1.5 bg-slate-700 hover:bg-slate-600 text-blue-300 hover:text-blue-200 rounded-lg text-sm transition-colors inline-flex items-center gap-1"
                        >
                          <span>{link.title}</span>
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                          </svg>
                        </a>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          // Show empty state if no events found
          <div className="text-center py-12 bg-slate-800/30 rounded-xl border border-slate-700">
            {/* Large calendar icon */}
            <Calendar className="w-16 h-16 text-slate-600 mx-auto mb-4" />
            <p className="text-slate-400 text-lg">No events found for this date</p>
            <p className="text-slate-500 text-sm mt-2">Try selecting a different date or category</p>
          </div>
        )}

        {/* Add Event Form - floating button that opens a modal */}
        <AddEventForm
          onEventAdded={searchEvents} // When a new event is added, refresh the search
          defaultMonth={selectedMonth} // Pre-fill the form with currently selected month
          defaultDay={selectedDay} // Pre-fill the form with currently selected day
        />
      </div>
    </div>
  );
}

function App() {
  return (
    <SimpleAuthProvider>
      <MainApp />
    </SimpleAuthProvider>
  );
}

// Export this component so it can be used in other files
export default App;
