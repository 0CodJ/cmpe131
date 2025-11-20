/*
READ THIS FIRST: 
This component is for the add event form that allows users that are logged in to add custom events. 
Following features this file does:
- Generates a circular blue button with a plus icon at the bottom right for the user to interact with mouse clicks 
- If cursor hovers over the blue button, the text "Add Event" appears 
- When a non logged in user clicks on the blue button it will alert the user to sign in to add events.
- When a logged in user clicks on the blue button they are sent to a modal that allows them to add an event.
    - The user must fill out all fields in the form to add an event 
    - Once the user finishes filling out the form, the admin must approve the event before it is added to the timeline. (Handled in the AdminDashboard.tsx file)
*/


// imports the useState hook from the react library 
import { useState } from "react";
// imports the plus and x icons from the lucide-react library 
import { Plus, X } from "lucide-react";
// this was commented out because it is not being used 
// import { supabase } from '../lib/supabase';
// used to access current user info
import { useSimpleAuth } from "../context/SimpleAuthContext";
//save events to the local storage 
import { addEvent } from "../lib/localEvents"; 

interface AddEventFormProps {
  // callback when event is added 
  onEventAdded: () => void;
  //optional pre-filled month and day to the form 
  defaultMonth?: number; 
  defaultDay?: number;  
}

export function AddEventForm({
  onEventAdded,
  defaultMonth,
  defaultDay,
}: AddEventFormProps) {
  //whether the form is open or not 
  const [isOpen, setIsOpen] = useState(false);
  //when the submission is in progress 
  const [loading, setLoading] = useState(false);
  //current user from auth context 
  const { profile } = useSimpleAuth();
  //initial form data using defaults or the current date 
  const [formData, setFormData] = useState({ 
    title: "",
    description: "",
    month: defaultMonth || new Date().getMonth() + 1,
    day: defaultDay || new Date().getDate(),
    year: new Date().getFullYear(),
    category: "General",
  });

  //specifying the months of the year to that can be selected from the dropdown menu
  const months = [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December",
  ];

  //specifying the categories of events that can be selected from the dropdown menu
  const categories = [
    "General",
    "Politics",
    "Science",
    "Economics",
    "Military",
    "People",
    "Technology",
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    //prevent the default form submission behavior
    e.preventDefault();
    setLoading(true);

    try {
      //if user is not signed in, alert to them to log in with an account
      if (!profile) {
        alert("Please sign in to add an event.");
        return;
      }
      // Save as pending approval in local storage (admins will approve)
      addEvent({
        ...formData,
        created_by: profile.id,
      });

      setFormData({
        title: "", // set the title as an empty string 
        description: "", // set the description as an empty string 
        month: defaultMonth || new Date().getMonth() + 1, // set the month to the default month or the current month
        day: defaultDay || new Date().getDate(), // set the day to the default day or the current day
        year: new Date().getFullYear(), // set the year to the current year
        category: "General", // set the category to the default category or the general category
      });
      setIsOpen(false); // close the add event form
      onEventAdded(); // call the onEventAdded function to update the events list
    } 
    catch (error) {
      //if an error occurs, print the error to the console 
      console.error("Error adding event:", error);
      //alert the user that the event was not added and to try again
      alert("Failed to add event. Please try again.");
    } 
    finally {
      //set the loading state to false
      setLoading(false);
    }
  };

  if (!isOpen) { 
    return (
      //this creates a button that appears on the bottom right of the screen when the user clicks on it 
      <button 
        onClick={() => setIsOpen(true)}
        className="fixed bottom-8 right-8 bg-blue-500 hover:bg-blue-600 text-white rounded-full p-4 shadow-2xl transition-all duration-300 hover:scale-110 flex items-center gap-2 group" 
      >
        <Plus className="w-6 h-6" /> 
        {/*the text that appears when the mouse cursor hovers over the button on the bottom right of the screen */}
        <span className="max-w-0 overflow-hidden group-hover:max-w-xs transition-all duration-300 whitespace-nowrap">
          Add Event 
        </span>
      </button>
    );
  }

  //if the form is open, show the full modal with form fields 
  return (
    //modal backdrop: dark overlay the covers entire screen 
    //fixed inset-0 = covers full screen, z-50 = appears on top of other content
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-slate-800 rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto border border-slate-700">
        <div className="sticky top-0 bg-slate-800 border-b border-slate-700 p-6 flex items-center justify-between">
          {/*text display for the title of the form */} 
          <h2 className="text-2xl font-bold text-white">Add Custom Event</h2>
          <button
            onClick={() => setIsOpen(false)}
            className="text-slate-400 hover:text-white transition"
          >
            {/*x icon from the lucide-react library. clicking it closes the form */}
            <X className="w-6 h-6" />
          </button>
        </div>

        {!profile ? (
          <div className="p-6 text-slate-300">
            {/*text display if the user clicks the button and is not signed in*/}  
            Please sign in to add events.
          </div>
        ) : (
          //if the user is signed in, show the form fields 
          <form onSubmit={handleSubmit} className="p-6 space-y-4">

            {/* This component is for the title of the event */} 
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Event Title *
              </label>
              {/*input field for the title of the event */} 
              <input 
                type="text"
                required
                value={formData.title}
                onChange={(e) =>
                  setFormData({ ...formData, title: e.target.value })
                }
                //placeholder text that appears in the title input field when it is empty
                className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                placeholder="e.g., First Moon Landing" 
              />
            </div>

            {/* This component is for the description of the event */} 
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Description *
              </label>
              <textarea
                required
                value={formData.description}
                onChange={(e) =>
                  setFormData({ ...formData, description: e.target.value })
                }
                rows={4}
                //placeholder text that appears in the description field  when it is empty
                className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition resize-none"
                placeholder="Describe what happened..."
              />
            </div>

            {/* This component is for the month, day, and year of the event */} 
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Month *
                </label>
                <select
                  value={formData.month}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      month: parseInt(e.target.value),
                    })
                  }
                  className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                > 
                  {/*this creates a dropdown menu for the month of the event */} 
                  {/*map through the months array and create an option for each month */} 
                  {months.map((month, index) => ( 
                    <option key={month} value={index + 1}>
                      {month}
                    </option>
                  ))}
                </select>
              </div>

              {/* This component is for the day of the event */} 
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Day *
                </label>
                <select
                  value={formData.day}
                  onChange={(e) =>
                    setFormData({ ...formData, day: parseInt(e.target.value) })
                  }
                  className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                >
                  {/*this creates a dropdown menu for the day of the event */} 
                  {/*map through the days array and create an option for each day */} 
                  {Array.from({ length: 31 }, (_, i) => i + 1).map((day) => ( 
                    <option key={day} value={day}>
                      {day}
                    </option>
                  ))}
                </select>
              </div>

              {/* This component is for the year of the event */} 
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Year *
                </label>
                <input
                  type="number"
                  required
                  value={formData.year}
                  onChange={(e) =>
                    setFormData({ ...formData, year: parseInt(e.target.value) })
                  }
                  className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                  placeholder="e.g., 1969"
                />
              </div>
            </div>

            {/* This component is for the category of the event */} 
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Category *
              </label>
              <select
                value={formData.category}
                onChange={(e) =>
                  setFormData({ ...formData, category: e.target.value })
                }
                className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
              >
                {/*map through the categories array and create an option for each category in the dropdown menu */} 
                {categories.map((category) => ( 
                  <option key={category} value={category}>
                    {category}
                  </option>
                ))}
              </select>
            </div>

            {/* This component is for the cancel and add event buttons */} 
            <div className="flex gap-3 pt-4">
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="flex-1 px-6 py-3 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition font-medium"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="flex-1 px-6 py-3 bg-blue-500 hover:bg-blue-600 disabled:bg-blue-500/50 text-white rounded-lg transition font-medium"
              >
                {loading ? "Adding..." : "Add Event"}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
