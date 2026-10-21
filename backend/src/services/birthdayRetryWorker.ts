/**
 * birthdayRetryWorker.ts
 * Background worker in Website Backend that polls Central Backend for claimable jobs,
 * sends birthday emails with Resend, and reports results persistently.
 */

import config from "../config/index";
import { centralTrackingApi, ClaimedJob } from "../utils/centralApiClient";
import { fetchMemberById, isEligible } from "./memberService";
import { sendBirthdayEmail, classifySendError } from "../utils/birthdayMail";

let pollIntervalTimer: ReturnType<typeof setInterval> | null = null;
let isPolling = false;
let quotaExhaustedUntil = 0;

/**
 * Process a single claimed job.
 * Handles member verification, email sending, error classification, and reporting.
 */
export async function processJob(job: ClaimedJob): Promise<boolean> {
  // 1. Obtain current member details directly from Central Backend
  const member = await fetchMemberById(job.memberId);

  // 2. Validate current member eligibility and recipient email
  if (!member || !isEligible(member)) {
    console.warn(
      `[BirthdayWorker] Member ${job.memberId} is no longer eligible. Marking job as DEAD.`
    );
    await centralTrackingApi.markJobFailed(
      job.id,
      job.lockToken,
      "PERMANENT",
      "Member record is missing or not eligible for birthday emails",
      false
    );
    return false;
  }

  // 3. Send email via Resend with stable idempotency key
  try {
    const { resendEmailId } = await sendBirthdayEmail(
      member.email,
      member.name,
      job.memberId,
      job.birthdayYear
    );

    // 4. Report successful send to Central Backend
    await centralTrackingApi.markJobSent(job.id, job.lockToken, resendEmailId);
    console.log(
      `[BirthdayWorker] Successfully sent birthday email to ${member.name} (job: ${job.id}, resendId: ${resendEmailId})`
    );
    return true;
  } catch (err: unknown) {
    const classified = classifySendError(err);
    console.error(
      `[BirthdayWorker] Failed sending birthday email to ${member.name} (job: ${job.id}): ${classified.classification} - ${classified.message}`
    );

    if (classified.classification === "QUOTA") {
      // Pause worker polling for 4 hours to prevent tight retry loops
      quotaExhaustedUntil = Date.now() + 4 * 60 * 60 * 1000;
      console.warn(
        `[BirthdayWorker] Quota limit encountered. Pausing worker until ${new Date(
          quotaExhaustedUntil
        ).toISOString()}`
      );
    }

    // 5. Report failure outcome to Central Backend with error classification
    await centralTrackingApi.markJobFailed(
      job.id,
      job.lockToken,
      classified.classification,
      classified.message,
      classified.isRetryable
    );
    return false;
  }
}

/**
 * Execute a single polling cycle: claim batch and process jobs with concurrency limit.
 */
export async function runWorkerCycle(): Promise<{
  claimed: number;
  processed: number;
  succeeded: number;
  failed: number;
}> {
  if (isPolling) {
    return { claimed: 0, processed: 0, succeeded: 0, failed: 0 };
  }

  if (Date.now() < quotaExhaustedUntil) {
    console.log(
      `[BirthdayWorker] Quota circuit open. Skipping polling until ${new Date(
        quotaExhaustedUntil
      ).toISOString()}`
    );
    return { claimed: 0, processed: 0, succeeded: 0, failed: 0 };
  }

  isPolling = true;

  try {
    const batchSize = config.BIRTHDAY_BATCH_SIZE;
    const leaseDurationMs = config.BIRTHDAY_PROCESSING_LEASE_MS;

    const claimedJobs = await centralTrackingApi.claimJobs(
      batchSize,
      leaseDurationMs
    );

    if (!claimedJobs || claimedJobs.length === 0) {
      return { claimed: 0, processed: 0, succeeded: 0, failed: 0 };
    }

    console.log(`[BirthdayWorker] Claimed ${claimedJobs.length} job(s) for processing.`);

    let succeeded = 0;
    let failed = 0;

    // Process jobs with bounded concurrency
    const concurrency = Math.max(1, config.BIRTHDAY_WORKER_CONCURRENCY);
    for (let i = 0; i < claimedJobs.length; i += concurrency) {
      // Stop if quota tripped mid-batch
      if (Date.now() < quotaExhaustedUntil) {
        console.warn("[BirthdayWorker] Quota exceeded mid-batch, stopping remaining batch jobs.");
        break;
      }

      const chunk = claimedJobs.slice(i, i + concurrency);
      const results = await Promise.allSettled(chunk.map((job) => processJob(job)));

      for (const res of results) {
        if (res.status === "fulfilled" && res.value === true) {
          succeeded++;
        } else {
          failed++;
        }
      }
    }

    return {
      claimed: claimedJobs.length,
      processed: succeeded + failed,
      succeeded,
      failed,
    };
  } catch (err: any) {
    console.error("[BirthdayWorker] Error during worker polling cycle:", err?.message || err);
    return { claimed: 0, processed: 0, succeeded: 0, failed: 0 };
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

  console.log(
    `[BirthdayWorker] Started retry worker polling every ${intervalMs} ms.`
  );
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

export function resetWorkerCircuitBreaker(): void {
  quotaExhaustedUntil = 0;
  isPolling = false;
}
