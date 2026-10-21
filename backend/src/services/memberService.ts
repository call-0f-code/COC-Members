/**
 * memberService.ts
 * Service for fetching and validating member data from the Central Backend API.
 *
 * Central Backend:
 *   GET /api/v1/members/  →  { user: Member[], success: true }
 *   GET /api/v1/members/:id → { user: Member, success: true }
 */

import { z } from "zod";
import api from "../utils/api";
import { ApiError } from "../utils/apiError";
import config from "../config/index";
import {
  getZonedDateParts,
  parseBirthDate,
  observedBirthday,
  isBirthdayOn,
} from "../utils/dateTimeUtils";

// Shape of a member from the central API. Optional fields fall back to
// defaults; extra fields are dropped.
const CentralMemberSchema = z.object({
  id: z.string(),
  name: z.string(),
  email: z.string(),
  isApproved: z.boolean(),
  isGhosted: z.boolean(),
  // ISO-8601 date, e.g. "2003-10-21" or "2003-10-21T00:00:00.000Z"
  birth_date: z.string().nullable().catch(null),
  profilePhoto: z.string().nullable().catch(null),
  role: z.string().catch("MEMBER"),
});

export type CentralMember = z.infer<typeof CentralMemberSchema>;

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

/** Keep only records that match the member shape. */
function validateAndMapMembers(raw: unknown[]): CentralMember[] {
  return raw.flatMap((m) => {
    const parsed = CentralMemberSchema.safeParse(m);
    return parsed.success ? [parsed.data] : [];
  });
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
    response = await api.get("/members/", { timeout: 15000 });
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
 *
 * Returns null only when the member does not exist (404) or the record is
 * unusable. Any other failure (network, timeout, 5xx, malformed response) is
 * thrown so the caller can retry instead of treating the member as gone.
 */
export async function fetchMemberById(memberId: string): Promise<CentralMember | null> {
  if (!memberId || typeof memberId !== "string") return null;

  let response;
  try {
    response = await api.get(`/members/${memberId}`, { timeout: 10000 });
  } catch (err) {
    if (err instanceof ApiError && err.statusCode === 404) return null;
    throw err;
  }

  const data = response?.data;
  if (!data || data.success !== true) {
    throw new ApiError("Central API returned an invalid member response", 502);
  }
  if (!data.user) return null;

  const [validated] = validateAndMapMembers([data.user]);
  return validated || null;
}

/** Test hook: clear the member cache. */
export function invalidateMembersCache(): void {
  membersCache = null;
  cacheExpiry = 0;
}

/**
 * Shown on the birthday calendar: approved, not ghosted, valid birth_date.
 */
export function isCalendarVisible(m: CentralMember): boolean {
  return (
    m.isApproved === true &&
    m.isGhosted === false &&
    m.birth_date !== null &&
    parseBirthDate(m.birth_date) !== null
  );
}

/**
 * Gets a birthday email: shown on the calendar and has a usable email address.
 */
export function isEmailEligible(m: CentralMember): boolean {
  return isCalendarVisible(m) && typeof m.email === "string" && m.email.includes("@");
}

/**
 * Members (from `members`) whose birthday is celebrated on `date`.
 * Feb 29 birthdays are celebrated on Feb 28 in non-leap years.
 */
export function birthdaysOn<T extends CentralMember>(
  members: T[],
  date: { year: number; month: number; day: number },
  filter: (m: CentralMember) => boolean = isCalendarVisible
): T[] {
  return members.filter(
    (m) => filter(m) && isBirthdayOn(parseBirthDate(m.birth_date!)!, date)
  );
}

/**
 * Strips sensitive fields (email, birth year) for public API responses.
 * When `year` is given, `month`/`day` are the date the birthday is celebrated
 * that year (Feb 29 → Feb 28 in non-leap years); `birthdayMMDD` stays the real date.
 */
export function toPublicBirthdayMember(m: CentralMember, year?: number): PublicBirthdayMember {
  const parsed = parseBirthDate(m.birth_date!);
  if (!parsed) {
    throw new Error(`Invalid birth_date format for member ${m.id}`);
  }

  const mm = String(parsed.month).padStart(2, "0");
  const dd = String(parsed.day).padStart(2, "0");
  const shown = year === undefined ? parsed : observedBirthday(parsed, year);

  return {
    id: m.id,
    name: m.name,
    birthdayMMDD: `${mm}-${dd}`,
    month: shown.month,
    day: shown.day,
    profilePhoto: m.profilePhoto,
  };
}

/**
 * Members whose birthday is celebrated in the given month (1-12) of `year`.
 */
export async function getMembersWithBirthdayInMonth(
  month: number,
  year: number
): Promise<PublicBirthdayMember[]> {
  const all = await fetchAllMembers();
  return all
    .filter(isCalendarVisible)
    .map((m) => toPublicBirthdayMember(m, year))
    .filter((m) => m.month === month);
}

/**
 * Members whose birthday is celebrated today in the configured time zone.
 */
export async function getMembersWithBirthdayToday(): Promise<PublicBirthdayMember[]> {
  const today = getZonedDateParts(new Date(), config.BIRTHDAY_TIMEZONE);
  const all = await fetchAllMembers();
  return birthdaysOn(all, today).map((m) => toPublicBirthdayMember(m, today.year));
}

/**
 * Birthdays in the next `windowDays` days (default 30), soonest first.
 */
export async function getUpcomingBirthdays(
  windowDays = 30
): Promise<Array<PublicBirthdayMember & { daysUntil: number }>> {
  const all = await fetchAllMembers();
  const today = getZonedDateParts(new Date(), config.BIRTHDAY_TIMEZONE);
  const todayEpoch = Date.UTC(today.year, today.month - 1, today.day);
  const DAY_MS = 24 * 60 * 60 * 1000;

  const results: Array<PublicBirthdayMember & { daysUntil: number }> = [];

  for (const m of all.filter(isCalendarVisible)) {
    // This year's celebration date, or next year's if it has passed
    let shown = toPublicBirthdayMember(m, today.year);
    let epoch = Date.UTC(today.year, shown.month - 1, shown.day);
    if (epoch < todayEpoch) {
      shown = toPublicBirthdayMember(m, today.year + 1);
      epoch = Date.UTC(today.year + 1, shown.month - 1, shown.day);
    }

    const daysUntil = Math.round((epoch - todayEpoch) / DAY_MS);
    if (daysUntil <= windowDays) {
      results.push({ ...shown, daysUntil });
    }
  }

  results.sort((a, b) => a.daysUntil - b.daysUntil);
  return results;
}
