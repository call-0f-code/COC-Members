/**
 * memberService.ts
 * Service for fetching and validating member data from the Central Backend API.
 *
 * Central Backend:
 *   GET /api/v1/members/  →  { user: Member[], success: true }
 *   GET /api/v1/members/:id → { user: Member, success: true }
 */

import api from "../utils/api";
import { ApiError } from "../utils/apiError";
import config from "../config/index";
import {
  getZonedDateParts,
  parseBirthDate,
  isLeapYear,
  daysInMonth,
} from "../utils/dateTimeUtils";

export interface CentralMember {
  id: string;
  name: string;
  email: string;
  birth_date: string | null; // ISO-8601 date, e.g. "2003-10-21" or "2003-10-21T00:00:00.000Z"
  profilePhoto: string | null;
  isApproved: boolean;
  isGhosted: boolean;
  role: string;
}

export interface PublicBirthdayMember {
  id: string;
  name: string;
  birthdayMMDD: string;
  month: number;
  day: number;
  profilePhoto: string | null;
}

// ──────────────────────────────────────────────
// In-memory cache for public calendar reads (5-min TTL)
// ──────────────────────────────────────────────
let membersCache: CentralMember[] | null = null;
let cacheExpiry = 0;
const CACHE_TTL_MS = 5 * 60 * 1000;

function validateAndMapMembers(raw: unknown[]): CentralMember[] {
  return raw
    .filter((m): m is Record<string, unknown> => typeof m === "object" && m !== null)
    .filter((m) => {
      return (
        typeof m.id === "string" &&
        typeof m.name === "string" &&
        typeof m.email === "string" &&
        typeof m.isApproved === "boolean" &&
        typeof m.isGhosted === "boolean"
      );
    })
    .map((m) => ({
      id: m.id as string,
      name: m.name as string,
      email: m.email as string,
      birth_date: typeof m.birth_date === "string" ? m.birth_date : null,
      profilePhoto: typeof m.profilePhoto === "string" ? m.profilePhoto : null,
      isApproved: m.isApproved as boolean,
      isGhosted: m.isGhosted as boolean,
      role: typeof m.role === "string" ? m.role : "MEMBER",
    }));
}

/**
 * Fetch all members from the Central Backend API.
 * Uses a short cache for calendar endpoints.
 */
export async function fetchAllMembers(bypassCache = false): Promise<CentralMember[]> {
  const now = Date.now();
  if (!bypassCache && membersCache && now < cacheExpiry) {
    return membersCache;
  }

  let response;
  try {
    response = await api.get("/members/", { timeout: 15000 } as any);
  } catch (err: any) {
    const msg = err?.message ?? "Network error";
    throw new ApiError(`Failed to fetch members from central API: ${msg}`, 502);
  }

  const data = response?.data;
  if (!data || data.success !== true || !Array.isArray(data.user)) {
    throw new ApiError("Central API returned an invalid or malformed member response", 502);
  }

  const members = validateAndMapMembers(data.user);

  // Only populate cache if upstream returned a valid array
  membersCache = members;
  cacheExpiry = now + CACHE_TTL_MS;

  return members;
}

/**
 * Fetch a single member directly by ID from Central Backend.
 * Ensures the email worker always operates on fresh member data before sending.
 */
export async function fetchMemberById(memberId: string): Promise<CentralMember | null> {
  if (!memberId || typeof memberId !== "string") return null;

  try {
    const response = await api.get(`/members/${memberId}`, { timeout: 10000 } as any);
    const data = response?.data;
    if (!data || data.success !== true || !data.user) {
      return null;
    }
    const [validated] = validateAndMapMembers([data.user]);
    return validated || null;
  } catch {
    return null;
  }
}

/** Invalidate the member cache */
export function invalidateMembersCache(): void {
  membersCache = null;
  cacheExpiry = 0;
}

/**
 * Check if a member is eligible for birthday email and calendar features:
 * - Approved
 * - Not ghosted
 * - Valid birth_date
 * - Valid email containing '@'
 */
export function isEligible(m: CentralMember): boolean {
  return (
    m.birth_date !== null &&
    m.isApproved === true &&
    m.isGhosted === false &&
    typeof m.email === "string" &&
    m.email.includes("@")
  );
}

/**
 * Strips sensitive email field for public birthday calendar API responses.
 */
export function toPublicBirthdayMember(m: CentralMember): PublicBirthdayMember {
  const parsed = parseBirthDate(m.birth_date!);
  if (!parsed) {
    throw new Error(`Invalid birth_date format for member ${m.id}`);
  }

  const mm = String(parsed.month).padStart(2, "0");
  const dd = String(parsed.day).padStart(2, "0");

  return {
    id: m.id,
    name: m.name,
    birthdayMMDD: `${mm}-${dd}`,
    month: parsed.month,
    day: parsed.day,
    profilePhoto: m.profilePhoto,
  };
}

/**
 * Returns all eligible members having a birthday in the specified calendar month (1-12).
 */
export async function getMembersWithBirthdayInMonth(
  month: number
): Promise<PublicBirthdayMember[]> {
  const all = await fetchAllMembers();
  return all
    .filter(isEligible)
    .filter((m) => {
      const parsed = parseBirthDate(m.birth_date!);
      return parsed?.month === month;
    })
    .map(toPublicBirthdayMember);
}

/**
 * Returns all eligible members whose birthday falls on the current date in Asia/Kolkata.
 * Strictly respects February 29 policy: Feb 29 birthdays only match when today is Feb 29.
 */
export async function getMembersWithBirthdayToday(): Promise<PublicBirthdayMember[]> {
  const today = getZonedDateParts(new Date(), config.BIRTHDAY_TIMEZONE);
  const all = await fetchAllMembers();

  return all
    .filter(isEligible)
    .filter((m) => {
      const parsed = parseBirthDate(m.birth_date!);
      if (!parsed) return false;
      return parsed.month === today.month && parsed.day === today.day;
    })
    .map(toPublicBirthdayMember);
}

/**
 * Returns upcoming birthdays in the next `windowDays` (default 30), sorted chronologically.
 * Accurately calculates day difference using Asia/Kolkata business date.
 * Feb 29 birthdays in non-leap years are excluded until the next leap year.
 */
export async function getUpcomingBirthdays(
  windowDays = 30
): Promise<Array<PublicBirthdayMember & { daysUntil: number }>> {
  const all = await fetchAllMembers();
  const eligible = all.filter(isEligible);

  const today = getZonedDateParts(new Date(), config.BIRTHDAY_TIMEZONE);
  // Reference epoch for start of today in IST
  const todayEpoch = Date.UTC(today.year, today.month - 1, today.day);

  const results: Array<PublicBirthdayMember & { daysUntil: number }> = [];

  for (const m of eligible) {
    const parsed = parseBirthDate(m.birth_date!);
    if (!parsed) continue;

    // Check target year candidate (this year or next year)
    let candidateYear = today.year;
    // Check if birthday already passed this year in IST
    if (
      parsed.month < today.month ||
      (parsed.month === today.month && parsed.day < today.day)
    ) {
      candidateYear += 1;
    }

    // Feb 29 policy: if member was born on Feb 29 and candidateYear is not leap, skip candidateYear
    if (parsed.month === 2 && parsed.day === 29 && !isLeapYear(candidateYear)) {
      continue;
    }

    const bdayEpoch = Date.UTC(candidateYear, parsed.month - 1, parsed.day);
    const diffDays = Math.round((bdayEpoch - todayEpoch) / (24 * 60 * 60 * 1000));

    if (diffDays >= 0 && diffDays <= windowDays) {
      results.push({
        ...toPublicBirthdayMember(m),
        daysUntil: diffDays,
      });
    }
  }

  results.sort((a, b) => a.daysUntil - b.daysUntil);
  return results;
}
