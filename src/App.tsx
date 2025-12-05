/*
READ THIS FIRST: 
This is the main component that makes up the entire website.
Following features this file does:
- Fetches historical events from the internet API and the local database
- Displays the historical events in a timeline
- Allows users to search for events by keyword, category, and year
- Allows users to add their own events to the database
- Allows users to sign in and out of the website
- Allows users to view the admin dashboard
*/

// React is used for UIs 
// Lucide-react is used for icons
// localEvents is used to store and manage events locally in the browser
// historyApi is used to fetch historical events from the internet API
// AddEventForm is used to add events to the database
// AuthContext is used to manage authentication with Supabase (fully functional) 
// AuthPanel is used to display the authentication panel
// AdminDashboard is used to display the admin dashboard
// TimelineSlider is used to display the timeline slider

// Import React hooks - these let us manage data and respond to changes
import { useState, useEffect, useCallback } from 'react';
// Import icons from lucide-react library - these are the little pictures we use in the app
import { Calendar, Clock, Tag, Search, Database, Globe } from 'lucide-react';
// Import our database connection and the type definition for database events
import { listApproved as listApprovedLocal } from './lib/localEvents';
// Import the function to get events from the internet and the type for those events
import { fetchHistoricalEvents, ApiHistoricalEvent } from './lib/historyApi';
// Import the form component that lets users add their own events
import { AddEventForm } from './components/AddEventForm';
import { useAuth } from './context/AuthContext';
import { AuthPanel } from './components/AuthPanel';
import { AdminDashboard } from './components/AdminDashboard';
import { TimelineSlider } from './components/TimelineSlider';


/**
 * CombinedEvent is structure of events from the API and the Database. It contains the following:
 * Id of the event 
 * The title of the event with its description
 * The month, day, year of the event
 * The category of the event
 * The source of the event (api or database)
 */
// This defines what information each historical event should have
export interface CombinedEvent {
  id: string;        // A unique identifier for each event
  title: string;     // The main title/name of the event
  description: string; // A longer explanation of what happened
  month: number;     // Which month it happened (1-12)
  day: number;       // Which day it happened (1-31)
  year: number;      // Which year it happened (numeric)
  yearDisplay: string; // The year as displayed (may include BC/AD)
  category: string[];  // What type of event (can have multiple categories)  
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
// This is the main component that makes up the entire website 
function MainApp() {
  
  const [events, setEvents] = useState<CombinedEvent[]>([]); // Create a list to store all the historical events we find
  
  const [allEventsForDate, setAllEventsForDate] = useState<CombinedEvent[]>([]); // Store all events for the selected month/day (without year filter) for bounds calculation

  const [loading, setLoading] = useState(false); // Keep track of whether we're currently loading data (showing spinner)
  
  const [selectedMonth, setSelectedMonth] = useState<number>(new Date().getMonth() + 1); // Store which month the user has selected (starts with current month)
  
  const [selectedDay, setSelectedDay] = useState<number>(new Date().getDate()); // Store which day the user has selected (starts with current day)
  
  const [searchYear, setSearchYear] = useState<string>(''); // Store which year the user has selected (starts with empty string)
 
  const [selectedCategory, setSelectedCategory] = useState<string>('all');  // Store which category of events to show (starts with 'all' to show everything)

  const [searchKeywords, setSearchKeywords] = useState<string>(''); // Store keyword search text (starts with empty string)

  const [zoomedBounds, setZoomedBounds] = useState<{ minYear: number; maxYear: number } | null>(null); // Store zoomed bounds from timeline slider

  const [showApiEvents, setShowApiEvents] = useState(true); // Whether to show events from the internet API (starts as true)
  
  const [showDbEvents, setShowDbEvents] = useState(true); // Whether to show events from our custom database (starts as true)
  
  const [apiBlocked, setApiBlocked] = useState(false); // Track if API is blocked
  
  
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

  // Helper function to remove punctuation causing errors in searching and normalize text for searching (only words)
  const normalizeForSearch = (text: string): string => {
    return text.toLowerCase().replace(/[^\w\s]/g, ' ').replace(/\s+/g, ' ').trim();// Remove all punctuation and keep only alphanumeric characters and spaces
  };

  // Function to extract a proper title from event text, handling abbreviations
  const extractTitle = (text: string): string => {

    // Common abbreviations that end with period. So the code below will not treat them as the end of a sentence unless it is at the very end of the string.
    const abbreviations = ['U.S.', 'U.K.', 'Dr.', 'Mr.', 'Mrs.', 'Ms.', 'Prof.', 'Sr.', 'Jr.', 'Inc.', 'Ltd.', 'Corp.', 'vs.', 'etc.', 'e.g.', 'i.e.', 'a.m.', 'p.m.', 'A.D.', 'B.C.'];
    
    // Look for sentence endings: period followed by space and capital letter
    // This pattern indicates a real sentence boundary
    const sentenceEndRegex = /\.\s+[A-Z]/;
    const match = text.match(sentenceEndRegex);
    
    if (match && match.index !== undefined) {
      const sentenceEndIndex = match.index + 1; // +1 to include the period
      const potentialTitle = text.substring(0, sentenceEndIndex).trim();
      
      // Check if this looks like a real sentence (not just an abbreviation)
      // If the text before the period is very short (like "U.S."), continue searching
      const textBeforePeriod = potentialTitle.substring(0, potentialTitle.length - 1).trim();
      const isLikelyAbbreviation = abbreviations.some(abbr => 
        textBeforePeriod === abbr.replace('.', '') || 
        textBeforePeriod.endsWith(' ' + abbr.replace('.', '')) ||
        potentialTitle === abbr
      );
      
      // If it's a reasonable length and not just an abbreviation, use it
      if (!isLikelyAbbreviation && potentialTitle.length > 10 && potentialTitle.length <= 200) {
        return potentialTitle;
      }
      
      // If we found an abbreviation, look for the next sentence ending
      const nextMatch = text.substring(sentenceEndIndex + 1).match(sentenceEndRegex);
      if (nextMatch && nextMatch.index !== undefined) {
        const nextSentenceEnd = sentenceEndIndex + 1 + nextMatch.index + 1;
        const nextTitle = text.substring(0, nextSentenceEnd).trim();
        if (nextTitle.length > 10 && nextTitle.length <= 200) {
          return nextTitle;
        }
      }
    }
    
    // Fallback: look for any period+space pattern, but skip if it's clearly an abbreviation
    const simplePeriodIndex = text.indexOf('. ');
    if (simplePeriodIndex > 0 && simplePeriodIndex <= 200) {
      const candidate = text.substring(0, simplePeriodIndex + 1).trim();
      // Check if it's not just a common abbreviation
      const isAbbreviation = abbreviations.some(abbr => candidate === abbr || candidate.endsWith(' ' + abbr));
      if (!isAbbreviation && candidate.length > 10) {
        return candidate;
      }
    }
    
    // This is a fallback to ensure the title is not too long. 
    return text.length > 150 ? text.substring(0, 150).trim() + '...' : text.trim();
  };

  // List of all month names for the dropdown menu
  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  // List of all event categories for the dropdown menu
  const categories = ['all', 'General', 'Politics', 'Science', 'Economics', 'Military', 'People', 'Technology'];
  
  // Keyword-based categorization system
  const categoryKeywords: Record<string, string[]> = {
    Politics: [
      "government", "state", "nation", "republic", "empire", "kingdom", "monarchy", "dynasty",
      "parliament", "congress", "senate", "assembly", "cabinet", "ministry", "council", "judiciary",
      "court", "chancellor", "prime minister", "president", "governor", "mayor", "diplomat",
      "ambassador", "constitution", "charter", "charters", "chartered", "chartering",
      "decree", "decrees", "decreed", "decreeing",
      "proclamation", "treaty", "alliance",
      "pact", "agreement", "resolution", "legislation", "law", "amendment", "bill", "referendum",
      "plebiscite",
      "mandate", "mandates", "mandated", "mandating",
      "sovereignty", "jurisdiction", "citizenship", "immigration",
      "borders",
      "annexation", "secession", "independence", "unification", "dissolution",
      "federation", "confederation", "colony", "colonialism", "decolonization", "imperialism",
      "nationalism", "socialism", "communism", "capitalism", "liberalism", "conservatism",
      "fascism", "anarchism", "populism", "authoritarianism", "totalitarianism", "democracy",
      "oligarchy", "aristocracy", "bureaucracy",
      "reform", "reforms", "reformed", "reforming",
      "revolution", "coup", "uprising",
      "rebellion",
      "protest", "protests", "protested", "protesting",
      "demonstration", "civil unrest", "civil rights", "human rights",
      "advocacy", "activism",
      "campaign", "campaigns", "campaigned", "campaigning",
      "corruption", "scandal", "censorship", "propaganda",
      "sanction", "sanctions", "sanctioned", "sanctioning",
      "embargo", "embargoes", "embargoed", "embargoing",
      "diplomacy", "negotiation",
      "veto", "vetoes", "vetoed", "vetoing",
      "executive order", "policy",
      "governance", "regulation", "oversight", "transparency",
      "election", "inauguration",
      "impeachment", "succession",
      "taxation",
      "budget", "budgets", "budgeted", "budgeting",
      "welfare", "public service", "statecraft",
      "geopolitics"
    ],
  
    Science: [
      "experiment", "experiments", "experimented", "experimenting",
      "discovery",
      "hypothesis", "theory", "law",
      "observation", "measurement",
      "analysis", "calculation", "classification", "modeling", "simulation", "prediction",
      "research", "researches", "researched", "researching",
      "publication", "peer review", "dataset", "laboratory", "fieldwork", "specimen",
      "sample", "microscope", "telescope", "particle", "atom", "molecule", "DNA", "RNA", "genome",
      "cell", "organism", "species", "evolution", "adaptation", "biodiversity", "ecology",
      "climate", "climate change", "atmosphere", "geology", "tectonics", "volcano", "earthquake",
      "magnetism", "radiation", "energy", "quantum", "relativity", "thermodynamics", "gravity",
      "motion", "wave", "optics", "astronomy", "supernova", "nebula", "galaxy", "black hole",
      "comet", "asteroid", "meteor", "chemistry", "reaction", "compound", "solution", "physics",
      "electronics", "kinetics", "biology", "anatomy", "physiology", "botany", "zoology",
      "microbiology", "genetics", "biotechnology", "medicine", "vaccine", "drug", "diagnosis",
      "treatment", "pathology", "epidemiology", "statistics", "mathematics", "algebra", "calculus",
      "geometry", "number theory", "robotics", "nanotechnology", "materials science", "engineering",
      "computing", "algorithms", "data science", "ecology", "conservation", "renewable energy",
      "planetary science", "space exploration", "biophysics", "astrobiology"
    ],
  
    Economics: [
      "economy", "economic policy", "recession", "depression", "inflation", "hyperinflation",
      "deflation", "stagflation", "unemployment", "labor", "wages", "minimum wage", "living wage",
      "capital", "investment",
      "trade", "trades", "traded", "trading",
      "exports", "imports", "tariffs", "subsidies", "market",
      "supply", "demand", "price", "competition", "monopoly", "oligopoly", "free market",
      "capitalism", "social market", "privatization", "nationalization", "finance", "banking",
      "interest rates", "credit", "debt", "bond", "stock market", "crash", "boom", "GDP",
      "industrialization", "globalization", "consumerism", "commerce", "entrepreneurship",
      "corporation", "business", "profit", "loss", "bankruptcy", "inflation rate", "exchange rate",
      "currency", "trade route", "merchants", "economist", "economic growth", "fiscal policy",
      "monetary policy", "central bank", "Wall Street", "commercial trade", "economic sanctions",
      "import restrictions", "export controls", "taxation", "budget deficit", "surplus",
      "economic collapse", "economic recovery"
    ],
  
    Military: [
      "war",
      "battle", "battles", "battled", "battling",
      "conflict",
      "campaign", "campaigns", "campaigned", "campaigning",
      "operation", "mission",
      "assault", "assaults", "assaulted", "assaulting",
      "offensive", "defensive",
      "raid", "raids", "raided", "raiding",
      "siege",
      "ambush", "ambushes", "ambushed", "ambushing",
      "skirmish", "skirmishes", "skirmished", "skirmishing",
      "invasion", "occupation", "liberation",
      "retreat", "retreats", "retreated", "retreating",
      "surrender", "surrenders", "surrendered", "surrendering",
      "armistice", "ceasefire", "truce", "peace treaty",
      "strategy", "tactics", "maneuver", "formation", "mobilization", "conscription", "enlistment",
      "deployment", "logistics", "supply lines", "fortifications", "trenches", "bunkers",
      "naval fleet", "army", "infantry", "cavalry", "artillery", "armored division", "marines",
      "navy", "air force", "special forces", "paratroopers", "commandos", "guerrilla",
      "insurgency", "counterinsurgency", "militia", "mercenary", "general", "commander",
      "colonel", "captain", "lieutenant", "sergeant", "soldier", "veteran", "intelligence",
      "reconnaissance",
      "espionage",
      "sabotage", "sabotages", "sabotaged", "sabotaging",
      "codebreaking", "encryption", "radar", "sonar",
      "missile", "rocket", "bomb", "bombs", "bombed", "bombing",
      "ammunition", "firearm", "rifle", "pistol", "tank", "drone",
      "helicopter", "aircraft", "jet", "fighter", "submarine", "battleship", "carrier",
      "chemical weapons", "biological weapons", "nuclear weapons", "wartime production",
      "demilitarization", "war crimes", "tribunal", "occupation forces"
    ],
  
    People: [
      "birth", "death", "burial", "coronation", "inauguration", "marriage", "divorce",
      "ascension", "abdication", "exile", "pilgrimage", "biography", "legacy", "influence",
      "childhood", "adulthood", "career", "retirement", "achievements", "accomplishments",
      "discoveries", "creations", "awards", "honors", "recognition", "leadership", "presidency",
      "kingship", "rulership", "command",
      "activism", "advocacy",
      "protest", "protests", "protested", "protesting",
      "speech",
      "philosophy", "teachings", "writings", "publication", "invention", "exploration", "voyage",
      "expedition", "migration", "settlement", "education", "mentorship", "training",
      "apprenticeship", "scandal", "downfall", "assassination", "illness", "recovery",
      "humanitarian work", "charity", "scholarship",
      "debate", "debates", "debated", "debating",
      "collaboration", "rivalry",
      "partnership", "inspiration", "innovation", "resistance", "reform", "reforms", "reformed", "reforming",
      "creativity", "authorship", "performance", "composition", "breakthrough", "public service"
    ],
  
    Technology: [
      "invention", "innovation", "breakthrough", "prototype", "patent", "blueprint",
      "architecture", "system", "hardware", "software", "firmware", "algorithm", "code",
      "programming", "computing", "processors", "chip", "microchip", "semiconductor",
      "transistor", "circuit", "motherboard", "memory", "storage", "database", "networking",
      "ethernet", "wireless", "radio", "telecommunications", "satellite", "fiber optics",
      "robotics", "automation", "AI", "machine learning", "deep learning", "neural networks",
      "blockchain", "cybersecurity", "encryption", "cryptography", "quantum computing",
      "virtual reality", "augmented reality", "sensors", "IoT", "drone", "industrial machinery",
      "engines", "turbines", "generators", "battery", "electricity", "power grid", "solar panels",
      "renewable energy", "nuclear energy", "automotive technology", "transportation",
      "railway", "aviation", "aerospace", "spacecraft", "rocket", "lander", "rover", "telescope",
      "medical devices", "MRI", "X-ray", "surgical robots", "bioengineering", "nanotechnology",
      "manufacturing", "3D printing", "fabrication",
      "design", "designs", "designed", "designing",
      "engineering", "user interface",
      "operating system", "mobile device", "smartphone", "computer", "console", "internet",
      "web", "cloud computing",
      "deployment",
      "release", "releases", "released", "releasing",
      "upgrade", "upgrades", "upgraded", "upgrading",
      "versioning", "maintenance"
    ]
  };

  // Function to automatically categorize events based on keywords
  const categorizeEvent = (title: string, description: string): string[] => {
    const text = normalizeForSearch(title + ' ' + description);
    const matchedCategories: string[] = [];
    
    // Check each category's keywords
    for (const [category, keywords] of Object.entries(categoryKeywords)) {
      // Check if any keyword from this category appears in the text
      if (keywords.some(keyword => {
        const normalizedKeyword = normalizeForSearch(keyword);
        // Use word boundary matching to avoid substring false positives
        // For multi-word keywords, check if the phrase appears
        // For single words, use word boundaries
        if (normalizedKeyword.includes(' ')) {
          // Multi-word keyword: check if the phrase appears
          return text.includes(normalizedKeyword);
        } else {
          // Single word: use word boundary regex to match whole words only
          const wordBoundaryRegex = new RegExp(`\\b${normalizedKeyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i');
          return wordBoundaryRegex.test(text);
        }
      })) {
        matchedCategories.push(category);
      }
    }
    
    // If no categories matched, default to 'General'
    return matchedCategories.length > 0 ? matchedCategories : ['General'];
  };

  // This function fetches all events for the selected month/day (without filters) for bounds calculation
  const fetchAllEventsForDate = useCallback(async () => {
    try {
      const allEvents: CombinedEvent[] = [];

      // Fetch all API events for the selected month and day
      if (showApiEvents) {
        const apiEvents = await fetchHistoricalEvents(selectedMonth, selectedDay);
        
        const formattedApiEvents: CombinedEvent[] = apiEvents.map((event: ApiHistoricalEvent) => {
          // Extract a clean title using smart sentence detection
          const title = extractTitle(event.text);
          const numericYear = parseYear(event.year);
          
          // Automatically categorize based on keywords
          const autoCategories = categorizeEvent(title, event.text);
          
          return {
            id: `api-${event.year}-${event.text.substring(0, 20).replace(/\s/g, '-')}`,
            title: title.trim(),
            description: event.text,
            month: selectedMonth,
            day: selectedDay,
            year: numericYear,
            yearDisplay: event.year,
            category: autoCategories,
            source: 'api' as const,
            html: event.html,
            links: event.links
          };
        });
        allEvents.push(...formattedApiEvents);
      }

      // Fetch all database events for the selected month and day
      if (showDbEvents) {
        const local = listApprovedLocal()
          .filter(e => (selectedMonth === 0 || e.month === selectedMonth) && (selectedDay === 0 || e.day === selectedDay));
        const formatted: CombinedEvent[] = local.map(e => {
          // Convert single category string to array, and also apply auto-categorization
          const existingCategory = e.category && e.category !== 'General' ? [e.category] : [];
          const autoCategories = categorizeEvent(e.title, e.description);
          // Combine existing category with auto-categorized ones, removing duplicates
          const allCategories = Array.from(new Set([...existingCategory, ...autoCategories]));
          
          return {
            id: e.id,
            title: e.title,
            description: e.description,
            month: e.month,
            day: e.day,
            year: e.year,
            yearDisplay: e.year.toString(),
            category: allCategories.length > 0 ? allCategories : ['General'],
            source: 'database',
          };
        });
        allEvents.push(...formatted);
      }

      allEvents.sort((a, b) => b.year - a.year);
      setAllEventsForDate(allEvents);
    } catch (error) {
      console.error('Error fetching all events for date:', error);
      setAllEventsForDate([]);
    }
  }, [selectedMonth, selectedDay, showApiEvents, showDbEvents]);

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
        // Only check for blocking if we have valid month/day selections (not both blank)
        // When both are blank, we might get no results which shouldn't be considered blocking
        if (selectedMonth !== 0 && selectedDay !== 0) {
          if (apiEvents.length > 0 && apiEvents[0].text.includes('Apollo 11')) {
            setApiBlocked(true);
          } else {
            setApiBlocked(false);
          }
        } else {
          // When selections are blank, don't consider it as blocking
          setApiBlocked(false);
        }
        
        // Convert the internet events to our standard format
        const formattedApiEvents: CombinedEvent[] = apiEvents.map((event: ApiHistoricalEvent) => {
          // Extract a clean title using smart sentence detection
          const title = extractTitle(event.text);
          // Parse year - handle formats like "42 BC", "1969", etc.
          const numericYear = parseYear(event.year);
          
          // Automatically categorize based on keywords
          const autoCategories = categorizeEvent(title, event.text);
          
          return {
            id: `api-${event.year}-${event.text.substring(0, 20).replace(/\s/g, '-')}`, // Create a unique ID
            title: title.trim(), // Use first sentence or truncated text as title
            description: event.text, // Use full text as description
            month: selectedMonth, // Use the month user selected
            day: selectedDay, // Use the day user selected
            year: numericYear, // Convert year to a number for sorting/filtering
            yearDisplay: event.year, // Keep original year format for display
            category: autoCategories, // Automatically categorized based on keywords
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
          filteredApiEvents = filteredApiEvents.filter(e => e.category.includes(selectedCategory));
        }
        // Keyword search: only works if both month and day are selected
        if (searchKeywords.trim()) {
          if (selectedMonth === 0 || selectedDay === 0) {
            // If keywords provided but month or day is blank, show no events
            filteredApiEvents = [];
          } else {
            // Normalize search keywords (remove punctuation, only words)
            const normalizedKeywords = normalizeForSearch(searchKeywords);
            // If normalized keywords are empty (only punctuation was entered), show no events
            if (!normalizedKeywords || normalizedKeywords.trim().length === 0) {
              filteredApiEvents = [];
            } else {
              // Filter by keywords in title or description (case-insensitive, punctuation ignored)
              filteredApiEvents = filteredApiEvents.filter(e => {
                const normalizedTitle = normalizeForSearch(e.title);
                const normalizedDescription = normalizeForSearch(e.description);
                return normalizedTitle.includes(normalizedKeywords) ||
                       normalizedDescription.includes(normalizedKeywords);
              });
            }
          }
        }
        // Filter by zoomed bounds if zoom is applied
        if (zoomedBounds) {
          filteredApiEvents = filteredApiEvents.filter(e => 
            e.year >= zoomedBounds.minYear && e.year <= zoomedBounds.maxYear
          );
        }
        combinedEvents.push(...filteredApiEvents); // Add filtered events to our list
      }

      // If user wants to see events from our custom store (approved only)
      if (showDbEvents) {
        let local = listApprovedLocal()
          .filter(e => (selectedMonth === 0 || e.month === selectedMonth) && (selectedDay === 0 || e.day === selectedDay))
          .filter(e => (searchYear ? e.year === parseInt(searchYear) : true));
        
        // Keyword search: only works if both month and day are selected
        if (searchKeywords.trim()) {
          if (selectedMonth === 0 || selectedDay === 0) {
            // If keywords provided but month or day is blank, show no events
            local = [];
          } else {
            // Normalize search keywords (remove punctuation, only words)
            const normalizedKeywords = normalizeForSearch(searchKeywords);
            // If normalized keywords are empty (only punctuation was entered), show no events
            if (!normalizedKeywords || normalizedKeywords.trim().length === 0) {
              local = [];
            } else {
              // Filter by keywords in title or description (case-insensitive, punctuation ignored)
              local = local.filter(e => {
                const normalizedTitle = normalizeForSearch(e.title);
                const normalizedDescription = normalizeForSearch(e.description);
                return normalizedTitle.includes(normalizedKeywords) ||
                       normalizedDescription.includes(normalizedKeywords);
              });
            }
          }
        }
        // Filter by zoomed bounds if zoom is applied
        if (zoomedBounds) {
          local = local.filter(e => 
            e.year >= zoomedBounds.minYear && e.year <= zoomedBounds.maxYear
          );
        }
        
        const formatted: CombinedEvent[] = local.map(e => {
          // Convert single category string to array, and also apply auto-categorization
          const existingCategory = e.category && e.category !== 'General' ? [e.category] : [];
          const autoCategories = categorizeEvent(e.title, e.description);
          // Combine existing category with auto-categorized ones, removing duplicates
          const allCategories = Array.from(new Set([...existingCategory, ...autoCategories]));
          
          return {
            id: e.id,
            title: e.title,
            description: e.description,
            month: e.month,
            day: e.day,
            year: e.year,
            yearDisplay: e.year.toString(), // Use numeric year as display for database events
            category: allCategories.length > 0 ? allCategories : ['General'],
            source: 'database',
          };
        });
        
        // Filter by category after mapping (so we can check the array)
        let filteredLocal = formatted;
        if (selectedCategory !== 'all') {
          filteredLocal = filteredLocal.filter(e => e.category.includes(selectedCategory));
        }
        
        combinedEvents.push(...filteredLocal);
      }

      // Sort all events by year (newest first) and save them
      combinedEvents.sort((a, b) => b.year - a.year);
      setEvents(combinedEvents);
    } catch (error) {
      console.error('Error fetching events:', error);
      setEvents([]); // If something goes wrong, show no events
    } finally {
      setLoading(false); // Hide the loading spinner
    }
  }, [selectedMonth, selectedDay, searchYear, selectedCategory, searchKeywords, zoomedBounds, showApiEvents, showDbEvents]);

  // Fetch all events for bounds calculation when month/day changes
  useEffect(() => {
    fetchAllEventsForDate();
    // Reset zoomed bounds when month/day changes (zoom will reset in TimelineSlider)
    setZoomedBounds(null);
  }, [fetchAllEventsForDate]);

  // This runs automatically whenever the user changes any search settings
  useEffect(() => {
    searchEvents(); // Go find events based on current settings
  }, [searchEvents]);

  const { profile } = useAuth();
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
          <p className="text-slate-300 text-lg">Discover what happened on any date in history!</p>
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
                value={selectedMonth === 0 ? '' : selectedMonth} // Show currently selected month or blank
                onChange={(e) => {
                  const value = e.target.value;
                  setSelectedMonth(value === '' ? 0 : parseInt(value));
                }} // Update when user changes selection
                className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
              >
                {/* Blank option */}
                <option value=""></option>
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
                value={selectedDay === 0 ? '' : selectedDay} // Show currently selected day or blank
                onChange={(e) => {
                  const value = e.target.value;
                  setSelectedDay(value === '' ? 0 : parseInt(value));
                }} // Update when user changes selection
                className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
              >
                {/* Blank option */}
                <option value=""></option>
                {/* Create options for days 1-31 */}
                {Array.from({ length: 31 }, (_, i) => i + 1).map((day) => (
                  <option key={day} value={day}>
                    {day}
                  </option>
                ))}
              </select>
            </div>

            {/* Year input field */}
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">Year</label>
              <input
                type="number"
                value={searchYear}
                onChange={(e) => {
                  // Allow free typing - don't clamp the input value
                  // The slider will handle clamping to bounds
                  setSearchYear(e.target.value);
                }}
                placeholder="Enter year (Optional)"
                className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent transition [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none [-moz-appearance:textfield]"
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

          {/* Keyword Search Input */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-slate-300 mb-2">Search Keywords</label>
            <input
              type="text"
              value={searchKeywords}
              onChange={(e) => setSearchKeywords(e.target.value)}
              placeholder="Enter keywords to search in event titles and descriptions. (Month and day fields must be filled in to use keyword search)"
              className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
            />
            {searchKeywords && (selectedMonth === 0 || selectedDay === 0) && (
              <p className="text-yellow-400 text-sm mt-2">
                Please select both month and day to use keyword search.
              </p>
            )}
          </div>

          {/* Timeline Slider for Year Selection */}
          <div className="mb-6">
            <TimelineSlider
              events={allEventsForDate}
              selectedMonth={selectedMonth}
              selectedDay={selectedDay}
              searchYear={searchYear}
              onYearChange={setSearchYear}
              onBoundsChange={setZoomedBounds}
            />
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
            {/* Display what date we're currently searching - only show if both month and day are selected */}
            {selectedMonth !== 0 && selectedDay !== 0 && (
              <div className="text-center">
                <p className="text-slate-400">
                  Showing events for{' '}
                  <span className="text-blue-400 font-semibold">
                    {months[selectedMonth - 1]} {selectedDay}
                  </span>
                  {/* If user specified a year, show it too */}
                  {searchYear && (
                    <span className="text-blue-400 font-semibold">, {searchYear}</span>
                  )}
                </p>
              </div>
            )}
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
                  <h4 className="text-xl font-semibold text-white mb-3 leading-relaxed break-words whitespace-normal overflow-visible">{event.title}</h4>
                  {/* Badges showing category and source */}
                  <div className="flex gap-2 flex-wrap">
                    {/* Category badges - show all categories */}
                    {event.category.map((cat, idx) => (
                      <span key={idx} className="px-3 py-1 bg-blue-500/20 text-blue-300 rounded-full text-sm font-medium flex items-center">
                        <Tag className="w-3 h-3 mr-1" />
                        {cat}
                      </span>
                    ))}
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
  return <MainApp />;
}

// Export this component so it can be used in other files
export default App;
