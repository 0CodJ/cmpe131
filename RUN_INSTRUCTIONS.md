# How to Run the Historical Events Website

## Benefits
1. History browsing by date
2. API and local events
3. Zoomable timeline slider
4. Add/save custom events
5. Filter by category

---

## First Time Setup (One Time Only)

### Step 1: Open Terminal/PowerShell
- Press `Win + X` and select "PowerShell" or "Terminal"

### Step 2: Navigate to the Project Folder
```powershell
cd C:\Users\Walnu\Desktop\cmpe131-main
```

### Step 3: Install Dependencies (if not already done)
```powershell
npm install
```
⏱️ *This downloads all required packages - takes about 1-2 minutes*

### Step 4: Set Up Supabase Configuration
Create a `.env` file in the project folder with your Supabase credentials:

```env
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

**How to get these values:**
1. Go to [supabase.com](https://supabase.com)
2. Create a free account
3. Create a new project
4. Go to Settings → API
5. Copy the "Project URL" and "anon public" key

---

## Running the Website (Every Time)

### Method 1: Using Terminal (Recommended)
```powershell
# 1. Navigate to the project
cd C:\Users\(insert name here)\Desktop\cmpe131-main

# 2. Start the server
npm run dev
```

**You'll see:**
```
VITE v5.4.20  ready in 1178 ms
➜  Local:   http://localhost:5173/
```

**Then:**
1. Press `Ctrl + Click` on the URL, OR
2. Open your browser and go to: **http://localhost:5173/**

### Method 2: Create a Batch File (Quick Start)

Create a file called `start-website.bat` in the project folder:

```batch
@echo off
cd C:\Users\Walnu\Desktop\cmpe131-main
npm run dev
```

**Then double-click the file to start!**

---

## Stopping the Website

In the terminal where the server is running, press:
```
Ctrl + C
```

---

## Troubleshooting

### Port Already in Use Error
If port 5173 is already taken:
```powershell
npm run dev -- --port 3000
```
Then go to: http://localhost:3000/

### Website Won't Load
1. Make sure the terminal shows "ready"
2. Check that port 5173 isn't blocked by firewall
3. Try a different browser

### Supabase Connection Errors
- Check your `.env` file has correct credentials
- Restart the server after changing `.env`
- Make sure you're using the "anon public" key (not the service_role key)

### Module Not Found Error
```powershell
npm install
```

---

## Project Structure

```
cmpe131-main/
├── src/
│   ├── App.tsx              # Main application
│   ├── components/          # Reusable components
│   └── lib/
│       ├── supabase.ts      # Database connection
│       └── historyApi.ts    # External API
├── .env                     # Configuration (create this)
├── package.json             # Dependencies
└── RUN_INSTRUCTIONS.md      # This file!
```

---

## Need Help?

Common commands:
- `npm install` - Install packages
- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run lint` - Check code for errors

Hakut
