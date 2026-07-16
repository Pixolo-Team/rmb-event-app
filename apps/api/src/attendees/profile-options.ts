// Fixed taxonomy for the pilot — see PRD_v1.md US1.3 ("dropdown" / "multi-select tags").
// Single source of truth: the frontend fetches these from GET /attendees/profile-options
// rather than hardcoding its own copy.

export const INDUSTRIES = [
  "Manufacturing",
  "Textiles",
  "IT Services",
  "Auto Components",
  "Logistics",
  "Retail & Trade",
  "Financial Services",
  "Healthcare",
  "Other",
] as const;

export const BUSINESS_CATEGORIES = [
  "Manufacturer",
  "Trader / Distributor",
  "Service Provider",
  "Retailer",
  "Professional (CA, Lawyer, Consultant…)",
  "Startup / Founder",
  "Other",
] as const;

export const LOOKING_FOR_TAGS = [
  "Suppliers",
  "Distributors",
  "Investors",
  "Customers",
  "Partners",
  "Mentors",
] as const;

export const OFFERING_TAGS = [
  "Bulk Manufacturing",
  "Bulk Sourcing",
  "Logistics",
  "Financing",
  "Consulting",
  "Distribution",
] as const;

export const GOALS_TAGS = [
  "Find new customers",
  "Find suppliers",
  "Raise investment",
  "Expand to new markets",
  "Learn from peers",
  "Build partnerships",
] as const;
