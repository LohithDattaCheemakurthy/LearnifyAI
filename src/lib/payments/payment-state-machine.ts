/**
 * Learnify AI — Payment State Machine & Normalizer
 * 
 * Maps provider-specific transaction and subscription statuses into Learnify's
 * unified canonical states.
 */

import type { NormalizedPaymentStatus } from "./provider.interface";

export function normalizePaymentStatus(
  provider: "razorpay" | "cashfree" | "wallet" | "free",
  rawStatus?: string | null,
): NormalizedPaymentStatus {
  if (!rawStatus) return "UNKNOWN";
  const s = rawStatus.toLowerCase().trim();

  // Free / Instant
  if (s === "free" || s === "activated") return "SUCCESS";

  // Razorpay mappings
  if (provider === "razorpay") {
    switch (s) {
      case "created":
        return "CREATED";
      case "authorized":
        return "AUTHORIZED";
      case "captured":
      case "paid":
      case "active":
      case "completed":
        return "SUCCESS";
      case "failed":
      case "error":
        return "FAILED";
      case "pending":
      case "authenticated":
      case "halted":
        return "PENDING";
      case "cancelled":
        return "CANCELLED";
      case "refunded":
        return "REFUNDED";
      case "partially_refunded":
        return "PARTIALLY_REFUNDED";
      case "expired":
        return "EXPIRED";
      default:
        return "UNKNOWN";
    }
  }

  // Cashfree mappings
  if (provider === "cashfree") {
    switch (s) {
      case "active":
      case "success":
      case "paid":
        return "SUCCESS";
      case "pending":
      case "approval_pending":
      case "bank_approval_pending":
      case "on_hold":
        return "PENDING";
      case "failed":
      case "failure":
      case "user_dropped":
        return "FAILED";
      case "cancelled":
        return "CANCELLED";
      case "completed":
        return "SUCCESS";
      case "refunded":
        return "REFUNDED";
      default:
        return "UNKNOWN";
    }
  }

  // Fallbacks
  if (s.includes("success") || s.includes("paid") || s.includes("captured")) return "SUCCESS";
  if (s.includes("fail") || s.includes("error")) return "FAILED";
  if (s.includes("pend") || s.includes("hold") || s.includes("process")) return "PENDING";
  if (s.includes("cancel")) return "CANCELLED";
  if (s.includes("refund")) return "REFUNDED";

  return "UNKNOWN";
}

export function isPaymentSuccessful(status: NormalizedPaymentStatus): boolean {
  return status === "SUCCESS" || status === "CAPTURED";
}

export function isPaymentPending(status: NormalizedPaymentStatus): boolean {
  return status === "PENDING" || status === "AUTHORIZED" || status === "CREATED";
}

export function isPaymentFailed(status: NormalizedPaymentStatus): boolean {
  return (
    status === "FAILED" ||
    status === "USER_DROPPED" ||
    status === "RETRY_REQUIRED" ||
    status === "EXPIRED"
  );
}

export function getStatusBadgeConfig(status: NormalizedPaymentStatus): {
  label: string;
  variant: "default" | "secondary" | "destructive" | "outline";
  className: string;
} {
  switch (status) {
    case "SUCCESS":
    case "CAPTURED":
      return {
        label: "Paid",
        variant: "default",
        className: "bg-emerald-500/10 text-emerald-500 border-emerald-500/20",
      };
    case "PENDING":
    case "AUTHORIZED":
      return {
        label: "Payment Pending",
        variant: "secondary",
        className: "bg-amber-500/10 text-amber-500 border-amber-500/20",
      };
    case "FAILED":
    case "USER_DROPPED":
    case "EXPIRED":
      return {
        label: "Payment Failed",
        variant: "destructive",
        className: "bg-rose-500/10 text-rose-500 border-rose-500/20",
      };
    case "RETRY_REQUIRED":
      return {
        label: "Retry Required",
        variant: "destructive",
        className: "bg-orange-500/10 text-orange-500 border-orange-500/20",
      };
    case "CANCELLED":
      return {
        label: "Cancelled",
        variant: "outline",
        className: "bg-zinc-500/10 text-zinc-500 border-zinc-500/20",
      };
    case "REFUNDED":
    case "PARTIALLY_REFUNDED":
      return {
        label: "Refunded",
        variant: "outline",
        className: "bg-blue-500/10 text-blue-500 border-blue-500/20",
      };
    default:
      return {
        label: status,
        variant: "outline",
        className: "bg-muted text-muted-foreground",
      };
  }
}
