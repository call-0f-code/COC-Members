/**
 * birthdayScheduler.ts
 * Daily birthday email scheduler that triggers at 09:00 Asia/Kolkata.
 * Integrates with Central Backend for persistent tracking and idempotent initialization.
 */

import config from "../config/index";
import {
  getZonedDateParts,
  getNextFireTimeUtc,
  parseBirthDate,
} from "../utils/dateTimeUtils";
import { fetchAllMembers, isEligible } from "./memberService";
import { centralTrackingApi } from "../utils/centralApiClient";
import { runWorkerCycle, startBirthdayRetryWorker, stopBirthdayRetryWorker } from "./birthdayRetryWorker";

let schedulerTimer: ReturnType<typeof setTimeout> | null = null;
let isJobRunning = false;
let isShuttingDown = false;

/**
 * Execute the daily birthday orchestration:
 * 1. Find today's date in Asia/Kolkata
 * 2. Fetch all members and filter eligible birthdays today
 * 3. Initialize tracking jobs in Central Backend
 * 4. Trigger worker cycle to process claimed jobs
 */
export async function runBirthdayJob(): Promise<{
  year: number;
  eligibleCount: number;
  initialized: { created: number; existing: number; totalEligible: number } | null;
  workerSummary: { claimed: number; processed: number; succeeded: number; failed: number };
}> {
  if (isShuttingDown) {
    console.warn("[BirthdayScheduler] Shutdown in progress, skipping job run.");
    return {
      year: 0,
      eligibleCount: 0,
      initialized: null,
      workerSummary: { claimed: 0, processed: 0, succeeded: 0, failed: 0 },
    };
  }

  if (isJobRunning) {
    console.warn("[BirthdayScheduler] Job is already running. Skipping overlapping execution.");
    return {
      year: 0,
      eligibleCount: 0,
      initialized: null,
      workerSummary: { claimed: 0, processed: 0, succeeded: 0, failed: 0 },
    };
  }

  isJobRunning = true;

  try {
    const today = getZonedDateParts(new Date(), config.BIRTHDAY_TIMEZONE);
    console.log(
      `[BirthdayScheduler] Running daily job for ${today.year}-${today.month}-${today.day} in ${config.BIRTHDAY_TIMEZONE}`
    );

    // 1. Fetch all members (bypassing cache to ensure current eligibility)
    const members = await fetchAllMembers(true);

    // 2. Identify eligible members whose birthday matches today
    const birthdayMembers = members.filter((m) => {
      if (!isEligible(m)) return false;
      const parsed = parseBirthDate(m.birth_date!);
      if (!parsed) return false;
      return parsed.month === today.month && parsed.day === today.day;
    });

    console.log(
      `[BirthdayScheduler] Found ${birthdayMembers.length} eligible member(s) with birthday today.`
    );

    let initResult = null;
    if (birthdayMembers.length > 0) {
      const memberIds = birthdayMembers.map((m) => m.id);
      // 3. Initialize tracking jobs in Central Backend idempotently
      initResult = await centralTrackingApi.initializeJobs(today.year, memberIds);
      console.log("[BirthdayScheduler] Initialization result from Central Backend:", initResult);
    }

    // 4. Trigger worker cycle to immediately process and send due emails
    const workerSummary = await runWorkerCycle();
    console.log("[BirthdayScheduler] Worker cycle summary:", workerSummary);

    return {
      year: today.year,
      eligibleCount: birthdayMembers.length,
      initialized: initResult,
      workerSummary,
    };
  } catch (err: any) {
    console.error("[BirthdayScheduler] Error executing daily birthday job:", err?.message || err);
    throw err;
  } finally {
    isJobRunning = false;
  }
}

/**
 * Schedule the next daily execution at 09:00 Asia/Kolkata.
 */
function scheduleNextRun(): void {
  if (isShuttingDown || !config.BIRTHDAY_SCHEDULER_ENABLED) return;

  const targetHour = config.BIRTHDAY_SCHEDULE_HOUR;
  const targetMinute = config.BIRTHDAY_SCHEDULE_MINUTE;
  const timeZone = config.BIRTHDAY_TIMEZONE;

  const nextFireUtc = getNextFireTimeUtc(targetHour, targetMinute, timeZone);
  const msUntilFire = Math.max(0, nextFireUtc.getTime() - Date.now());

  console.log(
    `[BirthdayScheduler] Next scheduled run at ${nextFireUtc.toISOString()} (in ~${Math.round(
      msUntilFire / 60000
    )} minutes)`
  );

  schedulerTimer = setTimeout(async () => {
    try {
      await runBirthdayJob();
    } catch (err) {
      console.error("[BirthdayScheduler] Scheduled job error:", err);
    } finally {
      scheduleNextRun();
    }
  }, msUntilFire);

  if (schedulerTimer.unref) {
    schedulerTimer.unref();
  }
}

/**
 * Check if the 9:00 AM IST slot for today has already passed.
 * If so, perform an idempotent catch-up check to ensure today's jobs are initialized.
 */
async function performStartupCatchup(): Promise<void> {
  const now = new Date();
  const current = getZonedDateParts(now, config.BIRTHDAY_TIMEZONE);
  const targetHour = config.BIRTHDAY_SCHEDULE_HOUR;
  const targetMinute = config.BIRTHDAY_SCHEDULE_MINUTE;

  const passedToday =
    current.hour > targetHour ||
    (current.hour === targetHour && current.minute >= targetMinute);

  if (passedToday) {
    console.log(
      `[BirthdayScheduler] Startup catch-up: Today's scheduled time (${targetHour}:${targetMinute} IST) has already passed. Running catch-up check.`
    );
    try {
      await runBirthdayJob();
    } catch (err) {
      console.error("[BirthdayScheduler] Startup catch-up failed:", err);
    }
  }
}

/**
 * Start the daily scheduler and retry worker.
 * Called once during application boot (e.g. from server.ts).
 */
export function startBirthdayScheduler(): void {
  if (!config.BIRTHDAY_SCHEDULER_ENABLED) {
    console.log(
      "[BirthdayScheduler] BIRTHDAY_SCHEDULER_ENABLED=false: In-process scheduler is disabled."
    );
    return;
  }

  if (schedulerTimer) {
    console.warn("[BirthdayScheduler] Scheduler is already active.");
    return;
  }

  isShuttingDown = false;

  // Start the background retry worker
  startBirthdayRetryWorker();

  // Run catch-up asynchronously after server finishes initialization
  setTimeout(() => {
    performStartupCatchup().catch((e) =>
      console.error("[BirthdayScheduler] Catchup error:", e)
    );
  }, 3000);

  // Schedule next 9:00 AM IST run
  scheduleNextRun();
  console.log("[BirthdayScheduler] Started birthday scheduler.");
}

/**
 * Stop the scheduler and retry worker (for graceful server shutdown or test teardown).
 */
export function stopBirthdayScheduler(): void {
  isShuttingDown = true;
  if (schedulerTimer) {
    clearTimeout(schedulerTimer);
    schedulerTimer = null;
  }
  stopBirthdayRetryWorker();
  console.log("[BirthdayScheduler] Stopped birthday scheduler and retry worker.");
}
