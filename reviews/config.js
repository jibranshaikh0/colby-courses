// Rate A Mule student-reviews feature configuration.
// REVIEWS_ENABLED gates the whole feature; it ships false so every phase can merge dark.
export const REVIEWS_ENABLED = false;
// Backend adapter: 'mock' uses the local clearly-labeled mock (reviews/backend-mock.js).
// 'supabase' is reserved for the account-owned real project (URL + anon key go here at setup time,
// never secrets; the service_role key must never appear in this repo).
export const BACKEND = 'mock';
export const SUPABASE_URL = ''; // fill at account setup time
export const SUPABASE_ANON_KEY = ''; // public anon key only, at account setup time
export const MIN_REVIEWS_FOR_DISPLAY = 5;
