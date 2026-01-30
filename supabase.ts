
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || "https://dkgveikqqzzofiizelrt.supabase.co";
const PUBLIC_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRrZ3ZlaWtxcXp6b2ZpaXplbHJ0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjYzODgwNTcsImV4cCI6MjA4MTk2NDA1N30.HMb8cekSdiSjeidzXZivsRkRvWXXq4_-myBlX6pLw6U";

if (!SUPABASE_URL) {
  throw new Error('supabaseUrl is required');
}

export const supabase = createClient(SUPABASE_URL, PUBLIC_ANON_KEY);
