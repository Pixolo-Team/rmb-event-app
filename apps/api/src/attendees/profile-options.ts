// Fixed taxonomy for the pilot — see PRD_v1.md US1.3 ("dropdown" / "multi-select dropdown").
// Single source of truth: the frontend fetches these from GET /attendees/profile-options
// rather than hardcoding its own copy.

export const BUSINESS_CATEGORIES = [
  "Manufacturer",
  "Trader / Distributor",
  "Service Provider",
  "Retailer",
  "Professional (CA, Lawyer, Consultant…)",
  "Startup / Founder",
  "Other",
] as const;

// Shared business-type taxonomy for both "Looking for" and "Offering" — same list on
// both sides since one attendee's "offering" is another's "looking for".
export const BUSINESS_TYPES = [
  "Real Estate Builders",
  "Interior Designer",
  "Digital Marketing",
  "Manufacturing",
  "Textiles",
  "IT Services / Software",
  "Auto Components",
  "Logistics & Transportation",
  "Retail & Trade",
  "Financial Services",
  "Healthcare",
  "Legal Services",
  "Chartered Accountant / Finance",
  "Architecture",
  "Construction & Contractors",
  "Event Management",
  "Hospitality & Hotels",
  "Education & Training",
  "E-commerce",
  "Food & Beverage",
  "Media & Advertising",
  "Human Resources / Staffing",
  "Import / Export",
  "Jewellery",
  "Other",
] as const;

export const LOOKING_FOR_TAGS = BUSINESS_TYPES;
export const OFFERING_TAGS = BUSINESS_TYPES;

export const GOALS_TAGS = [
  "Find new customers",
  "Find suppliers",
  "Raise investment",
  "Expand to new markets",
  "Learn from peers",
  "Build partnerships",
] as const;
