# SkillBridge: Authentication, College Student Verification & Email Configuration Guide

This guide details the required Supabase and Email Provider configuration for SkillBridge's production authentication and college verification system.

---

## 1. Supabase Database Migration

The full schema migration script is located at:
`supabase/migrations/20260822170000_007_auth_and_student_verification.sql`

### How to apply in Supabase:
1. Open the [Supabase Dashboard](https://supabase.com/dashboard).
2. Select your project (`eldmwjkolqqdhfqcawvg`).
3. In the left navigation, click **SQL Editor**.
4. Open or paste the contents of `20260822170000_007_auth_and_student_verification.sql`.
5. Click **Run**.

### What this migration creates:
- **`profiles` Columns**:
  - `verification_status` (`'not_verified'`, `'pending'`, `'verified'`, `'rejected'`)
  - `student_id_number` (Private enrollment / PRN number, protected by RLS)
  - `is_admin` (Administrator flag)
  - `verified_at` (Timestamp of approval)
  - `rejection_reason` (Administrator feedback)
- **`verification_requests` Table**:
  - Records student submissions, college names, private document paths, and admin reviews.
  - Ownership and administrator RLS policies.
- **`verification_audit_log` Table**:
  - Immutable audit trail recording each `'submitted'`, `'approved'`, `'rejected'`, and `'resubmitted'` action.
- **`verification-documents` Private Storage Bucket**:
  - Restricted to authenticated users uploading to their own `{user_id}/` folder.
  - Restricted to document owners and authorized administrators for viewing.
- **`review_student_verification` RPC Function**:
  - Atomically updates request, profile, and audit log, strictly enforcing administrator callers.
- **`handle_new_auth_user` Trigger**:
  - Provisions a student profile automatically on auth signup.

---

## 2. Granting Platform Administrator Privileges

To designate an account as an authorized administrator capable of reviewing student verification requests:

Run this query in the Supabase SQL Editor:
```sql
UPDATE public.profiles
SET is_admin = true,
    verification_status = 'verified'
WHERE email = 'your-admin-email@skillbridge.edu';
```

---

## 3. Google OAuth Provider Configuration

To enable genuine "Sign in with Google" / "Sign up with Google":

1. In the **Google Cloud Console** ([console.cloud.google.com](https://console.cloud.google.com)):
   - Create a project or select an existing one.
   - Navigate to **APIs & Services > Credentials**.
   - Create an **OAuth 2.0 Client ID** (Web application).
   - Under **Authorized redirect URIs**, add:
     ```
     https://eldmwjkolqqdhfqcawvg.supabase.co/auth/v1/callback
     ```
2. In the **Supabase Dashboard**:
   - Go to **Authentication > Providers > Google**.
   - Toggle **Enable Google**.
   - Paste the **Client ID** and **Client Secret** from Google Cloud Console.
   - Click **Save**.
3. In Next.js, SkillBridge redirects to `/auth/callback`, which exchanges the authorization code for a session and syncs the student profile.

---

## 4. Email Delivery Provider Configuration

SkillBridge uses a dual-layer email architecture:
1. **Supabase Auth Emails**:
   - Handles email confirmation links (`signUp`) and password reset links (`resetPasswordForEmail`).
   - Configured in Supabase under **Authentication > Email Templates** and **Authentication > SMTP Settings**.
   - For custom sender domains, configure custom SMTP (e.g. SendGrid, Amazon SES, or Resend SMTP).
2. **Transactional Verification Emails** (`lib/services/email.ts`):
   - Dispatches "Student Verification Approved" and "Student Verification Rejected / Resubmission Required" notices.
   - Powered by Resend.

### Environment Variables:
Add the following to your `.env` or production deployment environment:

```env
# Resend API Key for dispatching verification status updates
RESEND_API_KEY=re_your_api_key_here

# Verified sender address
EMAIL_FROM=SkillBridge Verification <onboarding@resend.dev>
```

> **Truthful Delivery Safeguard**: If `RESEND_API_KEY` is omitted, SkillBridge will log an explicit notice (`[UNCONFIGURED]`) and store notifications in-app, rather than inventing successful delivery.

---

## 5. Security & Privacy Rules

- **Student ID Privacy**: Student ID numbers (`student_id_number`) and uploaded ID documents are never displayed in public marketplace URLs or search endpoints.
- **Private Storage**: Documents are stored in the private bucket `verification-documents`. Previews generate temporary 5-minute signed URLs accessible solely by authorized administrators.
- **Multi-Tier Route Enforcement**:
  - Server-side Next.js `middleware.ts` enforces authentication on all marketplace routes.
  - Client-side `AuthGuard` and `useRequireAuth` enforce email verification and college student verification approval before unlocking services, requests, or escrow orders.
