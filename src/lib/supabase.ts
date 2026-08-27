import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Default Verified Credentials
export const DEFAULT_SUPABASE_URL = 'https://mwtzisudncwrlsizmgap.supabase.co';
export const DEFAULT_SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im13dHppc3VkbmN3cmxzaXptZ2FwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODc3NzQ1MjIsImV4cCI6MjEwMzM1MDUyMn0._q6YELlN-lPCzr2RnXs3tqEZh3JAu4iS6Ea9zaBp1f0';

// Sanitize URL helper: ensures strict https://<ref>.supabase.co format without trailing slashes, dashboard paths, or rest endpoints
function sanitizeUrl(url?: string): string {
  if (!url || typeof url !== 'string') return DEFAULT_SUPABASE_URL;
  let clean = url.trim().replace(/['"]/g, '').replace(/\/+$/, '');
  
  // If user passed a Supabase dashboard URL: https://supabase.com/dashboard/project/mwtzisudncwrlsizmgap/...
  const dashboardMatch = clean.match(/supabase\.com\/dashboard\/project\/([a-z0-9_-]+)/i);
  if (dashboardMatch && dashboardMatch[1]) {
    return `https://${dashboardMatch[1]}.supabase.co`;
  }

  // If user passed a subpath or REST endpoint: https://mwtzisudncwrlsizmgap.supabase.co/rest/v1/...
  const subdomainMatch = clean.match(/https?:\/\/([a-z0-9_-]+)\.supabase\.co/i);
  if (subdomainMatch && subdomainMatch[1]) {
    return `https://${subdomainMatch[1]}.supabase.co`;
  }

  // If user passed just the project ref
  if (/^[a-z0-9]{15,30}$/i.test(clean)) {
    return `https://${clean}.supabase.co`;
  }

  if (!clean.startsWith('http://') && !clean.startsWith('https://')) {
    clean = `https://${clean}`;
  }

  try {
    const parsed = new URL(clean);
    return `${parsed.protocol}//${parsed.host}`;
  } catch (e) {
    return DEFAULT_SUPABASE_URL;
  }
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
      
      // Clean and sanitize any malformed URL stored in localStorage
      if (customUrl) {
        const sanitized = sanitizeUrl(customUrl);
        if (sanitized !== customUrl) {
          localStorage.setItem('erp_supabase_custom_url', sanitized);
          customUrl = sanitized;
        }
      }
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

