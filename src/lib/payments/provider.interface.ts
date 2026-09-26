/**
 * Learnify AI — Payment Provider Interface & Types
 * 
 * Defines unified contracts for payment gateways (Razorpay Primary, Cashfree Secondary).
 */

export type NormalizedPaymentStatus =
  | "CREATED"
  | "PENDING"
  | "AUTHORIZED"
  | "CAPTURED"
  | "SUCCESS"
  | "FAILED"
  | "USER_DROPPED"
  | "RETRY_REQUIRED"
  | "EXPIRED"
  | "REFUNDED"
  | "PARTIALLY_REFUNDED"
  | "DISPUTED"
  | "CANCELLED"
  | "UNKNOWN";

export interface CreateOrderParams {
  userId: string;
  amountInr: number;
  currency?: string;
  receiptId?: string;
  notes?: Record<string, string>;
  customerEmail?: string;
  customerPhone?: string;
  customerName?: string;
}

export interface CreateOrderResult {
  provider: "razorpay" | "cashfree";
  orderId: string;
  amountInr: number;
  currency: string;
  keyId?: string;
  paymentSessionId?: string; // For Cashfree
  checkoutUrl?: string;
  notes?: Record<string, any>;
}

export interface CreateSubscriptionParams {
  userId: string;
  planId: string;
  planName: string;
  amountInr: number;
  interval: "month" | "year";
  couponCode?: string;
  customerEmail?: string;
  customerPhone?: string;
  customerName?: string;
  returnUrl?: string;
}

export interface CreateSubscriptionResult {
  provider: "razorpay" | "cashfree";
  subscriptionId: string;
  planId: string;
  amountInr: number;
  keyId?: string;
  authLink?: string; // Cashfree redirect
  shortUrl?: string;
}

export interface VerifySignatureParams {
  orderId?: string;
  paymentId?: string;
  signature?: string;
  subscriptionId?: string;
  rawBody?: string;
}

export interface CancelSubscriptionParams {
  subscriptionId: string;
  cancelAtPeriodEnd?: boolean;
}

export interface CancelSubscriptionResult {
  success: boolean;
  accessUntil?: string;
  status: string;
  message?: string;
}

export interface RefundParams {
  paymentId: string;
  amountInr?: number;
  reason?: string;
  notes?: Record<string, string>;
}

export interface RefundResult {
  success: boolean;
  refundId: string;
  amountInr: number;
  status: string;
  rawResponse?: any;
}

export interface PaymentProvider {
  readonly name: "razorpay" | "cashfree";

  createOrder(params: CreateOrderParams): Promise<CreateOrderResult>;
  createSubscription(params: CreateSubscriptionParams): Promise<CreateSubscriptionResult>;
  verifyPaymentSignature(params: VerifySignatureParams): Promise<boolean>;
  cancelSubscription(params: CancelSubscriptionParams): Promise<CancelSubscriptionResult>;
  resumeSubscription?(subscriptionId: string): Promise<{ success: boolean; message?: string }>;
  processRefund(params: RefundParams): Promise<RefundResult>;
}
