import { createClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!url || !anonKey) {
  throw new Error('VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY 환경변수가 설정되지 않았습니다 (.env.local 확인)');
}

export const supabase = createClient(url, anonKey);

// Identifies this browser tab's writes so realtime listeners can tell apart
// "my own change" from "someone else changed this" without extra round trips.
export const clientId = crypto.randomUUID();
