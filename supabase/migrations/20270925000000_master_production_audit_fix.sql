-- ============================================================
-- MASTER PRODUCTION AUDIT MIGRATION
-- Synchronizes Canonical Plans, Payments, Normalized State Machine,
-- Legal Documents, Legal Acknowledgements, and Student Verifications.
-- ============================================================

-- 1. Create Normalized Payments Table (Razorpay & Cashfree)
CREATE TABLE IF NOT EXISTS public.payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  internal_payment_id text UNIQUE NOT NULL,
  user_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  provider text NOT NULL CHECK (provider IN ('razorpay', 'cashfree', 'wallet', 'free')),
  order_id text NOT NULL,
  provider_order_id text,
  provider_payment_id text,
  provider_signature text,
  subscription_id text,
  plan_id text,
  amount_inr numeric(12,2) NOT NULL DEFAULT 0.00,
  currency text NOT NULL DEFAULT 'INR',
  status text NOT NULL DEFAULT 'created' CHECK (
    status IN (
      'created',
      'pending',
      'authorized',
      'captured',
      'success',
      'failed',
      'user_dropped',
      'retry_required',
      'refunded',
      'partially_refunded',
      'cancelled'
    )
  ),
  failure_reason text,
  metadata jsonb DEFAULT '{}'::jsonb,
  raw_event_payload jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_payments_user_id ON public.payments(user_id);
CREATE INDEX IF NOT EXISTS idx_payments_order_id ON public.payments(order_id);
CREATE INDEX IF NOT EXISTS idx_payments_provider_payment_id ON public.payments(provider_payment_id);
CREATE INDEX IF NOT EXISTS idx_payments_status ON public.payments(status);
CREATE INDEX IF NOT EXISTS idx_payments_created_at ON public.payments(created_at DESC);

ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users view own payments" ON public.payments;
CREATE POLICY "Users view own payments"
  ON public.payments FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'super_admin') OR public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Service role manages payments" ON public.payments;
CREATE POLICY "Service role manages payments"
  ON public.payments FOR ALL TO service_role USING (true);


-- 2. Legal Documents Table (Central Legal Center & Versioning)
CREATE TABLE IF NOT EXISTS public.legal_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text UNIQUE NOT NULL,
  title text NOT NULL,
  version text NOT NULL DEFAULT '1.0',
  summary text,
  content text NOT NULL,
  published boolean NOT NULL DEFAULT true,
  is_mandatory_checkout boolean NOT NULL DEFAULT false,
  effective_date timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.legal_documents ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can read published legal documents" ON public.legal_documents;
CREATE POLICY "Anyone can read published legal documents"
  ON public.legal_documents FOR SELECT TO public
  USING (published = true OR (auth.uid() IS NOT NULL AND (public.has_role(auth.uid(), 'super_admin') OR public.has_role(auth.uid(), 'admin'))));

DROP POLICY IF EXISTS "Admins manage legal documents" ON public.legal_documents;
CREATE POLICY "Admins manage legal documents"
  ON public.legal_documents FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin') OR public.has_role(auth.uid(), 'admin'));


-- 3. Legal Acknowledgements Table (Contextual Show-Once Engine)
CREATE TABLE IF NOT EXISTS public.legal_acknowledgements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  policy_slug text NOT NULL,
  policy_version text NOT NULL,
  context text NOT NULL CHECK (context IN ('checkout', 'community', 'ai', 'creator_upload', 'student_onboarding', 'parental_consent', 'general')),
  ip_address text,
  user_agent text,
  acknowledged_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_legal_ack_user_policy ON public.legal_acknowledgements(user_id, policy_slug, policy_version);

ALTER TABLE public.legal_acknowledgements ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users view own legal acknowledgements" ON public.legal_acknowledgements;
CREATE POLICY "Users view own legal acknowledgements"
  ON public.legal_acknowledgements FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'super_admin') OR public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Users insert own legal acknowledgements" ON public.legal_acknowledgements;
CREATE POLICY "Users insert own legal acknowledgements"
  ON public.legal_acknowledgements FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Service role manages legal acknowledgements" ON public.legal_acknowledgements;
CREATE POLICY "Service role manages legal acknowledgements"
  ON public.legal_acknowledgements FOR ALL TO service_role USING (true);


-- 4. Student Verifications Table
CREATE TABLE IF NOT EXISTS public.student_verifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  student_email text NOT NULL,
  institution_name text,
  id_card_url text,
  verification_method text NOT NULL DEFAULT 'email_otp' CHECK (verification_method IN ('email_otp', 'id_card', 'manual_admin')),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'verified', 'rejected', 'expired')),
  rejection_reason text,
  admin_notes text,
  verified_at timestamptz,
  expires_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_student_verifications_user_id ON public.student_verifications(user_id);
CREATE INDEX IF NOT EXISTS idx_student_verifications_status ON public.student_verifications(status);

ALTER TABLE public.student_verifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users view own student verifications" ON public.student_verifications;
CREATE POLICY "Users view own student verifications"
  ON public.student_verifications FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'super_admin') OR public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Users insert own student verifications" ON public.student_verifications;
CREATE POLICY "Users insert own student verifications"
  ON public.student_verifications FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Admins manage student verifications" ON public.student_verifications;
CREATE POLICY "Admins manage student verifications"
  ON public.student_verifications FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin') OR public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Service role manages student verifications" ON public.student_verifications;
CREATE POLICY "Service role manages student verifications"
  ON public.student_verifications FOR ALL TO service_role USING (true);


-- 5. Synchronize Canonical Plans (Free = 100 credits, Student, Pro = 199, Career Pro = 499, Enterprise = Custom)
-- Ensure columns exist
ALTER TABLE public.pricing_plans ADD COLUMN IF NOT EXISTS razorpay_plan_id text;

-- Free Tier: 100 AI credits/month
UPDATE public.pricing_plans SET
  name = 'Free',
  price_label = 'Free',
  price_inr = 0,
  yearly_price = null,
  interval = null,
  ai_credits_monthly = 100,
  max_courses = 3,
  description = 'Access all free courses, core AI learning tools, and community discussions.',
  features = '["Access to all Free courses","100 AI credits / month","Community & study group access","Interactive code playgrounds","Basic progress & quiz tracking","Course notes & lesson summaries","Email support"]'::jsonb,
  cta_label = 'Get Started Free',
  cta_to = '/signup',
  highlighted = false,
  order_index = 10,
  active = true,
  badge = null,
  color = '#2563EB',
  updated_at = now()
WHERE name IN ('Free', 'Starter', 'Basic');

-- Student Tier
INSERT INTO public.pricing_plans (
  id, name, price_label, price_inr, yearly_price, interval,
  ai_credits_monthly, max_courses, description, features,
  cta_label, cta_to, highlighted, order_index, active, badge, color, updated_at
) VALUES (
  '99e19803-b045-4299-a681-7c91350a4d01',
  'Student',
  '₹159',
  159,
  null,
  'month',
  10000,
  -1,
  'Verified college students receive 20% discount on Pro or Career Pro subscriptions.',
  '["20% academic discount on all paid plans","Full course library access","10,000 AI credits / month with Pro tier","Verified course completion certificates","Resume Builder & ATS Checker access","Campus peer groups & hackathons","Priority student support"]'::jsonb,
  'Verify Student Status',
  '/verify-student',
  false,
  15,
  true,
  'Student Benefit',
  '#10B981',
  now()
) ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  price_label = EXCLUDED.price_label,
  price_inr = EXCLUDED.price_inr,
  ai_credits_monthly = EXCLUDED.ai_credits_monthly,
  features = EXCLUDED.features,
  active = true;

-- Pro Tier: ₹199/month
UPDATE public.pricing_plans SET
  name = 'Pro',
  price_label = '₹199',
  price_inr = 199,
  yearly_price = 1990,
  interval = 'month',
  ai_credits_monthly = 10000,
  max_courses = -1,
  description = 'Full course library, advanced AI tutoring, certificate generation, and core career tools.',
  features = '["Full course library (all current & future courses)","10,000 AI credits / month","Advanced AI tutor & doubt solver","Unlimited certificate issuance with QR verification","Interactive DOM Blueprints & code sandboxes","Basic Resume Builder & ATS Checker","Downloadable learning resources & code snippets","Priority customer support"]'::jsonb,
  cta_label = 'Start Pro',
  cta_to = '/signup?plan=pro',
  highlighted = true,
  order_index = 20,
  active = true,
  badge = 'Most Popular',
  color = '#6366F1',
  updated_at = now()
WHERE name = 'Pro';

-- Career Pro Tier: ₹499/month
UPDATE public.pricing_plans SET
  name = 'Career Pro',
  price_label = '₹499',
  price_inr = 499,
  yearly_price = 4990,
  interval = 'month',
  ai_credits_monthly = 25000,
  max_courses = -1,
  description = 'Everything in Pro plus 11-in-1 Career Studio: mock interviews, portfolio, LinkedIn optimizer & 25,000 AI credits.',
  features = '["Everything in Pro included","25,000 AI credits / month","11-in-1 Career Studio suite","AI Mock Interview Simulator with recording & feedback","Full Resume Builder with LaTeX/PDF export & ATS Scoring","Portfolio Builder & LinkedIn Profile Optimizer","Skill gap analysis & customized project roadmaps","Template Mastery Studio & premium project designs","Internship & job application tracker","VIP 1-on-1 priority support"]'::jsonb,
  cta_label = 'Become Job Ready',
  cta_to = '/signup?plan=career-pro',
  highlighted = false,
  order_index = 30,
  active = true,
  badge = 'Best Value',
  color = '#8B5CF6',
  updated_at = now()
WHERE name = 'Career Pro';

-- Enterprise Tier: Custom Pricing
UPDATE public.pricing_plans SET
  name = 'Enterprise',
  price_label = 'Custom',
  price_inr = 0,
  yearly_price = null,
  interval = null,
  ai_credits_monthly = 0,
  max_courses = -1,
  description = 'Dedicated seats, single sign-on (SSO), LMS integration, team analytics, and custom branding.',
  features = '["Custom seat volume & bulk student enrollment","SSO (SAML, Okta, Google Workspace) & RBAC","Institutional admin reporting & attendance tracking","Custom white-label branding & custom domain","Department-level analytics & completion reports","Automated bulk certificate issuance via API","Custom AI credit pool & model routing","Dedicated account manager & SLA guarantee"]'::jsonb,
  cta_label = 'Contact Sales',
  cta_to = '/contact?inquiry=enterprise',
  highlighted = false,
  order_index = 40,
  active = true,
  badge = null,
  color = '#7C3AED',
  updated_at = now()
WHERE name IN ('Enterprise', 'Team');

-- Deactivate old or conflicting plans
UPDATE public.pricing_plans SET active = false
WHERE name NOT IN ('Free', 'Student', 'Pro', 'Career Pro', 'Enterprise');


-- 6. Clean Branding & Tax Settings in billing_settings
UPDATE public.billing_settings SET
  value = '{
    "company_name": "Learnify AI",
    "legal_name": "Learnify AI",
    "logo_url": "/logo.png",
    "brand_color": "#6366f1",
    "primary_color": "#6366f1",
    "secondary_color": "#7C3AED",
    "success_color": "#22C55E",
    "warning_color": "#F59E0B",
    "danger_color": "#EF4444"
  }'::jsonb,
  updated_at = now()
WHERE key = 'branding';

UPDATE public.billing_settings SET
  value = '{
    "gst_enabled": false,
    "gstin": null,
    "cgst_rate": 0,
    "sgst_rate": 0,
    "igst_rate": 0,
    "enable_tds": false,
    "tds_rate": 0,
    "hsn_code": "",
    "sac_code": ""
  }'::jsonb,
  updated_at = now()
WHERE key = 'tax';

UPDATE public.billing_settings SET
  value = '{
    "email": "support@learnifyai.in",
    "support_email": "support@learnifyai.in",
    "support_phone": null,
    "support_address": null,
    "phone": null,
    "address": null
  }'::jsonb,
  updated_at = now()
  WHERE key = 'support';


-- 7. Refund Requests Table (Exception Review Workflow)
CREATE TABLE IF NOT EXISTS public.refund_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  payment_id uuid,
  order_id text,
  provider text NOT NULL DEFAULT 'razorpay',
  amount_inr numeric(12,2) NOT NULL DEFAULT 0.00,
  reason_category text NOT NULL CHECK (
    reason_category IN (
      'duplicate_payment',
      'unauthorized_transaction',
      'technical_failure',
      'accidental_charge',
      'service_not_delivered',
      'other'
    )
  ),
  user_notes text,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'processed')),
  admin_decision_notes text,
  decided_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  decided_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_refund_requests_user ON public.refund_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_refund_requests_status ON public.refund_requests(status);

ALTER TABLE public.refund_requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users view own refund requests" ON public.refund_requests;
CREATE POLICY "Users view own refund requests"
  ON public.refund_requests FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'super_admin') OR public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Users submit refund requests" ON public.refund_requests;
CREATE POLICY "Users submit refund requests"
  ON public.refund_requests FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Admins manage refund requests" ON public.refund_requests;
CREATE POLICY "Admins manage refund requests"
  ON public.refund_requests FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin') OR public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Service role manages refund requests" ON public.refund_requests;
CREATE POLICY "Service role manages refund requests"
  ON public.refund_requests FOR ALL TO service_role USING (true);

