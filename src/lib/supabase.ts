import { createClient } from '@supabase/supabase-js';

// Supabase Configuration provided by the user
export const SUPABASE_URL = (import.meta as any).env?.VITE_SUPABASE_URL || 'https://mwtzisudncwrlsizmgap.supabase.co';
export const SUPABASE_ANON_KEY = (import.meta as any).env?.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im13dHppc3VkbmN3cmxzaXptZ2FwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODc3NzQ1MjIsImV4cCI6MjEwMzM1MDUyMn0._q6YELlN-lPCzr2RnXs3tqEZh3JAu4iS6Ea9zaBp1f0';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);


export const SUPABASE_PROJECT_INFO = {
  projectName: "materiasprimas@appdesignsoftware.com's Project",
  projectId: 'mwtzisudncwrlsizmgap',
  url: 'https://mwtzisudncwrlsizmgap.supabase.co',
};
