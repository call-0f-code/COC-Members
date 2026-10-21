/**
 * birthdayRetryWorker.ts
 * Background worker in Website Backend that polls Central Backend for claimable jobs,
 * sends birthday emails with Resend, and reports results persistently.
 */

import config from "../config/index";
import { centralTrackingApi, ClaimedJob } from "../utils/centralApiClient";
import { fetchMemberById, isEmailEligible } from "./memberService";
import { sendBirthdayEmail } from "../utils/birthdayMail";
import { classifySendError } from "../utils/birthdayErrorClassifier";

export interface WorkerSummary {
  claimed: number;
  processed: number;
  succeeded: number;
  failed: number;
}

export const EMPTY_WORKER_SUMMARY: Readonly<WorkerSummary> = Object.freeze({
  claimed: 0,
  processed: 0,
  succeeded: 0,
  failed: 0,
});

const QUOTA_PAUSE_MS = 4 * 60 * 60 * 1000;

let pollIntervalTimer: ReturnType<typeof setInterval> | null = null;
let isPolling = false;
let quotaExhaustedUntil = 0;

function errorMessage(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}

/**
 * Process a single claimed job: check the member, send the email, report the result.
 */
export async function processJob(job: ClaimedJob): Promise<boolean> {
  // 1. Fetch fresh member details. A failed lookup is retried; it does not
  //    mean the member is gone.
  let member;
  try {
    member = await fetchMemberById(job.memberId);
  } catch (err) {
    console.error(
      `[BirthdayWorker] Member lookup failed for job ${job.id}; will retry: ${errorMessage(err)}`
    );
    await centralTrackingApi.markJobFailed(job, {
      classification: "TRANSIENT",
      isRetryable: true,
      message: `Member lookup failed: ${errorMessage(err)}`.substring(0, 300),
    });
    return false;
  }

  // 2. Member deleted or no longer eligible: no point retrying.
  if (!member || !isEmailEligible(member)) {
    console.warn(
      `[BirthdayWorker] Member ${job.memberId} is no longer eligible. Marking job as DEAD.`
    );
    await centralTrackingApi.markJobFailed(job, {
      classification: "PERMANENT",
      isRetryable: false,
      message: "Member record is missing or not eligible for birthday emails",
    });
    return false;
  }

  // 3. Send the email. Only errors from sending are classified as send failures.
  let resendEmailId: string | null;
  try {
    ({ resendEmailId } = await sendBirthdayEmail(member.email, member.name, {
      profilePhoto: member.profilePhoto,
      memberId: job.memberId,
      birthdayYear: job.birthdayYear,
    }));
  } catch (err: unknown) {
    const classified = classifySendError(err);
    console.error(
      `[BirthdayWorker] Failed sending birthday email to ${member.name} (job: ${job.id}): ${classified.classification} - ${classified.message}`
    );

    if (classified.classification === "QUOTA") {
      quotaExhaustedUntil = Date.now() + QUOTA_PAUSE_MS;
      console.warn(
        `[BirthdayWorker] Quota limit encountered. Pausing worker until ${new Date(
          quotaExhaustedUntil
        ).toISOString()}`
      );
    }

    await centralTrackingApi.markJobFailed(job, classified);
    return false;
  }

  // 4. Record the send. If this fails the email has still gone out, so don't
  //    report a send failure. The job is reclaimed when its lease expires, and
  //    the Resend idempotency key stops a second email on that retry.
  try {
    await centralTrackingApi.markJobSent(job, resendEmailId);
  } catch (err) {
    console.error(
      `[BirthdayWorker] Email sent to ${member.name} but recording it failed (job: ${job.id}): ${errorMessage(err)}`
    );
  }
  console.log(
    `[BirthdayWorker] Successfully sent birthday email to ${member.name} (job: ${job.id}, resendId: ${resendEmailId})`
  );
  return true;
}

/**
 * Execute a single polling cycle: claim a batch and process its jobs in order.
 */
export async function runWorkerCycle(): Promise<WorkerSummary> {
  if (isPolling) {
    return { ...EMPTY_WORKER_SUMMARY };
  }

  if (Date.now() < quotaExhaustedUntil) {
    console.log(
      `[BirthdayWorker] Quota circuit open. Skipping polling until ${new Date(
        quotaExhaustedUntil
      ).toISOString()}`
    );
    return { ...EMPTY_WORKER_SUMMARY };
  }

  isPolling = true;

  try {
    const claimedJobs = await centralTrackingApi.claimJobs(
      config.BIRTHDAY_BATCH_SIZE,
      config.BIRTHDAY_PROCESSING_LEASE_MS
    );

    if (!claimedJobs || claimedJobs.length === 0) {
      return { ...EMPTY_WORKER_SUMMARY };
    }

    console.log(`[BirthdayWorker] Claimed ${claimedJobs.length} job(s) for processing.`);

    let succeeded = 0;
    let failed = 0;

    // One at a time: a handful of birthdays a day doesn't need concurrency.
    for (const job of claimedJobs) {
      // Stop if quota tripped mid-batch; unprocessed jobs are reclaimed after their lease
      if (Date.now() < quotaExhaustedUntil) {
        console.warn("[BirthdayWorker] Quota exceeded mid-batch, stopping remaining batch jobs.");
        break;
      }

      try {
        if (await processJob(job)) succeeded++;
        else failed++;
      } catch (err) {
        console.error(`[BirthdayWorker] Job ${job.id} failed unexpectedly:`, errorMessage(err));
        failed++;
      }
    }

    return {
      claimed: claimedJobs.length,
      processed: succeeded + failed,
      succeeded,
      failed,
    };
  } catch (err: unknown) {
    console.error("[BirthdayWorker] Error during worker polling cycle:", errorMessage(err));
    return { ...EMPTY_WORKER_SUMMARY };
  } finally {
    isPolling = false;
  }
}

/**
 * Start the periodic retry worker polling loop.
 */
export function startBirthdayRetryWorker(): void {
  if (pollIntervalTimer) return;

  const intervalMs = config.BIRTHDAY_RETRY_POLL_INTERVAL_MS;

  // Run initial cycle on startup after small delay (recovery)
  setTimeout(() => {
    runWorkerCycle().catch((e) =>
      console.error("[BirthdayWorker] Error in initial recovery cycle:", e)
    );
  }, 2000);

  pollIntervalTimer = setInterval(() => {
    runWorkerCycle().catch((e) =>
      console.error("[BirthdayWorker] Error in scheduled polling cycle:", e)
    );
  }, intervalMs);

  if (pollIntervalTimer.unref) {
    pollIntervalTimer.unref();
  }

  console.log(`[BirthdayWorker] Started retry worker polling every ${intervalMs} ms.`);
}

/**
 * Stop the worker loop (for graceful shutdown or testing).
 */
export function stopBirthdayRetryWorker(): void {
  if (pollIntervalTimer) {
    clearInterval(pollIntervalTimer);
    pollIntervalTimer = null;
  }
  isPolling = false;
}

/** Test hook: reset the quota pause and polling flag. */
export function resetWorkerCircuitBreaker(): void {
  quotaExhaustedUntil = 0;
  isPolling = false;
}
