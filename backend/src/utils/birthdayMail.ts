/**
 * birthdayMail.ts
 * Sends the birthday email through Resend with a stable idempotency key.
 */

import { Resend } from "resend";
import config from "../config/index";
import { ApiError } from "./apiError";
import { buildBirthdayHtml, buildBirthdaySubject, buildBirthdayText } from "./birthdayEmailTemplate";

let resendInstance: Resend | null = null;
export function getResendClient(): Resend {
  if (!resendInstance) {
    resendInstance = new Resend(config.RESEND_API_KEY);
  }
  return resendInstance;
}

/** Test hook: drop the cached Resend client. */
export function resetResendClient(): void {
  resendInstance = null;
}

export interface SendBirthdayEmailResult {
  resendEmailId: string | null;
}

export interface BirthdayEmailOptions {
  /** Shown at the top of the email; falls back to 🎂 when missing. */
  profilePhoto?: string | null;
  /** With birthdayYear, forms the idempotency key that prevents duplicate sends on retry. */
  memberId?: string;
  birthdayYear?: number;
}

/**
 * Send a personalised birthday email using Resend.
 * When memberId and birthdayYear are given, the idempotency key
 * `birthday/{memberId}/{year}` stops Resend from sending a duplicate on retry.
 */
export async function sendBirthdayEmail(
  toEmail: string,
  memberName: string,
  { profilePhoto, memberId, birthdayYear }: BirthdayEmailOptions = {}
): Promise<SendBirthdayEmailResult> {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!toEmail || !emailRegex.test(toEmail.trim())) {
    throw new ApiError(`Invalid recipient email address: '${toEmail}'`, 422);
  }

  const idempotencyKey =
    memberId && birthdayYear ? `birthday/${memberId}/${birthdayYear}` : undefined;

  const { data, error } = await getResendClient().emails.send(
    {
      from: `"Call Of Code" <${config.EMAIL_ID}>`,
      to: toEmail.trim(),
      subject: buildBirthdaySubject(memberName),
      html: buildBirthdayHtml(memberName, profilePhoto),
      text: buildBirthdayText(memberName),
    },
    idempotencyKey ? { idempotencyKey } : undefined
  );

  if (error) {
    throw error;
  }

  return { resendEmailId: data?.id ?? null };
}
