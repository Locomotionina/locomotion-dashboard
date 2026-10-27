export type AccountTier = "ADMIN" | "MANAGEMENT" | "STAFF";

export interface PositionConfig {
  name: string;
  tier: AccountTier;
}

/**
 * 1. Data Mapping for Dropdowns & Level Classification
 *
 * Tier 1: ADMIN Level
 * Department: OPERATIONS -> Position: HRGA
 *
 * Tier 2: MANAGEMENT Level
 * Department: OPERATIONS -> Position: FAT SPV
 * Department: BUSINESS DEVELOPMENT -> Positions: Business Development Head, Account Executive, Sales Executive
 * Department: PROJECT/PRODUCTION -> Positions: Project Manager, Associate Project Manager
 * Department: CREATIVE -> Positions: Creative Head, Art Director
 *
 * Tier 3: STAFF Level
 * Department: PROJECT/PRODUCTION -> Positions: Content Strategist, Graphic Designer, Digital Audio Visual, Content Creator, Production Assistant, Social Media, KOL, Talent & Partnership Coordinator
 */
export const DEPARTMENT_POSITIONS: Record<string, string[]> = {
  "OPERATIONS": [
    "HRGA",
    "FAT SPV",
  ],
  "BUSINESS DEVELOPMENT": [
    "Business Development Head",
    "Account Executive",
    "Sales Executive",
  ],
  "PROJECT/PRODUCTION": [
    "Project Manager",
    "Associate Project Manager",
    "Content Strategist",
    "Graphic Designer",
    "Digital Audio Visual",
    "Content Creator",
    "Production Assistant",
    "Social Media",
    "KOL, Talent & Partnership Coordinator",
  ],
  "CREATIVE": [
    "Creative Head",
    "Art Director",
  ],
};

export const DEPARTMENTS = Object.keys(DEPARTMENT_POSITIONS);

/**
 * Position to Account Tier (Role) mapping
 */
export const POSITION_TIER_MAP: Record<string, AccountTier> = {
  // Tier 1: ADMIN Level
  "HRGA": "ADMIN",

  // Tier 2: MANAGEMENT Level
  "FAT SPV": "MANAGEMENT",
  "Business Development Head": "MANAGEMENT",
  "Account Executive": "MANAGEMENT",
  "Sales Executive": "MANAGEMENT",
  "Project Manager": "MANAGEMENT",
  "Associate Project Manager": "MANAGEMENT",
  "Creative Head": "MANAGEMENT",
  "Art Director": "MANAGEMENT",
  // Pre-seeded Special Accounts (No Department)
  "KOMISARIS": "MANAGEMENT",
  "CEO": "MANAGEMENT",

  // Tier 3: STAFF Level
  "Content Strategist": "STAFF",
  "Graphic Designer": "STAFF",
  "Digital Audio Visual": "STAFF",
  "Content Creator": "STAFF",
  "Production Assistant": "STAFF",
  "Social Media": "STAFF",
  "KOL, Talent & Partnership Coordinator": "STAFF",
};

/**
 * Cross-references a position name to automatically determine its Account Tier.
 * Returns "ADMIN", "MANAGEMENT", or "STAFF".
 */
export function getTierFromPosition(position: string): AccountTier {
  if (!position) return "STAFF";
  const trimmed = position.trim();
  if (POSITION_TIER_MAP[trimmed]) {
    return POSITION_TIER_MAP[trimmed];
  }
  // Case-insensitive lookup fallback
  const match = Object.entries(POSITION_TIER_MAP).find(
    ([k]) => k.toLowerCase() === trimmed.toLowerCase()
  );
  if (match) {
    return match[1];
  }
  return "STAFF";
}

/**
 * Formatted display label for each tier.
 */
export function getTierBadgeLabel(tier: AccountTier): string {
  switch (tier) {
    case "ADMIN":
      return "Tier 1: Admin";
    case "MANAGEMENT":
      return "Tier 2: Management";
    case "STAFF":
      return "Tier 3: Staff";
    default:
      return "Staff";
  }
}
