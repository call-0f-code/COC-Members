import dotenv from "dotenv";
dotenv.config();

import { Request, Response } from "express";
import cron from "node-cron";
import {
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
  invalidateMembersCache,
} from "../src/services/memberService";
import { sendBirthdayEmail, resetResendClient } from "../src/utils/birthdayMail";
import { buildBirthdayHtml, escapeHtml } from "../src/utils/birthdayEmailTemplate";
import {
  processJob,
  runWorkerCycle,
  resetWorkerCircuitBreaker,
} from "../src/services/birthdayRetryWorker";
import {
  resetSchedulerState,
  startBirthdayScheduler,
  stopBirthdayScheduler,
} from "../src/services/birthdayScheduler";
import {
  getBirthdaysForMonth,
  triggerBirthdayJob,
  sendTestBirthdayEmail,
} from "../src/controllers/birthday.controller";
import api from "../src/utils/api";
import config from "../src/config/index";
import { centralTrackingApi } from "../src/utils/centralApiClient";
import { ApiError } from "../src/utils/apiError";

const member = (overrides: Record<string, unknown> = {}) => ({
  id: "mem-1",
  name: "Frank",
  email: "frank@example.com",
  birth_date: "2000-10-21",
  isApproved: true,
  isGhosted: false,
  profilePhoto: null,
  ...overrides,
});

const mockResend = (send: jest.Mock) => {
  const { Resend } = require("resend");
  Resend.mockImplementation(() => ({ emails: { send } }));
};

jest.mock("../src/utils/api");
jest.mock("../src/utils/centralApiClient");
jest.mock("node-cron", () => ({
  __esModule: true,
  default: { schedule: jest.fn(() => ({ stop: jest.fn(), destroy: jest.fn() })) },
}));
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
    config.BIRTHDAY_JOB_SECRET = "test-job-secret-123";
    config.RESEND_API_KEY = "re_test_key";
    config.EMAIL_ID = "admin@callofcode.in";
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  // ──────────────────────────────────────────────
  // 1. The scheduler runs daily at 09:00 in the configured time zone
  // ──────────────────────────────────────────────
  describe("1. scheduler", () => {
    const savedConfig = { ...config };

    beforeEach(() => {
      config.BIRTHDAY_SCHEDULER_ENABLED = true;
      config.BIRTHDAY_SERVICE_SECRET = "svc-secret";
      config.BIRTHDAY_TIMEZONE = "Asia/Kolkata";
      config.BIRTHDAY_SCHEDULE_HOUR = 9;
      config.BIRTHDAY_SCHEDULE_MINUTE = 0;
    });
    afterEach(() => {
      stopBirthdayScheduler();
      resetSchedulerState(); // stop() marks the module as shutting down
      Object.assign(config, savedConfig);
      jest.useRealTimers();
    });

    it("schedules 09:00 Asia/Kolkata and skips catch-up before 09:00", () => {
      jest.useFakeTimers({ now: new Date("2026-10-21T02:00:00.000Z") }); // 07:30 IST
      startBirthdayScheduler();

      expect(cron.schedule).toHaveBeenCalledWith("0 9 * * *", expect.any(Function), {
        timezone: "Asia/Kolkata",
      });
      expect(api.get).not.toHaveBeenCalled();
    });

    it("runs a catch-up when started after 09:00", async () => {
      jest.useFakeTimers({
        now: new Date("2026-10-21T06:00:00.000Z"), // 11:30 IST
        doNotFake: ["nextTick", "setImmediate"],
      });
      (api.get as jest.Mock).mockResolvedValue({ data: { success: true, user: [] } });

      startBirthdayScheduler();
      await new Promise((r) => setImmediate(r));

      expect(api.get).toHaveBeenCalledWith("/members/", expect.anything());
    });

    it("does not start without a service secret", () => {
      config.BIRTHDAY_SERVICE_SECRET = "";
      startBirthdayScheduler();
      expect(cron.schedule).not.toHaveBeenCalled();
    });
  });

  it("1b. Member records that don't match the expected shape are dropped", async () => {
    (api.get as jest.Mock).mockResolvedValue({
      data: {
        success: true,
        user: [
          { ...member({ id: "ok" }), extra: "dropped", role: 42 },
          { ...member({ id: "no-flags" }), isApproved: undefined },
          null,
        ],
      },
    });

    const members = await fetchAllMembers(true);
    expect(members).toEqual([
      {
        id: "ok",
        name: "Frank",
        email: "frank@example.com",
        birth_date: "2000-10-21",
        profilePhoto: null,
        isApproved: true,
        isGhosted: false,
        role: "MEMBER",
      },
    ]);
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

  it("2b. The calendar shows approved members even without a usable email", async () => {
    (api.get as jest.Mock).mockResolvedValue({
      data: {
        success: true,
        user: [
          member({ id: "good", birth_date: "2000-05-10" }),
          member({ id: "bad-email", email: "not-an-email", birth_date: "2000-05-11" }),
          member({ id: "unapproved", isApproved: false, birth_date: "2000-05-12" }),
        ],
      },
    });
    const req = { query: { month: "5", year: "2026" } } as unknown as Request;
    const res = { status: jest.fn().mockReturnThis(), json: jest.fn() } as unknown as Response;

    await getBirthdaysForMonth(req, res);

    const ids = (res.json as jest.Mock).mock.calls[0][0].data.map((m: any) => m.id);
    expect(ids).toEqual(["good", "bad-email"]);
  });

  it("2c. Feb 29 birthdays are shown and celebrated on Feb 28 in non-leap years", async () => {
    (api.get as jest.Mock).mockResolvedValue({
      data: { success: true, user: [member({ id: "leapling", birth_date: "2004-02-29" })] },
    });
    const res = () =>
      ({ status: jest.fn().mockReturnThis(), json: jest.fn() }) as unknown as Response;

    const nonLeap = res();
    await getBirthdaysForMonth({ query: { month: "2", year: "2027" } } as unknown as Request, nonLeap);
    const [shown] = (nonLeap.json as jest.Mock).mock.calls[0][0].data;
    expect(shown).toMatchObject({ day: 28, month: 2, birthdayMMDD: "02-29" });

    const leap = res();
    await getBirthdaysForMonth({ query: { month: "2", year: "2028" } } as unknown as Request, leap);
    expect((leap.json as jest.Mock).mock.calls[0][0].data[0].day).toBe(29);

    // And it counts as "today" on Feb 28 of a non-leap year
    jest.useFakeTimers({ now: new Date("2027-02-28T06:00:00.000Z"), doNotFake: ["nextTick", "setImmediate"] });
    try {
      const today = await getMembersWithBirthdayToday();
      expect(today.map((m) => m.id)).toEqual(["leapling"]);
      const upcoming = await getUpcomingBirthdays(30);
      expect(upcoming[0]).toMatchObject({ id: "leapling", daysUntil: 0 });
    } finally {
      jest.useRealTimers();
    }
  });

  it("2d. Invalid month/year query is rejected with 400", async () => {
    const res = { status: jest.fn().mockReturnThis(), json: jest.fn() } as unknown as Response;
    await expect(
      getBirthdaysForMonth({ query: { month: "13", year: "2026" } } as unknown as Request, res)
    ).rejects.toMatchObject({ statusCode: 400 });
    await expect(
      getBirthdaysForMonth({ query: { month: "5" } } as unknown as Request, res)
    ).rejects.toMatchObject({ statusCode: 400 });
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
        html: expect.stringContaining("Happy Birthday, Frank!"),
      }),
      { idempotencyKey: "birthday/mem-1/2026" }
    );
    expect(centralTrackingApi.markJobSent).toHaveBeenCalledWith(job, "resend-msg-123");
  });

  it("4b. A failed member lookup is retried, not marked DEAD", async () => {
    const job = { id: "job-net", memberId: "mem-1", birthdayYear: 2026, attemptCount: 0, lockToken: "tok-net" };
    (api.get as jest.Mock).mockRejectedValue(new ApiError("Internal Server Error", 500));
    (centralTrackingApi.markJobFailed as jest.Mock).mockResolvedValue({});
    const send = jest.fn();
    mockResend(send);

    expect(await processJob(job)).toBe(false);
    expect(send).not.toHaveBeenCalled();
    expect(centralTrackingApi.markJobFailed).toHaveBeenCalledWith(
      job,
      expect.objectContaining({ classification: "TRANSIENT", isRetryable: true })
    );
  });

  it("4c. A member that no longer exists (404) is marked PERMANENT", async () => {
    const job = { id: "job-gone", memberId: "gone", birthdayYear: 2026, attemptCount: 0, lockToken: "tok-gone" };
    (api.get as jest.Mock).mockRejectedValue(new ApiError("Not Found", 404));
    (centralTrackingApi.markJobFailed as jest.Mock).mockResolvedValue({});

    expect(await processJob(job)).toBe(false);
    expect(centralTrackingApi.markJobFailed).toHaveBeenCalledWith(
      job,
      expect.objectContaining({ classification: "PERMANENT", isRetryable: false })
    );
  });

  it("4d. If recording the send fails, the job is not reported as a failed send", async () => {
    const job = { id: "job-rec", memberId: "mem-1", birthdayYear: 2026, attemptCount: 0, lockToken: "tok-rec" };
    (api.get as jest.Mock).mockResolvedValue({ data: { success: true, user: member() } });
    mockResend(jest.fn().mockResolvedValue({ data: { id: "resend-1" }, error: null }));
    (centralTrackingApi.markJobSent as jest.Mock).mockRejectedValue(
      Object.assign(new Error("Request failed with status code 401"), { status: 401 })
    );

    expect(await processJob(job)).toBe(true);
    expect(centralTrackingApi.markJobFailed).not.toHaveBeenCalled();
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
    expect(centralTrackingApi.markJobFailed).toHaveBeenCalledWith(job, {
      classification: "TRANSIENT",
      message: expect.stringContaining("500"),
      isRetryable: true,
    });
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
    expect(centralTrackingApi.markJobFailed).toHaveBeenCalledWith(job, {
      classification: "QUOTA",
      message: expect.stringContaining("quota"),
      isRetryable: true,
    });

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
      job,
      expect.objectContaining({ classification: "PERMANENT", isRetryable: false })
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
    expect(centralTrackingApi.markJobSent).toHaveBeenCalledWith(job2, "resend-m2");
    expect(centralTrackingApi.markJobFailed).toHaveBeenCalledWith(
      job1,
      expect.objectContaining({ classification: "TRANSIENT", isRetryable: true })
    );
  });

  // ──────────────────────────────────────────────
  // 9. Stable idempotency keys are reused for the same member/year
  // ──────────────────────────────────────────────
  it("9. Stable idempotency keys are reused for the same member/year", async () => {
    const { Resend } = require("resend");
    const mockSend = jest.fn().mockResolvedValue({ data: { id: "res-id" }, error: null });
    Resend.mockImplementation(() => ({ emails: { send: mockSend } }));

    // First attempt
    await sendBirthdayEmail("test@example.com", "TestUser", { memberId: "user-uuid-1", birthdayYear: 2026 });
    expect(mockSend).toHaveBeenCalledWith(
      expect.anything(),
      { idempotencyKey: "birthday/user-uuid-1/2026" }
    );

    // Second retry attempt uses identical idempotencyKey
    await sendBirthdayEmail("test@example.com", "TestUser", { memberId: "user-uuid-1", birthdayYear: 2026 });
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
    expect(centralTrackingApi.markJobSent).toHaveBeenCalledWith(outstandingJob, "resend-rec");
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
    await expect(sendTestBirthdayEmail(reqNoSecret, res)).rejects.toThrow(ApiError);
    try {
      await sendTestBirthdayEmail(reqNoSecret, res);
    } catch (e: any) {
      expect(e.statusCode).toBe(401);
    }
  });

  it("12e. /run-job creates today's jobs and sends them right away", async () => {
    const today = getZonedDateParts(new Date(), config.BIRTHDAY_TIMEZONE);
    const mmdd = `${String(today.month).padStart(2, "0")}-${String(today.day).padStart(2, "0")}`;
    const job = { id: "j-now", memberId: "mem-1", birthdayYear: today.year, attemptCount: 0, lockToken: "t-now" };

    (api.get as jest.Mock).mockImplementation((url: string) =>
      Promise.resolve({
        data: url === "/members/"
          ? { success: true, user: [member({ birth_date: `2000-${mmdd}` })] }
          : { success: true, user: member({ birth_date: `2000-${mmdd}` }) },
      })
    );
    (centralTrackingApi.initializeJobs as jest.Mock).mockResolvedValue({ created: 1, existing: 0, totalEligible: 1 });
    (centralTrackingApi.claimJobs as jest.Mock).mockResolvedValue([job]);
    (centralTrackingApi.markJobSent as jest.Mock).mockResolvedValue({ success: true });
    mockResend(jest.fn().mockResolvedValue({ data: { id: "resend-now" }, error: null }));

    const req = { headers: { "x-birthday-job-secret": "test-job-secret-123" }, body: {} } as unknown as Request;
    const res = { status: jest.fn().mockReturnThis(), json: jest.fn() } as unknown as Response;
    await triggerBirthdayJob(req, res);

    expect(centralTrackingApi.initializeJobs).toHaveBeenCalledWith(today.year, ["mem-1"]);
    expect(centralTrackingApi.markJobSent).toHaveBeenCalledWith(job, "resend-now");
    expect(res.status).toHaveBeenCalledWith(200);
    expect((res.json as jest.Mock).mock.calls[0][0].result).toMatchObject({
      eligibleCount: 1,
      workerSummary: { claimed: 1, succeeded: 1 },
    });
  });

  it("12d. /test-email with a bad address returns 422, not 500", async () => {
    const req = {
      headers: { "x-birthday-job-secret": "test-job-secret-123" },
      body: { email: "a@b" },
    } as unknown as Request;
    const res = { status: jest.fn().mockReturnThis(), json: jest.fn() } as unknown as Response;

    await expect(sendTestBirthdayEmail(req, res)).rejects.toMatchObject({ statusCode: 422 });
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

  // ──────────────────────────────────────────────
  // 14. The email header shows the member's profile photo
  // ──────────────────────────────────────────────
  it("14. Email header shows the profile photo, or 🎂 when there is none", () => {
    const withPhoto = buildBirthdayHtml("Frank", "https://cdn.example.com/u/frank.jpg");
    expect(withPhoto).toContain('<img src="https://cdn.example.com/u/frank.jpg"');
    expect(withPhoto).toContain('alt="Frank"');
    expect(withPhoto).not.toContain("🎂</p>");

    expect(buildBirthdayHtml("Frank")).toContain("🎂</p>");
    expect(buildBirthdayHtml("Frank", null)).toContain("🎂</p>");

    // Unsafe or broken URLs fall back to 🎂
    for (const bad of ["javascript:alert(1)", "data:image/png;base64,AAAA", "not a url"]) {
      const html = buildBirthdayHtml("Frank", bad);
      expect(html).not.toContain("<img");
      expect(html).toContain("🎂</p>");
    }

    // Quotes in the URL can't break out of the src attribute
    const tricky = buildBirthdayHtml("Frank", 'https://x.example/a.jpg?"onerror="alert(1)');
    expect(tricky).not.toContain('"onerror="');
  });

  it("14b. The worker puts the member's photo in the email", async () => {
    const job = { id: "job-photo", memberId: "mem-1", birthdayYear: 2026, attemptCount: 0, lockToken: "tok-photo" };
    (api.get as jest.Mock).mockResolvedValue({
      data: { success: true, user: member({ profilePhoto: "https://cdn.example.com/u/frank.jpg" }) },
    });
    const send = jest.fn().mockResolvedValue({ data: { id: "resend-photo" }, error: null });
    mockResend(send);
    (centralTrackingApi.markJobSent as jest.Mock).mockResolvedValue({ success: true });

    expect(await processJob(job)).toBe(true);
    expect(send.mock.calls[0][0].html).toContain('<img src="https://cdn.example.com/u/frank.jpg"');
  });
});
