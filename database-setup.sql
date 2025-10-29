-- =====================================================
-- CMPE 131 Historical Events Database Setup
-- Run these queries in your Supabase SQL Editor
-- =====================================================

--0 Table For Historical Events 
CREATE TABLE historical_events (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  month INTEGER NOT NULL CHECK (month >= 1 AND month <= 12),
  day INTEGER NOT NULL CHECK (day >= 1 AND day <= 31),
  year INTEGER NOT NULL,
  category TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable Row Level Security (optional but recommended)
ALTER TABLE historical_events ENABLE ROW LEVEL SECURITY;

-- Allow public access for this demo (you can make this more restrictive later)
CREATE POLICY "Allow all operations" ON historical_events FOR ALL USING (true);

-- 1. Create profiles table (extends Supabase auth.users)
-- This stores additional user information beyond what Supabase auth provides
CREATE TABLE IF NOT EXISTS profiles (
    id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
    username TEXT UNIQUE NOT NULL,
    role TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('user', 'admin')),
    email_verified BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Create suggestions table
-- Users can suggest changes to historical events
CREATE TABLE IF NOT EXISTS suggestions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
    event_id UUID REFERENCES historical_events(id) ON DELETE CASCADE,
    suggested_changes JSONB NOT NULL, -- Store the suggested changes as JSON
    original_data JSONB, -- Store original event data for comparison
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
    admin_notes TEXT, -- Notes from admin when reviewing
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_profiles_username ON profiles(username);
CREATE INDEX IF NOT EXISTS idx_profiles_role ON profiles(role);
CREATE INDEX IF NOT EXISTS idx_suggestions_user_id ON suggestions(user_id);
CREATE INDEX IF NOT EXISTS idx_suggestions_event_id ON suggestions(event_id);
CREATE INDEX IF NOT EXISTS idx_suggestions_status ON suggestions(status);

-- 4. Create function to automatically create profile when user signs up
CREATE OR REPLACE FUNCTION handle_new_user() 
RETURNS TRIGGER AS $$
DECLARE
    username_to_use TEXT;
    max_attempts INTEGER := 10;
    attempt INTEGER := 0;
    base_username TEXT;
BEGIN
    -- Generate base username from email
    base_username := COALESCE(NEW.raw_user_meta_data->>'username', split_part(NEW.email, '@', 1));
    username_to_use := base_username;
    
    -- Try to insert, handling username conflicts
    LOOP
        BEGIN
            INSERT INTO profiles (id, username, email_verified, role)
            VALUES (
                NEW.id,
                username_to_use,
                COALESCE(NEW.email_confirmed_at IS NOT NULL, false),
                'user'
            );
            EXIT; -- Success, exit loop
        EXCEPTION
            WHEN unique_violation THEN
                -- Handle username conflicts
                attempt := attempt + 1;
                IF attempt >= max_attempts THEN
                    -- Final attempt with timestamp
                    username_to_use := base_username || '_' || extract(epoch from now())::bigint;
                    INSERT INTO profiles (id, username, email_verified, role)
                    VALUES (
                        NEW.id,
                        username_to_use,
                        COALESCE(NEW.email_confirmed_at IS NOT NULL, false),
                        'user'
                    );
                    EXIT;
                ELSE
                    username_to_use := base_username || '_' || attempt;
                END IF;
            WHEN OTHERS THEN
                -- Log detailed error information
                RAISE LOG 'Error in handle_new_user trigger for user %: SQLSTATE=%, SQLERRM=%', NEW.id, SQLSTATE, SQLERRM;
                -- Re-raise the error to make signup fail properly
                RAISE EXCEPTION 'Profile creation failed: %', SQLERRM;
        END;
    END LOOP;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. Create trigger to call the function when a new user is created
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- 6. Add created_by column to existing historical_events table
-- This helps track who created each event
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'historical_events' AND column_name = 'created_by'
    ) THEN
        ALTER TABLE historical_events ADD COLUMN created_by UUID REFERENCES profiles(id);
        RAISE NOTICE 'Added created_by column to historical_events table';
    ELSE
        RAISE NOTICE 'created_by column already exists in historical_events table';
    END IF;
END $$;

-- 7. Enable Row Level Security (RLS)
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE suggestions ENABLE ROW LEVEL SECURITY;
ALTER TABLE historical_events ENABLE ROW LEVEL SECURITY;

-- 8. Drop existing policies on historical_events (clean slate)
DROP POLICY IF EXISTS "Allow all operations" ON historical_events;
DROP POLICY IF EXISTS "Anyone can view historical events" ON historical_events;
DROP POLICY IF EXISTS "Authenticated users can insert events" ON historical_events;
DROP POLICY IF EXISTS "Users can update own events or admins can update any" ON historical_events;
DROP POLICY IF EXISTS "Admins can delete events" ON historical_events;

-- 9. Create RLS Policies

-- Profiles policies
DROP POLICY IF EXISTS "Users can view all profiles" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "Admins can update any profile" ON profiles;

CREATE POLICY "Users can view all profiles" ON profiles
    FOR SELECT USING (TRUE);

CREATE POLICY "Users can update own profile" ON profiles
    FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Admins can update any profile" ON profiles
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- Historical events policies (compatible with existing events)
CREATE POLICY "Anyone can view historical events" ON historical_events
    FOR SELECT USING (TRUE);

CREATE POLICY "Authenticated users can insert events" ON historical_events
    FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Users can update own events or admins can update any" ON historical_events
    FOR UPDATE USING (
        auth.uid() IS NOT NULL AND (
            -- Allow updates to legacy events (created_by is null) by authenticated users
            created_by IS NULL
            -- Or user owns the event
            OR created_by = auth.uid()
            -- Or user is admin
            OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
        )
    );

CREATE POLICY "Admins can delete events" ON historical_events
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- Suggestions policies
DROP POLICY IF EXISTS "Users can view all suggestions" ON suggestions;
DROP POLICY IF EXISTS "Authenticated users can create suggestions" ON suggestions;
DROP POLICY IF EXISTS "Users can update own suggestions" ON suggestions;
DROP POLICY IF EXISTS "Admins can update any suggestion" ON suggestions;

CREATE POLICY "Users can view all suggestions" ON suggestions
    FOR SELECT USING (TRUE);

CREATE POLICY "Authenticated users can create suggestions" ON suggestions
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own suggestions" ON suggestions
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Admins can update any suggestion" ON suggestions
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- 10. Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_historical_events_date ON historical_events(month, day, year);
CREATE INDEX IF NOT EXISTS idx_historical_events_created_by ON historical_events(created_by);
CREATE INDEX IF NOT EXISTS idx_historical_events_category ON historical_events(category);

-- 11. Create admin user function (for initial setup)
-- Run this separately after creating your first user account
CREATE OR REPLACE FUNCTION make_user_admin(user_email TEXT)
RETURNS TEXT AS $$
BEGIN
    UPDATE profiles 
    SET role = 'admin' 
    WHERE id = (
        SELECT id FROM auth.users WHERE email = user_email
    );
    
    IF FOUND THEN
        RETURN 'User ' || user_email || ' is now an admin';
    ELSE
        RETURN 'User ' || user_email || ' not found';
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- After running the above, you can make yourself admin by running:
-- SELECT make_user_admin('your-email@example.com');
-- =====================================================
