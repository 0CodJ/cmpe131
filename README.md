# Parallel History Slider

The Parallel History Slider is a web application that uses React, TypeScript, Tailwind and Supabase. The purpose of this website is for users to be able to search for historical events at any month and date and see what other events have occured. Users can interact with the a timeline slider to jump into any point in time, use search/filter/zoom functions to narrow down the event search, and create accounts to make suggestions on events that should be added to the website.

**Disclaimer**: This website is not 100% historically accurate so there are bound to be some discrepancies. This website is for general learning, not for professional research. Do note some events may contain sensitive topics with regards to politics, wars, and terrorism. If you are uncomfortable with these topics, it is recommended to not use this website.  

**Created by The Curious Historians - SJSU CMPE 131**

## Features

### Core Functions
- **Interactive Timeline Slider**: Navigate through history by dragging a slider across a visual timeline with mouse inputs.
- **Date-Based Search**: Filter events by month, day, and year.
- **Keyword Search**: Search for specific events using keywords in titles and descriptions.
- **Category Filtering**: Filter events by categories (History, Politics, Science, Economics, Military, People, Technology).
- **Zoom Functionality**: Adjust timeline bounds with zoom in/out controls 
- **Automatic Categorization**: Events are automatically categorized based on keyword matching.

### User Features
- **User Authentication**: Create accounts, login, and manage your profile
- **Custom Events**: Submit your own historical events for review
- **Event Sources**: Toggle between API events and custom database events

### Admin Features
- **Admin Dashboard**: Approve or deny custom events submitted by users
- **User Management**: Approve pending user registrations
- **Event Moderation**: Review and manage all custom event submissions

Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/en)  (v16 or higher recommended)
- An IDE that supports JavaScript like [VSCode](https://code.visualstudio.com/download) or [WebStorm](https://www.jetbrains.com/webstorm/)
- **npm** (comes with Node.js)

### Installation

1. **Clone the repository** (or download the zip folder of the main branch)
    ```
    git clone https://github.com/0CodJ/cmpe131 
    cd cmpe131
    ```

2. **Install dependencies using the terminal when accessing the project from your IDE**:
   ```bash
   npm install
   ```

3. **Install React dependencies** (if needed):
   ```bash
   npm install --save react react-dom @types/react @types/react-dom
   ```

4. **Start the development server**:
   ```bash
   npm run dev
   ```

5. **Open your browser** and navigate to the URL shown in the terminal (typically `http://localhost:5173`)

## User Manual

### Searching for Events

1. **Select a point in time**:
   - Choose a month from the dropdown (or leave blank for all months)
   - Choose a day from the dropdown (or leave blank for all days)
   - Optionally enter a specific year in the year input field
   - **Note:** Month and day must be selected in order to show events

2. **Use the Timeline Slider**:
   - Drag the blue handle to navigate through different years
   - The slider automatically adjusts bounds based on available events
   - Use the zoom controls (+/-) to narrow or widen the year range (5, 10, 25, 50, 100, 200, 500 year increments)

3. **Filter by Category**:
   - Select a category from the dropdown to filter events
   - Choose "All" to see events from all categories

4. **Keyword Search**:
   - Enter keywords in the search bar to find specific events
   - **Note**: Month and day must be selected to use keyword search
   - Punctuation is automatically ignored in searches


### Adding Custom Events

1. **Sign In**: Create an account or login if you haven't already. (Note: Creating an account will require for admin to approve it in order to create custom events)

2. **Click "Add Event"**: Find the "Add Event" button in the interface

3. **Fill in the Form**:
   - Enter event title and description
   - Select month, day, and year
   - Choose a category

4. **Submit**: Your event will be submitted for admin approval

### Admin Functions

1. **Access Admin Dashboard**: Login with an admin account

2. **Approve/Deny Events**:
   - View all pending custom events
   - Click "Approve" to accept an event, allowing it to appear on the timeline
   - Click "Deny" to reject and remove an event

3. **Manage Users**:
   - View pending user registrations
   - Approve users to grant them access



## Software Used

### Frontend
- **React 18** - UI framework
- **TypeScript** - Type-safe JavaScript
- **Vite** - Build tool and development server
- **Tailwind CSS** - Utility-first CSS framework

### Libraries
- **Lucide React** - Icon library
- **@supabase/supabase-js** - Database client (if using Supabase)


### External API(s)
- Muffinlabs History API - provides month, date, year, and information with regards to historical events 

**Note**: Event results from this API may contain inconsistencies or incomplete data; therefore, the app performs additional filtering, formatting, categorization, and validation.

## Terminal Commands 

- `npm run dev` - Start the development server with hot module replacement
- `npm run build` - Build the application for production
- `npm run preview` - Preview the production build locally
- `npm run lint` - Checks for code issues
- `npm run typecheck` - Run TypeScript type checking without emitting files


## Configuration

### Environment Variables
If you need to configure API endpoints or database connections, create a `.env` file in the root directory:

```env
VITE_API_URL=your_api_url_here
VITE_SUPABASE_URL=your_supabase_url_here
VITE_SUPABASE_KEY=your_supabase_key_here
```

## Notes

- The API may be rate-limited; the app includes fallback sample data
- Negative years represent BC (Before Christ) dates

---
# Credits

**The Curious Historians**
- This project was created for SJSU CMPE 131. For contributions or questions, please contact the development team.
- Built with React, TypeScript, and Tailwind CSS

---


