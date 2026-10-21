import { z } from "zod";

// A member record from the central API (GET /members). Optional fields fall
// back to defaults; extra fields are dropped.
export const CentralMemberSchema = z.object({
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

// GET /birthdays?month=M&year=Y
export const MonthBirthdaysQuerySchema = z.object({
  month: z.coerce
    .number({ message: "month is required" })
    .int({ message: "month must be an integer" })
    .min(1, { message: "month must be between 1 and 12" })
    .max(12, { message: "month must be between 1 and 12" }),
  year: z.coerce
    .number({ message: "year is required" })
    .int({ message: "year must be an integer" })
    .min(1900, { message: "year must be between 1900 and 2200" })
    .max(2200, { message: "year must be between 1900 and 2200" }),
});

// GET /birthdays/upcoming?window=N
export const UpcomingBirthdaysQuerySchema = z.object({
  window: z.coerce
    .number()
    .int({ message: "window must be an integer" })
    .min(1, { message: "window must be between 1 and 365 days" })
    .max(365, { message: "window must be between 1 and 365 days" })
    .default(30),
});
