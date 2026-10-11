# SkillBridge: Secure Administrator Authority & Platform Governance Architecture

This document specifies the platform governance model, administrator authorization boundaries, initial bootstrap procedure, credential rotation guidelines, and audit log procedures for SkillBridge.

---

## 1. Security Principles & Architecture

### A. Zero Client-Side Trust
1. **No Client Role Selectors**: Public registration forms (`/register`) and user settings pages never expose or allow an "Admin" role selection. The `profiles.is_admin` column defaults strictly to `false`.
2. **Server-Verified Identity**: Authorization never relies on `localStorage`, cookies alone, or editable user metadata (`raw_user_meta_data`). Every administrative operation validates the cryptographic JWT through Supabase Auth, followed by a server-side query verifying `public.profiles.is_admin === true`.
3. **Database-Level Anti-Self-Promotion Trigger**:
   Even if an attacker bypasses the frontend and directly issues a REST API call to `PATCH /rest/v1/profiles`, the database trigger `trg_protect_profile_sensitive_columns` immediately executes `protect_profile_sensitive_columns()`. If `OLD.is_admin IS DISTINCT FROM NEW.is_admin` or verification columns are modified by a non-administrator, the PostgreSQL transaction aborts with an exception:
   ```sql
   RAISE EXCEPTION 'Unauthorized: Only platform administrators can modify roles, admin privileges, or verification status.';
   ```

---

## 2. Initial Administrator Bootstrap Procedure

To establish the initial platform administrator without public registration:

### Option A: Direct SQL in Supabase Dashboard (Recommended - Zero Secret Leakage)
1. Have the platform owner create an account via standard sign-up (`/register`) with their official university or institutional email (e.g. `owner@mitwpu.edu.in`).
2. Verify the account email address.
3. Open the **Supabase Dashboard** -> **SQL Editor**.
4. Run the following statement:
   ```sql
   -- Promote the initial platform administrator
   UPDATE public.profiles
   SET is_admin = true,
       verification_status = 'verified',
       verified_at = now(),
       updated_at = now()
   WHERE email = 'owner@mitwpu.edu.in';

   -- Log the bootstrap action in the immutable audit log
   INSERT INTO public.admin_audit_log (
     actor_id,
     action,
     target_type,
     target_id,
     details
   )
   SELECT 
     user_id,
     'bootstrap_initial_admin',
     'profile',
     user_id::text,
     jsonb_build_object('email', email, 'method', 'dashboard_sql_bootstrap')
   FROM public.profiles
   WHERE email = 'owner@mitwpu.edu.in';
   ```
5. Confirm the status:
   ```sql
   SELECT user_id, email, is_admin, verification_status FROM public.profiles WHERE email = 'owner@mitwpu.edu.in';
   ```

### Option B: Using the CLI Tool (`scripts/bootstrap-admin.mjs`)
If `SUPABASE_SERVICE_ROLE_KEY` is configured in your secure deployment environment:
```bash
node scripts/bootstrap-admin.mjs --email owner@mitwpu.edu.in
```

---

## 3. Safe Administrator Hand-Off & Replacement Procedure

To transfer platform authority to a new owner or revoke an existing administrator:

### Step 1: Promote the Successor First (Enforce Anti-Lockout)
The database function `grant_or_revoke_admin` enforces a strict safeguard: **The last remaining administrator cannot be revoked**.
Therefore, always promote the successor first:
1. Log in to the Admin Dashboard (`/admin`) -> **Student Accounts** tab.
2. Locate the new administrator's profile.
3. Or execute via SQL / API:
   ```sql
   SELECT grant_or_revoke_admin('<new_admin_user_uuid>', true);
   ```

### Step 2: Demote the Previous Administrator
Once the new administrator is verified and active:
1. Execute the revocation:
   ```sql
   SELECT grant_or_revoke_admin('<old_admin_user_uuid>', false);
   ```
2. The transaction checks:
   ```sql
   IF v_admin_count < 1 THEN
     RAISE EXCEPTION 'Action rejected: Cannot revoke the last remaining platform administrator. Promote another administrator first to prevent lockout.';
   END IF;
   ```
3. An audit log entry (`revoke_admin`) is automatically appended to `public.admin_audit_log`.

---

## 4. Protected Endpoints & IDOR Prevention

All administrative endpoints are located under `/api/admin/*` and require server-side verification:

| Endpoint | Method | Required Role | Functionality |
| :--- | :--- | :--- | :--- |
| `/api/admin/metrics` | GET | Admin | Aggregate platform metrics (users, GMV, orders, queue) |
| `/api/admin/verifications` | GET | Admin | View student verification queue |
| `/api/admin/verifications/review` | POST | Admin | Approve or reject student applications with audit trail |
| `/api/admin/verifications/signed-url` | POST | Admin | Generate short-lived (300s) signed URLs for private ID cards |
| `/api/admin/users` | GET | Admin | List all user profiles across the platform |
| `/api/admin/users/action` | POST | Admin | Suspend or reinstate student accounts; manage admin roles |
| `/api/admin/services` | GET | Admin | List all service offerings |
| `/api/admin/services/moderate` | POST | Admin | Pause or publish listings |
| `/api/admin/orders` | GET | Admin | View all orders and escrow states (prevents IDOR) |
| `/api/admin/audit-logs` | GET | Admin | View immutable governance audit records |

### Insecure Direct Object Reference (IDOR) Protections:
- **Private Documents**: The Supabase Storage bucket `verification-documents` is non-public. Storage RLS policies ensure that only the document owner or an authenticated user with `is_admin = true` can create signed URLs or read files.
- **Orders & Payments**: Ordinary users can only SELECT or UPDATE orders where `auth.uid() = buyer_id OR auth.uid() = seller_id`. Any attempt by an ordinary student to query `/api/admin/orders` is rejected with `403 Forbidden`.
- **Payment Release**: The `payments` table has strict RLS: ordinary users cannot issue direct UPDATE statements to mark payments as released. Only the verified escrow release flow or an administrator can update payment records.

---

## 5. Platform Audit Log Specification

All administrative actions are recorded in `public.admin_audit_log`:

```sql
CREATE TABLE public.admin_audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id uuid NOT NULL REFERENCES public.profiles(user_id),
  action text NOT NULL,
  target_type text NOT NULL,
  target_id text NOT NULL,
  details jsonb DEFAULT '{}'::jsonb,
  ip_address text,
  created_at timestamptz NOT NULL DEFAULT now()
);
```

- **Immutability**: The table only possesses `SELECT` and `INSERT` RLS policies for administrators. `UPDATE` and `DELETE` policies are intentionally omitted so records cannot be modified or purged by any user.
- **Tracked Events**:
  - `bootstrap_initial_admin`
  - `grant_admin_privileges` / `revoke_admin_privileges`
  - `verify_student_approved` / `verify_student_rejected`
  - `suspend_user_account` / `reinstate_user_account`
  - `moderate_service_published` / `moderate_service_paused` / `moderate_service_archived`

---

## 6. Credential Rotation & Environment Secret Hygiene

1. **Service Role Key Separation**:
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` is intended for browser operations with Row Level Security.
   - `SUPABASE_SERVICE_ROLE_KEY` bypasses RLS and MUST NEVER be exposed in client code or prefixed with `NEXT_PUBLIC_`.
2. **Git Repository Hygiene**:
   - `.env`, `.env.local`, and all `*.pem` / secret files are included in `.gitignore`.
   - Committed templates are provided in `.env.example` with zero real secrets.
3. **Rotating Compromised Credentials**:
   - If a service key or secret is inadvertently exposed:
     1. Open **Supabase Dashboard** -> **Project Settings** -> **API**.
     2. Click **Generate new secret key** to revoke and rotate the JWT secret.
     3. Update the `SUPABASE_SERVICE_ROLE_KEY` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` in deployment environment variables (e.g. Vercel, Netlify).
     4. Restart the Next.js production server.
