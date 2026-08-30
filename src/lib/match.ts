/**
 * Pure job-matching predicates shared by the poller and (future) UI previews.
 * Kept dependency-free so they are trivially unit-testable.
 */

export interface JobLike {
  title: string;
  location: string | null;
}

export interface FilterLike {
  keywordFilters: string[];
  locationFilter: string | null;
}

/** Case-insensitive substring match of any keyword against the job title. */
export function matchesKeywords(job: JobLike, keywords: string[]): boolean {
  if (keywords.length === 0) return true;
  const haystack = job.title.toLowerCase();
  return keywords.some((k) => haystack.includes(k.trim().toLowerCase()));
}

/** Case-insensitive substring match of the location filter against the job. */
export function matchesLocation(job: JobLike, location: string | null): boolean {
  if (!location || location.trim() === "") return true;
  if (!job.location) return false;
  return job.location.toLowerCase().includes(location.trim().toLowerCase());
}

export function jobMatchesFilter(job: JobLike, filter: FilterLike): boolean {
  return (
    matchesKeywords(job, filter.keywordFilters) &&
    matchesLocation(job, filter.locationFilter)
  );
}
