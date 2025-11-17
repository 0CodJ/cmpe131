export interface ApiHistoricalEvent {
  year: string;
  text: string;
  html: string;
  no_year_html: string;
  links: Array<{
    title: string;
    link: string;
  }>;
}

export interface ApiResponse {
  date: string;
  data: {
    Events: ApiHistoricalEvent[];
    Births?: ApiHistoricalEvent[];
    Deaths?: ApiHistoricalEvent[];
  };
}

// Sample data for when API is blocked
const getSampleEvents = (month: number, day: number): ApiHistoricalEvent[] => {
  const sampleEvents: ApiHistoricalEvent[] = [
    {
      year: "1969",
      text: "Apollo 11 astronauts Neil Armstrong and Buzz Aldrin became the first humans to land on the Moon.",
      html: "Apollo 11 astronauts Neil Armstrong and Buzz Aldrin became the first humans to land on the Moon.",
      no_year_html: "Apollo 11 astronauts Neil Armstrong and Buzz Aldrin became the first humans to land on the Moon.",
      links: []
    },
    {
      year: "1776",
      text: "The United States Declaration of Independence was adopted by the Continental Congress.",
      html: "The United States Declaration of Independence was adopted by the Continental Congress.",
      no_year_html: "The United States Declaration of Independence was adopted by the Continental Congress.",
      links: []
    },
    {
      year: "2001",
      text: "The September 11 attacks occurred in the United States.",
      html: "The September 11 attacks occurred in the United States.",
      no_year_html: "The September 11 attacks occurred in the United States.",
      links: []
    }
  ];

  // Return sample events for any date
  return sampleEvents;
};

export const fetchHistoricalEvents = async (month: number, day: number): Promise<ApiHistoricalEvent[]> => {
  try {
    const response = await fetch(`https://history.muffinlabs.com/date/${month}/${day}`);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const data: ApiResponse = await response.json();
    return data.data.Events || [];
  } catch (error) {
    console.error('Error fetching from history API:', error);
    
    // Check if it's a network error (like ad blocker blocking)
    if (error instanceof TypeError && error.message.includes('Failed to fetch')) {
      console.warn('API request blocked - likely by ad blocker. Using sample data instead.');
      return getSampleEvents(month, day);
    }
    
    // For other errors, return sample data as fallback
    console.warn('Using sample data as fallback.');
    return getSampleEvents(month, day);
  }
};
