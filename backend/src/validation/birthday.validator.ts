import { z } from "zod";

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
