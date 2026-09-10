/* =========================================================
   VALAR SUPABASE CONFIG
   =========================================================
   This file connects the VALAR website to Supabase.

   IMPORTANT:
   - The publishable key is safe to use in browser code.
   - NEVER put a service_role/secret key here.
========================================================= */

const VALAR_SUPABASE_URL =
  "https://ppjhtybunodezwwufxia.supabase.co";

const VALAR_SUPABASE_PUBLISHABLE_KEY =
  "sb_publishable_LkJjgEZt7TQrI9exC6qE3w_KvFVzAmh";


/* =========================================================
   CREATE SUPABASE CLIENT
========================================================= */

window.valarSupabase = null;

if (
  window.supabase &&
  VALAR_SUPABASE_URL.startsWith("https://") &&
  VALAR_SUPABASE_PUBLISHABLE_KEY &&
  !VALAR_SUPABASE_PUBLISHABLE_KEY.startsWith("YOUR_")
) {

  window.valarSupabase =
    window.supabase.createClient(
      VALAR_SUPABASE_URL,
      VALAR_SUPABASE_PUBLISHABLE_KEY
    );

  console.log("VALAR Supabase connected.");
} else {

  console.error(
    "VALAR Supabase could not be initialized. Check Supabase JS and config.js."
  );
}