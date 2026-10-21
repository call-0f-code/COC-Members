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
import * as memberService from "../services/memberService";
import { runBirthdayJobNow } from "../services/birthdayScheduler";
import { sendBirthdayEmail } from "../utils/birthdayMail";
import { parseQuery } from "../middleware/validate";
import {
  MonthBirthdaysQuerySchema,
  UpcomingBirthdaysQuerySchema,
} from "../validation/birthday.validator";

/**
 * Validate incoming secret against configured BIRTHDAY_JOB_SECRET.
 */
function verifyJobSecret(req: Request): void {
  const jobSecret = config.BIRTHDAY_JOB_SECRET;

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
export const getBirthdaysForMonth = async (req: Request, res: Response): Promise<void> => {
  const { month, year } = parseQuery(MonthBirthdaysQuerySchema, req.query);

  const members = await memberService.getMembersWithBirthdayInMonth(month, year);

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
export const getTodaysBirthdays = async (_req: Request, res: Response): Promise<void> => {
  const members = await memberService.getMembersWithBirthdayToday();

  res.status(200).json({
    success: true,
    data: members,
  });
};

// ──────────────────────────────────────────────
// GET /birthdays/upcoming?window=30
// ──────────────────────────────────────────────
export const getUpcomingBirthdays = async (req: Request, res: Response): Promise<void> => {
  const { window } = parseQuery(UpcomingBirthdaysQuerySchema, req.query);

  const members = await memberService.getUpcomingBirthdays(window);

  res.status(200).json({
    success: true,
    window,
    data: members,
  });
};

// ──────────────────────────────────────────────
// POST /birthdays/run-job  (protected operational endpoint)
// ──────────────────────────────────────────────
export const triggerBirthdayJob = async (req: Request, res: Response): Promise<void> => {
  verifyJobSecret(req);

  const result = await runBirthdayJobNow();

  if (result.skipped === "already_running") {
    throw new ApiError("Birthday job is already running", 409);
  }
  if (result.skipped === "shutting_down") {
    throw new ApiError("Server is shutting down; birthday job not run", 503);
  }

  res.status(200).json({
    success: true,
    message: "Birthday job completed successfully",
    result,
  });
};

// ──────────────────────────────────────────────
// POST /birthdays/test-email (protected operational endpoint)
// ──────────────────────────────────────────────
export const sendTestBirthdayEmail = async (req: Request, res: Response): Promise<void> => {
  verifyJobSecret(req);

  const { email, name, profilePhoto } = req.body || {};
  if (!email || typeof email !== "string" || !email.includes("@")) {
    throw new ApiError("Valid recipient 'email' is required in request body", 400);
  }

  const recipientName = name && typeof name === "string" ? name.trim() : "Developer";
  // Optional photo URL, to preview the header with a profile photo
  const result = await sendBirthdayEmail(email.trim(), recipientName, {
    profilePhoto: typeof profilePhoto === "string" ? profilePhoto : null,
  });

  res.status(200).json({
    success: true,
    message: `Test birthday email sent successfully to ${email}`,
    result,
  });
};
