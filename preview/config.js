// PLN Prompt Library — runtime config.
//
// Shared upvotes & comments (via Supabase Postgres) are OFF until you fill these
// in, then redeploy. Leave them blank to run in local-only mode: everything works,
// but votes/comments live only in each person's browser.
//
// Both values below are SAFE to ship in client code:
//   • SUPABASE_URL      — your project's REST base, e.g. "https://abcd1234.supabase.co"
//   • SUPABASE_ANON_KEY — the *publishable* "anon" key (NOT the service_role key).
//     It is protected by the Row-Level Security policies in SUPABASE_SETUP.md.
//
// To turn sharing on: follow SUPABASE_SETUP.md, paste the two values here, redeploy.
window.PL_CONFIG = {
  SUPABASE_URL: "https://enbjiklzptdvaoeydrnl.supabase.co",
  SUPABASE_ANON_KEY: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVuYmppa2x6cHRkdmFvZXlkcm5sIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODMwMDQzMjksImV4cCI6MjA5ODU4MDMyOX0.6XzmRh2Q4Ol-tcSH0w_eV-ntS1Sy16Q0OxZjRMjfNDQ",

  // Optional: paste a Google Apps Script Web App URL here to send "Send feedback"
  // submissions to a Google Sheet you own (see SUPABASE_SETUP.md → "Feedback to a
  // Google Sheet"). Leave blank to keep feedback in the Supabase `feedback` table.
  FEEDBACK_SHEET_ENDPOINT: "https://script.google.com/macros/s/AKfycbwdwCZk26t9HN_Ww4x3Vn3dpf-ViBVNcu5agNYliatB39DbAFhecjs64cLAo-bursDR/exec"
};
