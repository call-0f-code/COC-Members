import axios, { AxiosInstance } from "axios";
import config from "../config/index";

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

function createClient(): AxiosInstance {
  const rawApiUrl = (config.API_URL || process.env.API_URL || "http://localhost:5000").trim().replace(/\/+$/, "");
  const baseV1 = rawApiUrl.endsWith("/api/v1") ? rawApiUrl : `${rawApiUrl}/api/v1`;
  const internalSecret = config.BIRTHDAY_SERVICE_SECRET || process.env.INTERNAL_SERVICE_SECRET || "";

  return axios.create({
    baseURL: `${baseV1}/birthday-emails`,
    headers: {
      "Content-Type": "application/json",
      "x-service-secret": internalSecret,
      "x-internal-secret": internalSecret,
    },
    timeout: 15000,
  });
}

let internalClient: AxiosInstance | null = null;
function getClient(): AxiosInstance {
  if (!internalClient) {
    internalClient = createClient();
  }
  return internalClient;
}

export const centralTrackingApi = {
  async initializeJobs(birthdayYear: number, memberIds: string[]): Promise<InitializeResult> {
    const response = await getClient().post("/initialize", {
      birthdayYear,
      memberIds,
    });
    return response.data?.data;
  },

  async claimJobs(batchSize = 10, leaseDurationMs = 300000): Promise<ClaimedJob[]> {
    const response = await getClient().post("/claim", {
      batchSize,
      leaseDurationMs,
    });
    return Array.isArray(response.data?.jobs) ? response.data.jobs : [];
  },

  async markJobSent(
    id: string,
    lockToken: string,
    providerMessageId?: string | null,
    sentAt?: string
  ): Promise<{ success: boolean; message: string }> {
    const response = await getClient().post(`/${id}/sent`, {
      lockToken,
      providerMessageId,
      sentAt,
    });
    return response.data;
  },

  async markJobFailed(
    id: string,
    lockToken: string,
    errorClassification: string,
    errorMessage: string,
    isRetryable: boolean
  ): Promise<{ success: boolean; status: string; attemptCount: number; nextRetryAt: string | null }> {
    const response = await getClient().post(`/${id}/failed`, {
      lockToken,
      errorClassification,
      errorMessage,
      isRetryable,
    });
    return response.data;
  },

  async getStats(): Promise<StatsResult> {
    const response = await getClient().get("/stats");
    return response.data?.stats;
  },
};
