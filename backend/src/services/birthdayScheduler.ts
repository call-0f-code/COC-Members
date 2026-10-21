/**
 * birthdayScheduler.ts
 * Once a day (09:00 in BIRTHDAY_TIMEZONE by default), creates birthday email
 * jobs in the central API for members whose birthday is today. The retry
 * worker's regular poll then sends them.
 */

import cron, { ScheduledTask } from "node-cron";
import config from "../config/index";
import { getZonedDateParts, hasTimePassed } from "../utils/dateTimeUtils";
import { birthdaysOn, fetchAllMembers, isEmailEligible } from "./memberService";
import { centralTrackingApi, InitializeResult } from "../utils/centralApiClient";
import { startBirthdayRetryWorker, stopBirthdayRetryWorker } from "./birthdayRetryWorker";

let dailyTask: ScheduledTask | null = null;
let isJobRunning = false;
let isShuttingDown = false;

export type BirthdayJobResult =
  | { skipped: "shutting_down" | "already_running" }
  | {
      skipped?: undefined;
      year: number;
      eligibleCount: number;
      initialized: InitializeResult | null;
    };

/**
 * Create today's birthday email jobs in the central API.
 * Safe to run more than once a day: the central API skips existing jobs.
 */
export async function runBirthdayJob(): Promise<BirthdayJobResult> {
  if (isShuttingDown) {
    console.warn("[BirthdayScheduler] Shutdown in progress, skipping job run.");
    return { skipped: "shutting_down" };
  }

  if (isJobRunning) {
    console.warn("[BirthdayScheduler] Job is already running. Skipping overlapping execution.");
    return { skipped: "already_running" };
  }

  isJobRunning = true;

  try {
    const today = getZonedDateParts(new Date(), config.BIRTHDAY_TIMEZONE);
    console.log(
      `[BirthdayScheduler] Running daily job for ${today.year}-${today.month}-${today.day} in ${config.BIRTHDAY_TIMEZONE}`
    );

    // Bypass the cache so eligibility is current
    const members = await fetchAllMembers(true);
    const birthdayMembers = birthdaysOn(members, today, isEmailEligible);

    console.log(
      `[BirthdayScheduler] Found ${birthdayMembers.length} eligible member(s) with birthday today.`
    );

    let initResult: InitializeResult | null = null;
    if (birthdayMembers.length > 0) {
      initResult = await centralTrackingApi.initializeJobs(
        today.year,
        birthdayMembers.map((m) => m.id)
      );
      console.log("[BirthdayScheduler] Initialization result from Central Backend:", initResult);
    }

    return {
      year: today.year,
      eligibleCount: birthdayMembers.length,
      initialized: initResult,
    };
  } catch (err: any) {
    console.error("[BirthdayScheduler] Error executing daily birthday job:", err?.message || err);
    throw err;
  } finally {
    isJobRunning = false;
  }
}

async function runLogged(label: string): Promise<void> {
  try {
    await runBirthdayJob();
  } catch (err) {
    console.error(`[BirthdayScheduler] ${label} failed:`, err);
  }
}

/**
 * Start the daily schedule and the retry worker.
 * Called once during application boot (from server.ts).
 */
export function startBirthdayScheduler(): void {
  if (!config.BIRTHDAY_SCHEDULER_ENABLED) {
    console.log(
      "[BirthdayScheduler] BIRTHDAY_SCHEDULER_ENABLED=false: In-process scheduler is disabled."
    );
    return;
  }

  if (!config.BIRTHDAY_SERVICE_SECRET) {
    console.error(
      "[BirthdayScheduler] BIRTHDAY_SERVICE_SECRET (or INTERNAL_SERVICE_SECRET) is not set; " +
        "the central API would reject every call. Scheduler not started."
    );
    return;
  }

  if (dailyTask) {
    console.warn("[BirthdayScheduler] Scheduler is already active.");
    return;
  }

  isShuttingDown = false;
  startBirthdayRetryWorker();

  const hour = config.BIRTHDAY_SCHEDULE_HOUR;
  const minute = config.BIRTHDAY_SCHEDULE_MINUTE;
  dailyTask = cron.schedule(`${minute} ${hour} * * *`, () => runLogged("Scheduled job"), {
    timezone: config.BIRTHDAY_TIMEZONE,
  });

  // If the server starts after today's run time, run now so today isn't missed.
  const now = getZonedDateParts(new Date(), config.BIRTHDAY_TIMEZONE);
  if (hasTimePassed(now, hour, minute)) {
    console.log("[BirthdayScheduler] Today's run time has passed. Running catch-up.");
    void runLogged("Startup catch-up");
  }

  console.log(
    `[BirthdayScheduler] Started: daily at ${hour}:${String(minute).padStart(2, "0")} ${config.BIRTHDAY_TIMEZONE}.`
  );
}

/**
 * Stop the schedule and the retry worker (graceful shutdown or tests).
 */
export function stopBirthdayScheduler(): void {
  isShuttingDown = true;
  dailyTask?.stop();
  dailyTask = null;
  stopBirthdayRetryWorker();
  console.log("[BirthdayScheduler] Stopped birthday scheduler and retry worker.");
}
