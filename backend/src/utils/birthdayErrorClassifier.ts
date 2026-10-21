/**
 * birthdayErrorClassifier.ts
 * Classifies email-send errors so the central API can decide whether to retry.
 */

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
