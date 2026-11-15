// Loads backend/.env into process.env. Imported first in index.ts.
// A missing file is fine: the server still starts and /health says what is not set.
try {
  process.loadEnvFile();
} catch {
  console.warn('No .env file found. Copy .env.example to .env and add your Supabase keys.');
}
