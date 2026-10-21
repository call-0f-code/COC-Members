/**
 * centralApiClient.ts
 * Client for the central API's internal birthday-email job endpoints
 * (COC-API /api/v1/birthday-emails). Uses the shared `api` instance and
 * authenticates with the `x-internal-secret` header.
 */

import api from "./api";
import config from "../config/index";
import type { ClassifiedError } from "./birthdayErrorClassifier";

export interface ClaimedJob {
  id: string;
  memberId: string;
  birthdayYear: number;
  attemptCount: number;
  lockToken: string;
}

export interface InitializeResult {
  created: number;
  existing: number;
  totalEligible: number;
}

export interface StatsResult {
  pending: number;
  processing: number;
  sent: number;
  failed: number;
  dead: number;
  dueForRetry: number;
  total: number;
}

export interface FailedJobResult {
  success: boolean;
  status: "FAILED" | "DEAD";
  attemptCount: number;
  nextRetryAt: string | null;
}

const BASE = "/birthday-emails";

function requestConfig() {
  return {
    headers: { "x-internal-secret": config.BIRTHDAY_SERVICE_SECRET },
    timeout: 15000,
  };
}

export const centralTrackingApi = {
  async initializeJobs(birthdayYear: number, memberIds: string[]): Promise<InitializeResult> {
    const response = await api.post(
      `${BASE}/initialize`,
      { birthdayYear, memberIds },
      requestConfig()
    );
    return response.data?.data;
  },

  async claimJobs(batchSize: number, leaseDurationMs: number): Promise<ClaimedJob[]> {
    const response = await api.post(
      `${BASE}/claim`,
      { batchSize, leaseDurationMs },
      requestConfig()
    );
    return Array.isArray(response.data?.jobs) ? response.data.jobs : [];
  },

  async markJobSent(
    job: ClaimedJob,
    providerMessageId: string | null
  ): Promise<{ success: boolean; message: string }> {
    const response = await api.post(
      `${BASE}/${job.id}/sent`,
      { lockToken: job.lockToken, providerMessageId },
      requestConfig()
    );
    return response.data;
  },

  async markJobFailed(job: ClaimedJob, failure: ClassifiedError): Promise<FailedJobResult> {
    const response = await api.post(
      `${BASE}/${job.id}/failed`,
      {
        lockToken: job.lockToken,
        errorClassification: failure.classification,
        errorMessage: failure.message,
        isRetryable: failure.isRetryable,
      },
      requestConfig()
    );
    return response.data;
  },

  async getStats(): Promise<StatsResult> {
    const response = await api.get(`${BASE}/stats`, requestConfig());
    return response.data?.stats;
  },
};
