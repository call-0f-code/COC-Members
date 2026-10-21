import dotenv from "dotenv";
dotenv.config();

import { Request, Response } from "express";
import {
  getNextFireTimeUtc,
  getZonedDateParts,
  isLeapYear,
  daysInMonth,
  isValidCalendarDate,
  parseBirthDate,
} from "../src/utils/dateTimeUtils";
import {
  fetchAllMembers,
  getMembersWithBirthdayToday,
  getUpcomingBirthdays,
  toPublicBirthdayMember,
  isEligible,
  invalidateMembersCache,
} from "../src/services/memberService";
import {
  sendBirthdayEmail,
  classifySendError,
  escapeHtml,
  resetResendClient,
} from "../src/utils/birthdayMail";
import {
  processJob,
  runWorkerCycle,
  resetWorkerCircuitBreaker,
} from "../src/services/birthdayRetryWorker";
import {
  getBirthdaysForMonth,
  getTodaysBirthdays,
  getUpcomingBirthdaysCtrl,
  triggerBirthdayJob,
  sendTestBirthdayEmailCtrl,
} from "../src/controllers/birthday.controller";
import api from "../src/utils/api";
import { centralTrackingApi } from "../src/utils/centralApiClient";
import { ApiError } from "../src/utils/apiError";

jest.mock("../src/utils/api");
jest.mock("../src/utils/centralApiClient");
jest.mock("resend", () => {
  return {
    Resend: jest.fn().mockImplementation(() => ({
      emails: {
        send: jest.fn(),
      },
    })),
  };
});

describe("Website Backend Birthday System", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.clearAllMocks();
    invalidateMembersCache();
    resetResendClient();
    resetWorkerCircuitBreaker();
    process.env = { ...originalEnv };
    process.env.BIRTHDAY_JOB_SECRET = "test-job-secret-123";
    process.env.RESEND_API_KEY = "re_test_key";
    process.env.EMAIL_ID = "admin@callofcode.in";
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  // ──────────────────────────────────────────────
  // 1. The birthday scheduler calculates the correct next run in Asia/Kolkata
  // ──────────────────────────────────────────────
  it("1. The birthday scheduler calculates the correct next run in Asia/Kolkata", () => {
    // Reference instant: 2026-10-21 08:30:00 IST (UTC 03:00) -> Next fire is today at 09:00 IST (UTC 03:30)
    const morningNow = new Date("2026-10-21T03:00:00.000Z");
    const nextRunToday = getNextFireTimeUtc(9, 0, "Asia/Kolkata", morningNow);
    expect(nextRunToday.toISOString()).toBe("2026-10-21T03:30:00.000Z");

    // Reference instant: 2026-10-21 10:00:00 IST (UTC 04:30) -> Next fire is tomorrow at 09:00 IST (UTC 03:30 on 2026-10-22)
    const afternoonNow = new Date("2026-10-21T04:30:00.000Z");
    const nextRunTomorrow = getNextFireTimeUtc(9, 0, "Asia/Kolkata", afternoonNow);
    expect(nextRunTomorrow.toISOString()).toBe("2026-10-22T03:30:00.000Z");
  });

  // ──────────────────────────────────────────────
  // 2. Only eligible members with birthdays today are selected
  // ──────────────────────────────────────────────
  it("2. Only eligible members with birthdays today are selected", async () => {
    const today = getZonedDateParts(new Date(), "Asia/Kolkata");
    const todayMM = String(today.month).padStart(2, "0");
    const todayDD = String(today.day).padStart(2, "0");

    const mockMembers = [
      // Eligible and birthday today
      {
        id: "m-eligible-today",
        name: "Alice",
        email: "alice@example.com",
        birth_date: `2000-${todayMM}-${todayDD}`,
        isApproved: true,
        isGhosted: false,
        profilePhoto: null,
      },
      // Birthday today but unapproved
      {
        id: "m-unapproved",
        name: "Bob",
        email: "bob@example.com",
        birth_date: `2000-${todayMM}-${todayDD}`,
        isApproved: false,
        isGhosted: false,
        profilePhoto: null,
      },
      // Birthday today but ghosted
      {
        id: "m-ghosted",
        name: "Charlie",
        email: "charlie@example.com",
        birth_date: `2000-${todayMM}-${todayDD}`,
        isApproved: true,
        isGhosted: true,
        profilePhoto: null,
      },
      // Eligible but different birthday
      {
        id: "m-other-day",
        name: "Dave",
        email: "dave@example.com",
        birth_date: "1999-01-01",
        isApproved: true,
        isGhosted: false,
        profilePhoto: null,
      },
      // Null birth date
      {
        id: "m-no-bday",
        name: "Eve",
        email: "eve@example.com",
        birth_date: null,
        isApproved: true,
        isGhosted: false,
        profilePhoto: null,
      },
    ];

    (api.get as jest.Mock).mockResolvedValue({
      data: { success: true, user: mockMembers },
    });

    const todaysBirthdays = await getMembersWithBirthdayToday();
    expect(todaysBirthdays).toHaveLength(1);
    expect(todaysBirthdays[0].id).toBe("m-eligible-today");
    expect(todaysBirthdays[0].name).toBe("Alice");
  });

  // ──────────────────────────────────────────────
  // 3. Invalid Central Backend responses are treated as errors, not empty successful responses
  // ──────────────────────────────────────────────
  it("3. Invalid Central Backend responses are treated as errors, not empty successful responses", async () => {
    // 3a: Upstream returns HTTP error
    (api.get as jest.Mock).mockRejectedValueOnce(new Error("502 Bad Gateway"));
    await expect(fetchAllMembers(true)).rejects.toThrow("Failed to fetch members from central API");

    // 3b: Upstream returns success: false
    (api.get as jest.Mock).mockResolvedValueOnce({
      data: { success: false, message: "Database down" },
    });
    await expect(fetchAllMembers(true)).rejects.toThrow("Central API returned an invalid or malformed member response");

    // 3c: Upstream returns malformed data without user array
    (api.get as jest.Mock).mockResolvedValueOnce({
      data: { success: true, user: null },
    });
    await expect(fetchAllMembers(true)).rejects.toThrow("Central API returned an invalid or malformed member response");
  });

  // ──────────────────────────────────────────────
  // 4. Successful Resend requests are reported as SENT
  // ──────────────────────────────────────────────
  it("4. Successful Resend requests are reported as SENT to Central Backend", async () => {
    const job = {
      id: "job-101",
      memberId: "mem-1",
      birthdayYear: 2026,
      attemptCount: 0,
      lockToken: "token-101",
    };

    (api.get as jest.Mock).mockResolvedValue({
      data: {
        success: true,
        user: {
          id: "mem-1",
          name: "Frank",
          email: "frank@example.com",
          birth_date: "2000-10-21",
          isApproved: true,
          isGhosted: false,
        },
      },
    });

    const { Resend } = require("resend");
    const mockSend = jest.fn().mockResolvedValue({
      data: { id: "resend-msg-123" },
      error: null,
    });
    Resend.mockImplementation(() => ({ emails: { send: mockSend } }));

    (centralTrackingApi.markJobSent as jest.Mock).mockResolvedValue({
      success: true,
      message: "Marked as sent",
    });

    const success = await processJob(job);
    expect(success).toBe(true);
    expect(mockSend).toHaveBeenCalledWith(
      expect.objectContaining({
        to: "frank@example.com",
        subject: expect.stringContaining("Happy Birthday, Frank!"),
      }),
      { idempotencyKey: "birthday/mem-1/2026" }
    );
    expect(centralTrackingApi.markJobSent).toHaveBeenCalledWith(
      "job-101",
      "token-101",
      "resend-msg-123"
    );
  });

  // ──────────────────────────────────────────────
  // 5. Temporary failures are scheduled for retry
  // ──────────────────────────────────────────────
  it("5. Temporary failures are classified as TRANSIENT and scheduled for retry", async () => {
    const job = {
      id: "job-transient",
      memberId: "mem-2",
      birthdayYear: 2026,
      attemptCount: 1,
      lockToken: "tok-2",
    };

    (api.get as jest.Mock).mockResolvedValue({
      data: {
        success: true,
        user: {
          id: "mem-2",
          name: "Grace",
          email: "grace@example.com",
          birth_date: "2000-10-21",
          isApproved: true,
          isGhosted: false,
        },
      },
    });

    const { Resend } = require("resend");
    Resend.mockImplementation(() => ({
      emails: {
        send: jest.fn().mockResolvedValue({
          data: null,
          error: { message: "Internal server error 500" },
        }),
      },
    }));

    (centralTrackingApi.markJobFailed as jest.Mock).mockResolvedValue({});

    const success = await processJob(job);
    expect(success).toBe(false);
    expect(centralTrackingApi.markJobFailed).toHaveBeenCalledWith(
      "job-transient",
      "tok-2",
      "TRANSIENT",
      expect.stringContaining("500"),
      true
    );
  });

  // ──────────────────────────────────────────────
  // 6. Quota failures do not cause tight retry loops
  // ──────────────────────────────────────────────
  it("6. Quota failures do not cause tight retry loops and pause worker polling", async () => {
    const job = {
      id: "job-quota",
      memberId: "mem-quota",
      birthdayYear: 2026,
      attemptCount: 0,
      lockToken: "tok-quota",
    };

    (api.get as jest.Mock).mockResolvedValue({
      data: {
        success: true,
        user: {
          id: "mem-quota",
          name: "Hannah",
          email: "hannah@example.com",
          birth_date: "2000-10-21",
          isApproved: true,
          isGhosted: false,
        },
      },
    });

    const { Resend } = require("resend");
    Resend.mockImplementation(() => ({
      emails: {
        send: jest.fn().mockResolvedValue({
          data: null,
          error: { name: "rate_limit_exceeded", message: "Daily quota reached", statusCode: 429 },
        }),
      },
    }));

    (centralTrackingApi.markJobFailed as jest.Mock).mockResolvedValue({});
    (centralTrackingApi.claimJobs as jest.Mock).mockResolvedValue([job]);

    // First cycle runs and encounters quota error
    const firstCycle = await runWorkerCycle();
    expect(firstCycle.failed).toBe(1);
    expect(centralTrackingApi.markJobFailed).toHaveBeenCalledWith(
      "job-quota",
      "tok-quota",
      "QUOTA",
      expect.stringContaining("quota"),
      true
    );

    // Second cycle is called immediately after: circuit is open, skipping polling
    (centralTrackingApi.claimJobs as jest.Mock).mockClear();
    const secondCycle = await runWorkerCycle();
    expect(secondCycle.claimed).toBe(0);
    expect(centralTrackingApi.claimJobs).not.toHaveBeenCalled();
  });

  // ──────────────────────────────────────────────
  // 7. Invalid recipient addresses are not retried indefinitely
  // ──────────────────────────────────────────────
  it("7. Invalid recipient addresses are classified as PERMANENT and not retried", async () => {
    const job = {
      id: "job-invalid-email",
      memberId: "mem-bad",
      birthdayYear: 2026,
      attemptCount: 0,
      lockToken: "tok-bad",
    };

    (api.get as jest.Mock).mockResolvedValue({
      data: {
        success: true,
        user: {
          id: "mem-bad",
          name: "InvalidUser",
          email: "not-an-email", // Malformed
          birth_date: "2000-10-21",
          isApproved: true,
          isGhosted: false,
        },
      },
    });

    (centralTrackingApi.markJobFailed as jest.Mock).mockResolvedValue({});

    const success = await processJob(job);
    expect(success).toBe(false);
    expect(centralTrackingApi.markJobFailed).toHaveBeenCalledWith(
      "job-invalid-email",
      "tok-bad",
      "PERMANENT",
      expect.any(String),
      false // isRetryable: false
    );
  });

  // ──────────────────────────────────────────────
  // 8. A failed email does not stop the remaining batch
  // ──────────────────────────────────────────────
  it("8. A failed email does not stop the remaining batch", async () => {
    const job1 = { id: "j1", memberId: "m1", birthdayYear: 2026, attemptCount: 0, lockToken: "t1" };
    const job2 = { id: "j2", memberId: "m2", birthdayYear: 2026, attemptCount: 0, lockToken: "t2" };

    (centralTrackingApi.claimJobs as jest.Mock).mockResolvedValue([job1, job2]);

    // m1 fails, m2 succeeds
    (api.get as jest.Mock).mockImplementation((url: string) => {
      if (url.includes("m1")) {
        return Promise.resolve({
          data: { success: true, user: { id: "m1", name: "M1", email: "m1@example.com", isApproved: true, isGhosted: false, birth_date: "2000-10-21" } },
        });
      }
      return Promise.resolve({
        data: { success: true, user: { id: "m2", name: "M2", email: "m2@example.com", isApproved: true, isGhosted: false, birth_date: "2000-10-21" } },
      });
    });

    const { Resend } = require("resend");
    Resend.mockImplementation(() => ({
      emails: {
        send: jest.fn().mockImplementation((options: any) => {
          if (options.to === "m1@example.com") {
            return Promise.resolve({ data: null, error: { message: "Server error" } });
          }
          return Promise.resolve({ data: { id: "resend-m2" }, error: null });
        }),
      },
    }));

    (centralTrackingApi.markJobSent as jest.Mock).mockResolvedValue({});
    (centralTrackingApi.markJobFailed as jest.Mock).mockResolvedValue({});

    const summary = await runWorkerCycle();
    expect(summary.claimed).toBe(2);
    expect(summary.succeeded).toBe(1);
    expect(summary.failed).toBe(1);
    expect(centralTrackingApi.markJobSent).toHaveBeenCalledWith("j2", "t2", "resend-m2");
    expect(centralTrackingApi.markJobFailed).toHaveBeenCalledWith("j1", "t1", "TRANSIENT", expect.any(String), true);
  });

  // ──────────────────────────────────────────────
  // 9. Stable idempotency keys are reused for the same member/year
  // ──────────────────────────────────────────────
  it("9. Stable idempotency keys are reused for the same member/year", async () => {
    const { Resend } = require("resend");
    const mockSend = jest.fn().mockResolvedValue({ data: { id: "res-id" }, error: null });
    Resend.mockImplementation(() => ({ emails: { send: mockSend } }));

    // First attempt
    await sendBirthdayEmail("test@example.com", "TestUser", "user-uuid-1", 2026);
    expect(mockSend).toHaveBeenCalledWith(
      expect.anything(),
      { idempotencyKey: "birthday/user-uuid-1/2026" }
    );

    // Second retry attempt uses identical idempotencyKey
    await sendBirthdayEmail("test@example.com", "TestUser", "user-uuid-1", 2026);
    expect(mockSend).toHaveBeenLastCalledWith(
      expect.anything(),
      { idempotencyKey: "birthday/user-uuid-1/2026" }
    );
  });

  // ──────────────────────────────────────────────
  // 10. Server restart recovery processes outstanding jobs without resending SENT records
  // ──────────────────────────────────────────────
  it("10. Server restart recovery processes outstanding jobs without resending SENT records", async () => {
    // On restart, claimJobs queries Central Backend for claimable jobs (PENDING, due FAILED, expired PROCESSING)
    // Central Backend's atomic claim explicitly excludes SENT and DEAD records
    const outstandingJob = {
      id: "recovered-job-1",
      memberId: "rec-mem",
      birthdayYear: 2026,
      attemptCount: 1,
      lockToken: "tok-recovered",
    };

    (centralTrackingApi.claimJobs as jest.Mock).mockResolvedValue([outstandingJob]);
    (api.get as jest.Mock).mockResolvedValue({
      data: {
        success: true,
        user: { id: "rec-mem", name: "Rec", email: "rec@example.com", isApproved: true, isGhosted: false, birth_date: "2000-10-21" },
      },
    });

    const { Resend } = require("resend");
    Resend.mockImplementation(() => ({
      emails: { send: jest.fn().mockResolvedValue({ data: { id: "resend-rec" }, error: null }) },
    }));

    (centralTrackingApi.markJobSent as jest.Mock).mockResolvedValue({ success: true });

    const summary = await runWorkerCycle();
    expect(summary.claimed).toBe(1);
    expect(summary.succeeded).toBe(1);
    expect(centralTrackingApi.markJobSent).toHaveBeenCalledWith(
      "recovered-job-1",
      "tok-recovered",
      "resend-rec"
    );
  });

  // ──────────────────────────────────────────────
  // 11. Public calendar responses do not expose member emails
  // ──────────────────────────────────────────────
  it("11. Public calendar responses do not expose member emails", async () => {
    const rawMember = {
      id: "m-public",
      name: "Secret User",
      email: "private_email@example.com",
      birth_date: "1998-05-15",
      isApproved: true,
      isGhosted: false,
      role: "MEMBER",
      profilePhoto: "https://example.com/photo.jpg",
    };

    const publicMember = toPublicBirthdayMember(rawMember);
    expect(publicMember.id).toBe("m-public");
    expect(publicMember.name).toBe("Secret User");
    expect(publicMember.birthdayMMDD).toBe("05-15");
    expect(publicMember.month).toBe(5);
    expect(publicMember.day).toBe(15);
    expect(publicMember.profilePhoto).toBe("https://example.com/photo.jpg");
    expect((publicMember as any).email).toBeUndefined();
  });

  // ──────────────────────────────────────────────
  // 12. Protected POST endpoints reject unauthorized requests
  // ──────────────────────────────────────────────
  it("12. Protected POST endpoints reject unauthorized requests", async () => {
    // 12a: /run-job without secret
    const reqNoSecret = { headers: {}, body: {} } as Request;
    const res = { status: jest.fn().mockReturnThis(), json: jest.fn() } as unknown as Response;

    await expect(triggerBirthdayJob(reqNoSecret, res)).rejects.toThrow(ApiError);
    try {
      await triggerBirthdayJob(reqNoSecret, res);
    } catch (e: any) {
      expect(e.statusCode).toBe(401);
    }

    // 12b: /run-job with wrong secret
    const reqWrongSecret = {
      headers: { "x-birthday-job-secret": "wrong-secret" },
      body: {},
    } as unknown as Request;

    await expect(triggerBirthdayJob(reqWrongSecret, res)).rejects.toThrow(ApiError);
    try {
      await triggerBirthdayJob(reqWrongSecret, res);
    } catch (e: any) {
      expect(e.statusCode).toBe(401);
    }

    // 12c: /test-email without secret
    await expect(sendTestBirthdayEmailCtrl(reqNoSecret, res)).rejects.toThrow(ApiError);
    try {
      await sendTestBirthdayEmailCtrl(reqNoSecret, res);
    } catch (e: any) {
      expect(e.statusCode).toBe(401);
    }
  });

  // ──────────────────────────────────────────────
  // 13. Date calculations work correctly across month, year, and leap-year boundaries
  // ──────────────────────────────────────────────
  it("13. Date calculations work correctly across month, year, and leap-year boundaries", () => {
    // Leap year checks
    expect(isLeapYear(2024)).toBe(true);
    expect(isLeapYear(2025)).toBe(false);
    expect(isLeapYear(2000)).toBe(true);
    expect(isLeapYear(1900)).toBe(false);

    // Days in month
    expect(daysInMonth(2024, 2)).toBe(29);
    expect(daysInMonth(2025, 2)).toBe(28);
    expect(daysInMonth(2026, 4)).toBe(30);
    expect(daysInMonth(2026, 12)).toBe(31);

    // Valid calendar date
    expect(isValidCalendarDate(2024, 2, 29)).toBe(true);
    expect(isValidCalendarDate(2025, 2, 29)).toBe(false);
    expect(isValidCalendarDate(2026, 4, 31)).toBe(false);

    // Parse birth date
    expect(parseBirthDate("2000-02-29")).toEqual({ year: 2000, month: 2, day: 29 });
    expect(parseBirthDate("2001-02-29")).toBeNull();
    expect(parseBirthDate("invalid")).toBeNull();

    // HTML escaping
    expect(escapeHtml("<script>alert('xss')</script>")).toBe(
      "&lt;script&gt;alert(&#39;xss&#39;)&lt;/script&gt;"
    );
  });
});
