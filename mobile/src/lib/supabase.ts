import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';

// Keys come from mobile/.env (see .env.example). Only the public anon key is used here.
const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
const anonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

// null when the keys are not set (login then shows a clear message).
export const supabase =
  url && anonKey
    ? createClient(url, anonKey, {
        auth: {
          storage: AsyncStorage, // keeps the user logged in between app launches
          autoRefreshToken: true,
          persistSession: true,
          detectSessionInUrl: false,
        },
      })
    : null;
