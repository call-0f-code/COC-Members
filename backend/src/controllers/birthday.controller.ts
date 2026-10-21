/**
 * birthday.controller.ts
 * Birthday API endpoints for the website backend.
 *
 * PUBLIC ENDPOINTS:
 *   GET /api/v1/birthdays?month=M&year=Y
 *   GET /api/v1/birthdays/today
 *   GET /api/v1/birthdays/upcoming?window=30
 *
 * PROTECTED OPERATIONAL ENDPOINTS:
 *   POST /api/v1/birthdays/run-job
 *   POST /api/v1/birthdays/test-email
 */

import { Request, Response } from "express";
import crypto from "crypto";
import { ApiError } from "../utils/apiError";
import config from "../config/index";
import {
  getMembersWithBirthdayInMonth,
  getMembersWithBirthdayToday,
  getUpcomingBirthdays,
} from "../services/memberService";
import { runBirthdayJob } from "../services/birthdayScheduler";
import { sendBirthdayEmail } from "../utils/birthdayMail";

/**
 * Validate incoming secret against configured BIRTHDAY_JOB_SECRET.
 */
function verifyJobSecret(req: Request): void {
  const jobSecret = config.BIRTHDAY_JOB_SECRET || process.env.BIRTHDAY_JOB_SECRET;

  if (!jobSecret) {
    throw new ApiError(
      "BIRTHDAY_JOB_SECRET is not configured on server. Endpoint disabled.",
      403
    );
  }

  const provided =
    (req.headers["x-birthday-job-secret"] as string) || req.body?.secret;

  if (!provided || typeof provided !== "string") {
    throw new ApiError("Unauthorized: Missing birthday secret", 401);
  }

  const providedBuf = Buffer.from(provided, "utf-8");
  const expectedBuf = Buffer.from(jobSecret, "utf-8");

  if (
    providedBuf.length !== expectedBuf.length ||
    !crypto.timingSafeEqual(providedBuf, expectedBuf)
  ) {
    throw new ApiError("Unauthorized: Invalid birthday secret", 401);
  }
}

// ──────────────────────────────────────────────
// GET /birthdays?month=M&year=Y
// ──────────────────────────────────────────────
export const getBirthdaysForMonth = async (
  req: Request,
  res: Response
): Promise<void> => {
  const monthStr = req.query.month as string;
  const yearStr = req.query.year as string;

  if (!monthStr || !/^\d+$/.test(monthStr.trim())) {
    throw new ApiError("month must be a positive integer between 1 and 12", 400);
  }
  if (!yearStr || !/^\d{4}$/.test(yearStr.trim())) {
    throw new ApiError("year must be a 4-digit integer", 400);
  }

  const month = parseInt(monthStr.trim(), 10);
  const year = parseInt(yearStr.trim(), 10);

  if (month < 1 || month > 12) {
    throw new ApiError("month must be an integer between 1 and 12", 400);
  }
  if (year < 1900 || year > 2200) {
    throw new ApiError("year must be between 1900 and 2200", 400);
  }

  const members = await getMembersWithBirthdayInMonth(month);

  res.status(200).json({
    success: true,
    month,
    year,
    data: members,
  });
};

// ──────────────────────────────────────────────
// GET /birthdays/today
// ──────────────────────────────────────────────
export const getTodaysBirthdays = async (
  _req: Request,
  res: Response
): Promise<void> => {
  const members = await getMembersWithBirthdayToday();

  res.status(200).json({
    success: true,
    data: members,
  });
};

// ──────────────────────────────────────────────
// GET /birthdays/upcoming?window=30
// ──────────────────────────────────────────────
export const getUpcomingBirthdaysCtrl = async (
  req: Request,
  res: Response
): Promise<void> => {
  const windowStr = req.query.window as string | undefined;

  let window = 30;
  if (windowStr !== undefined) {
    if (!/^\d+$/.test(windowStr.trim())) {
      throw new ApiError("window must be a positive integer", 400);
    }
    const parsed = parseInt(windowStr.trim(), 10);
    if (parsed < 1 || parsed > 365) {
      throw new ApiError("window must be between 1 and 365 days", 400);
    }
    window = parsed;
  }

  const members = await getUpcomingBirthdays(window);

  res.status(200).json({
    success: true,
    window,
    data: members,
  });
};

// ──────────────────────────────────────────────
// POST /birthdays/run-job  (protected operational endpoint)
// ──────────────────────────────────────────────
export const triggerBirthdayJob = async (
  req: Request,
  res: Response
): Promise<void> => {
  verifyJobSecret(req);

  const result = await runBirthdayJob();

  res.status(200).json({
    success: true,
    message: "Birthday job completed successfully",
    result,
  });
};

// ──────────────────────────────────────────────
// POST /birthdays/test-email (protected operational endpoint)
// ──────────────────────────────────────────────
export const sendTestBirthdayEmailCtrl = async (
  req: Request,
  res: Response
): Promise<void> => {
  verifyJobSecret(req);

  const { email, name } = req.body || {};
  if (!email || typeof email !== "string" || !email.includes("@")) {
    throw new ApiError("Valid recipient 'email' is required in request body", 400);
  }

  const recipientName = name && typeof name === "string" ? name.trim() : "Developer";
  const result = await sendBirthdayEmail(email.trim(), recipientName);

  res.status(200).json({
    success: true,
    message: `Test birthday email sent successfully to ${email}`,
    result,
  });
};
