# Supabase Setup Guide

This guide will help you set up Supabase authentication for the Parallel History Slider application.

## Prerequisites

1. A Supabase account (sign up at https://supabase.com)
2. Node.js and npm installed
3. Your project dependencies installed (`npm install`)

## Step 1: Create a Supabase Project

1. Go to https://supabase.com and sign in
2. Click "New Project"
3. Fill in your project details:
   - Name: `parallel-history-slider` (or your preferred name)
   - Database Password: Choose a strong password (save this!)
   - Region: Choose the closest region to your users
4. Click "Create new project" and wait for it to finish setting up

## Step 2: Get Your Supabase Credentials

1. In your Supabase project dashboard, go to **Settings** → **API**
2. Copy the following values:
   - **Project URL** (under "Project URL")
   - **anon/public key** (under "Project API keys" → "anon public")

## Step 3: Create Environment Variables

1. In your project root directory, create a `.env` file (if it doesn't exist)
2. Add the following variables:

```env
VITE_SUPABASE_URL=your_project_url_here
VITE_SUPABASE_ANON_KEY=your_anon_key_here
```

Replace `your_project_url_here` and `your_anon_key_here` with the values you copied in Step 2.

**Important**: Never commit your `.env` file to version control! It should already be in `.gitignore`.

## Step 4: Set Up the Database Schema

1. In your Supabase project dashboard, go to **SQL Editor**
2. Click "New Query"
3. Copy the contents of `supabase/migrations/001_create_profiles_table.sql`
4. Paste it into the SQL Editor
5. Click "Run" (or press Ctrl+Enter)
6. Verify the migration succeeded (you should see "Success. No rows returned")

This migration will:
- Create a `profiles` table to store user roles and approval status
- Set up Row Level Security (RLS) policies
- Create a trigger to automatically create profiles when users sign up
- Add indexes for better query performance

## Step 5: Create Your First Admin User

After running the migration, you need to manually create an admin user:

1. In Supabase dashboard, go to **Authentication** → **Users**
2. Click "Add user" → "Create new user"
3. Enter:
   - Email: `admin@example.com` (or your preferred admin email)
   - Password: Choose a strong password
   - Auto Confirm User: **Enable this** (so you can log in immediately)
4. Click "Create user"
5. Copy the User ID (UUID) that was created

6. Go to **SQL Editor** again and run this query (replace `USER_ID_HERE` with the UUID you copied):

```sql
UPDATE profiles
SET role = 'admin', approved = true
WHERE id = 'USER_ID_HERE';
```

## Step 6: Configure Email Authentication (Optional)

By default, Supabase requires email confirmation. For development, you may want to disable this:

1. Go to **Authentication** → **Settings**
2. Under "Email Auth", toggle off "Enable email confirmations" (for development only)
3. For production, keep email confirmations enabled for security

## Step 7: Test Your Setup

1. Start your development server:
   ```bash
   npm run dev
   ```

2. Open your browser to `http://localhost:5173` (or the URL shown in terminal)

3. Try signing up with a new account:
   - Click "Create account" in the auth panel
   - Enter an email and password
   - You should be automatically signed in

4. Try signing in with your admin account:
   - Sign out if you're logged in
   - Sign in with `admin@example.com` and your admin password
   - You should see "Role: admin" in the auth panel
   - Click "Open Admin Dashboard" to see pending users

## Troubleshooting

### "Supabase URL or anon key is missing"
- Make sure your `.env` file exists in the project root
- Check that the variable names are exactly `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`
- Restart your development server after creating/updating `.env`

### "Error fetching profile" or profile not found
- Make sure you ran the migration SQL script
- Check that the `profiles` table exists in your Supabase database (go to **Table Editor**)

### "Access denied" or RLS policies blocking queries
- Verify the RLS policies were created correctly
- Check that your user has a profile entry in the `profiles` table
- For admin functions, ensure your user has `role = 'admin'` in the profiles table

### Users can't sign up
- Check Supabase **Authentication** → **Settings** → "Enable email signup"
- If email confirmations are enabled, check your email (including spam folder)
- For development, consider disabling email confirmations temporarily

## Security Notes

- **Never commit your `.env` file** - it contains sensitive credentials
- The `anon` key is safe to use in client-side code (it's protected by RLS)
- For production, enable email confirmations
- Regularly review and update your RLS policies
- Use strong passwords for admin accounts

## Next Steps

- Customize the admin approval workflow if needed
- Add additional profile fields if required
- Set up email templates for user notifications
- Configure password reset functionality (Supabase handles this automatically)

## Support

If you encounter issues:
1. Check the Supabase dashboard logs (Settings → Logs)
2. Check browser console for error messages
3. Verify your environment variables are set correctly
4. Ensure all migrations have been run successfully

