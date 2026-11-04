import type { AtsProvider } from "@/lib/ats";

export interface CuratedCompany {
  name: string;
  careersUrl: string;
  provider: AtsProvider;
}

/**
 * Curated seed list for the Companies directory — real companies whose
 * careers pages are on Greenhouse, Lever, or Ashby, so a "Watch" click can
 * go straight through the existing POST /api/watches flow with no new
 * backend surface. Every slug below was verified live against the ATS's own
 * API before being added here (not sourced from memory) — see
 * src/lib/ats.ts's buildAtsApiUrl for the exact endpoints checked.
 *
 * Not exhaustive, not an endorsement — just a reasonable starting set. A
 * company not listed here is still watchable via the URL-paste form.
 */
export const CURATED_COMPANIES: readonly CuratedCompany[] = [
  { name: "Airbnb", careersUrl: "https://job-boards.greenhouse.io/airbnb", provider: "greenhouse" },
  { name: "Stripe", careersUrl: "https://job-boards.greenhouse.io/stripe", provider: "greenhouse" },
  { name: "Robinhood", careersUrl: "https://job-boards.greenhouse.io/robinhood", provider: "greenhouse" },
  { name: "Pinterest", careersUrl: "https://job-boards.greenhouse.io/pinterest", provider: "greenhouse" },
  { name: "Coinbase", careersUrl: "https://job-boards.greenhouse.io/coinbase", provider: "greenhouse" },
  { name: "Instacart", careersUrl: "https://job-boards.greenhouse.io/instacart", provider: "greenhouse" },
  { name: "Affirm", careersUrl: "https://job-boards.greenhouse.io/affirm", provider: "greenhouse" },
  { name: "Cloudflare", careersUrl: "https://job-boards.greenhouse.io/cloudflare", provider: "greenhouse" },
  { name: "Dropbox", careersUrl: "https://job-boards.greenhouse.io/dropbox", provider: "greenhouse" },
  { name: "Lyft", careersUrl: "https://job-boards.greenhouse.io/lyft", provider: "greenhouse" },
  { name: "Reddit", careersUrl: "https://job-boards.greenhouse.io/reddit", provider: "greenhouse" },
  { name: "GitLab", careersUrl: "https://job-boards.greenhouse.io/gitlab", provider: "greenhouse" },
  { name: "Asana", careersUrl: "https://job-boards.greenhouse.io/asana", provider: "greenhouse" },
  { name: "Peloton", careersUrl: "https://job-boards.greenhouse.io/peloton", provider: "greenhouse" },
  { name: "Chime", careersUrl: "https://job-boards.greenhouse.io/chime", provider: "greenhouse" },
  { name: "Palantir", careersUrl: "https://jobs.lever.co/palantir", provider: "lever" },
  { name: "Spotify", careersUrl: "https://jobs.lever.co/spotify", provider: "lever" },
  { name: "Ramp", careersUrl: "https://jobs.ashbyhq.com/ramp", provider: "ashby" },
  { name: "Linear", careersUrl: "https://jobs.ashbyhq.com/linear", provider: "ashby" },
  { name: "OpenAI", careersUrl: "https://jobs.ashbyhq.com/openai", provider: "ashby" },
  { name: "Notion", careersUrl: "https://jobs.ashbyhq.com/notion", provider: "ashby" },
  { name: "Watershed", careersUrl: "https://jobs.ashbyhq.com/watershed", provider: "ashby" },
  { name: "Hex", careersUrl: "https://jobs.ashbyhq.com/hex", provider: "ashby" },
  { name: "Cursor", careersUrl: "https://jobs.ashbyhq.com/cursor", provider: "ashby" },
  { name: "Zip", careersUrl: "https://jobs.ashbyhq.com/zip", provider: "ashby" },
];
