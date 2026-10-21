/**
 * birthdayMail.ts
 * Birthday email sender using Resend with stable idempotency keys and error classification.
 */

import { Resend } from "resend";
import config from "../config/index";

export type ErrorClassification =
  | "TRANSIENT"
  | "QUOTA"
  | "PERMANENT"
  | "CONFIG"
  | "UNCERTAIN";

export interface ClassifiedError {
  classification: ErrorClassification;
  isRetryable: boolean;
  message: string;
}

export function escapeHtml(s: string): string {
  if (typeof s !== "string") return "";
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export function buildBirthdayHtml(memberName: string): string {
  const safe = escapeHtml(memberName);
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Happy Birthday, ${safe}!</title>
</head>
<body style="margin:0;padding:0;background-color:#F5E6D3;font-family:'Segoe UI',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#F5E6D3;padding:40px 0;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0"
               style="background:#ffffff;border:4px solid #2C1810;box-shadow:8px 8px 0 0 #2C1810;max-width:600px;width:100%;">

          <!-- Header banner -->
          <tr>
            <td style="background:#C1502E;padding:36px 40px;border-bottom:4px solid #2C1810;text-align:center;">
              <p style="margin:0 0 8px 0;font-size:48px;line-height:1;">🎂</p>
              <h1 style="margin:0;font-size:28px;font-weight:900;color:#F5E6D3;letter-spacing:2px;text-transform:uppercase;">
                Happy Birthday, ${safe}!
              </h1>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding:40px;color:#2C1810;">
              <p style="font-size:17px;line-height:1.7;margin:0 0 20px 0;">
                Hi <strong>${safe}</strong>,
              </p>
              <p style="font-size:17px;line-height:1.7;margin:0 0 20px 0;">
                The entire <strong>Call of Code</strong> community is wishing you a very
                <span style="color:#C1502E;font-weight:900;">Happy Birthday!</span> 🎉
              </p>
              <p style="font-size:17px;line-height:1.7;margin:0 0 20px 0;">
                May your special day be filled with happiness, exciting code, and memorable
                achievements. We're truly glad to have you as part of our community!
              </p>

              <!-- Highlight box -->
              <table width="100%" cellpadding="0" cellspacing="0" style="margin:28px 0;">
                <tr>
                  <td style="background:#F5E6D3;border:4px solid #2C1810;padding:24px 28px;box-shadow:4px 4px 0 0 #C1502E;">
                    <p style="margin:0;font-size:16px;font-weight:900;color:#2C1810;text-transform:uppercase;letter-spacing:1px;">
                      🚀 Here's to another year of
                    </p>
                    <ul style="margin:12px 0 0 0;padding-left:20px;color:#2C1810;font-size:15px;line-height:2;">
                      <li>Building amazing things</li>
                      <li>Solving hard problems</li>
                      <li>Growing as a developer</li>
                      <li>Making great memories with the community</li>
                    </ul>
                  </td>
                </tr>
              </table>

              <p style="font-size:17px;line-height:1.7;margin:0 0 8px 0;">
                Have an absolutely amazing birthday and an even better year ahead!
              </p>
              <p style="font-size:17px;line-height:1.7;margin:0;">
                With love,<br/>
                <strong style="color:#C1502E;">The Call of Code Team</strong> ❤️
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background:#2C1810;padding:20px 40px;text-align:center;">
              <p style="margin:0;font-size:13px;color:#F5E6D3;opacity:0.8;">
                © Call of Code · This is an automated birthday message.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim();
}

export function buildBirthdayText(memberName: string): string {
  return [
    `Happy Birthday, ${memberName}!`,
    "",
    `Hi ${memberName},`,
    "",
    "The entire Call of Code community is wishing you a very Happy Birthday! 🎉",
    "",
    "May your special day be filled with happiness, exciting code, and memorable achievements.",
    "We're truly glad to have you as part of our community!",
    "",
    "Here's to another year of building amazing things, solving hard problems,",
    "growing as a developer, and making great memories with the community.",
    "",
    "Have an absolutely amazing birthday and an even better year ahead!",
    "",
    "With love,",
    "The Call of Code Team",
  ].join("\n");
}

let resendInstance: Resend | null = null;
export function getResendClient(): Resend {
  if (!resendInstance) {
    resendInstance = new Resend(config.RESEND_API_KEY);
  }
  return resendInstance;
}

export function resetResendClient(): void {
  resendInstance = null;
}

/**
 * Classify errors from Resend or network transport for smart retry decisions.
 */
export function classifySendError(err: unknown): ClassifiedError {
  const errMsg =
    typeof err === "string"
      ? err
      : (err as any)?.message || JSON.stringify(err);

  const lower = errMsg.toLowerCase();
  const statusCode = (err as any)?.statusCode || (err as any)?.status;
  const errorCode = (err as any)?.name || (err as any)?.code;

  // 1. Quota or Rate Limit
  if (
    statusCode === 429 ||
    errorCode === "rate_limit_exceeded" ||
    lower.includes("rate limit") ||
    lower.includes("daily quota") ||
    lower.includes("monthly quota") ||
    lower.includes("quota exceeded") ||
    lower.includes("too many requests")
  ) {
    return {
      classification: "QUOTA",
      isRetryable: true,
      message: "Resend rate limit or quota exceeded",
    };
  }

  // 2. Configuration or Authentication
  if (
    statusCode === 401 ||
    statusCode === 403 ||
    errorCode === "missing_api_key" ||
    errorCode === "invalid_api_key" ||
    errorCode === "invalid_from_address" ||
    lower.includes("api key") ||
    lower.includes("from address")
  ) {
    return {
      classification: "CONFIG",
      isRetryable: false,
      message: "Resend configuration or credential error",
    };
  }

  // 3. Permanent Recipient Failure
  if (
    statusCode === 422 ||
    errorCode === "validation_error" ||
    lower.includes("invalid to") ||
    lower.includes("recipient") ||
    lower.includes("mailbox not found") ||
    lower.includes("domain does not exist")
  ) {
    return {
      classification: "PERMANENT",
      isRetryable: false,
      message: "Invalid recipient email address",
    };
  }

  // 4. Uncertain Outcome (Network timeout after request was dispatched)
  if (
    errorCode === "ETIMEDOUT" ||
    errorCode === "ECONNRESET" ||
    errorCode === "ESOCKETTIMEDOUT" ||
    lower.includes("timeout")
  ) {
    return {
      classification: "UNCERTAIN",
      isRetryable: true,
      message: `Network timeout: ${errMsg.substring(0, 200)}`,
    };
  }

  // 5. Default Transient Failure (5xx, temporary server glitch)
  return {
    classification: "TRANSIENT",
    isRetryable: true,
    message: errMsg.substring(0, 300),
  };
}

export interface SendBirthdayEmailResult {
  resendEmailId: string | null;
}

/**
 * Send a personalised birthday email using Resend with stable idempotency key.
 */
export async function sendBirthdayEmail(
  toEmail: string,
  memberName: string,
  memberId?: string,
  birthdayYear?: number
): Promise<SendBirthdayEmailResult> {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!toEmail || !emailRegex.test(toEmail.trim())) {
    throw {
      name: "validation_error",
      message: `Invalid recipient email address: '${toEmail}'`,
      statusCode: 422,
    };
  }

  const resend = getResendClient();
  const idempotencyKey =
    memberId && birthdayYear
      ? `birthday/${memberId}/${birthdayYear}`
      : undefined;

  const { data, error } = await resend.emails.send(
    {
      from: `"Call Of Code" <${config.EMAIL_ID}>`,
      to: toEmail.trim(),
      subject: `Birthday wishes from Call of Code`,
      html: buildBirthdayHtml(memberName),
      text: buildBirthdayText(memberName),
    },
    idempotencyKey ? { idempotencyKey } : undefined
  );

  if (error) {
    throw error;
  }

  return { resendEmailId: data?.id ?? null };
}
