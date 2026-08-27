import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Default Verified Credentials
export const DEFAULT_SUPABASE_URL = 'https://mwtzisudncwrlsizmgap.supabase.co';
export const DEFAULT_SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im13dHppc3VkbmN3cmxzaXptZ2FwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODc3NzQ1MjIsImV4cCI6MjEwMzM1MDUyMn0._q6YELlN-lPCzr2RnXs3tqEZh3JAu4iS6Ea9zaBp1f0';

// Sanitize URL helper
function sanitizeUrl(url?: string): string {
  if (!url || typeof url !== 'string') return DEFAULT_SUPABASE_URL;
  const clean = url.trim().replace(/['"]/g, '').replace(/\/+$/, '');
  if (!clean.startsWith('http://') && !clean.startsWith('https://')) {
    return `https://${clean}`;
  }
  return clean;
}

// Validate Key helper (rejects truncated keys with '...' or invalid lengths)
function sanitizeKey(key?: string): string {
  if (!key || typeof key !== 'string') return DEFAULT_SUPABASE_ANON_KEY;
  const clean = key.trim().replace(/['"]/g, '');
  if (clean.includes('...') || clean.length < 50) {
    return DEFAULT_SUPABASE_ANON_KEY;
  }
  return clean;
}

// Resolve active credentials from localStorage or Vite environment or defaults
export function getActiveSupabaseCredentials(): { url: string; anonKey: string } {
  let customUrl = '';
  let customKey = '';

  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      customUrl = localStorage.getItem('erp_supabase_custom_url') || '';
      customKey = localStorage.getItem('erp_supabase_custom_key') || '';
    }
  } catch (e) {
    // ignore
  }

  const envUrl = (import.meta as any).env?.VITE_SUPABASE_URL;
  const envKey = (import.meta as any).env?.VITE_SUPABASE_ANON_KEY;

  const resolvedUrl = sanitizeUrl(customUrl || envUrl || DEFAULT_SUPABASE_URL);
  const resolvedKey = sanitizeKey(customKey || envKey || DEFAULT_SUPABASE_ANON_KEY);

  return { url: resolvedUrl, anonKey: resolvedKey };
}

const activeCreds = getActiveSupabaseCredentials();
export const SUPABASE_URL = activeCreds.url;
export const SUPABASE_ANON_KEY = activeCreds.anonKey;

// Create primary Supabase Client with resilient options
export let supabase: SupabaseClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: false
  }
});

// Update credentials dynamically at runtime
export function setSupabaseCredentials(newUrl: string, newKey: string): SupabaseClient {
  const cleanUrl = sanitizeUrl(newUrl);
  const cleanKey = sanitizeKey(newKey);

  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      localStorage.setItem('erp_supabase_custom_url', cleanUrl);
      localStorage.setItem('erp_supabase_custom_key', cleanKey);
    }
  } catch (e) {
    // ignore
  }

  supabase = createClient(cleanUrl, cleanKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: false
    }
  });

  return supabase;
}

export const SUPABASE_PROJECT_INFO = {
  projectName: "materiasprimas@appdesignsoftware.com's Project",
  projectId: 'mwtzisudncwrlsizmgap',
  url: 'https://mwtzisudncwrlsizmgap.supabase.co',
};

