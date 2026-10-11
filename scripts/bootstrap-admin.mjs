#!/usr/bin/env node

/**
 * SkillBridge Administrator Bootstrap & Platform Governance Tool
 *
 * This script is used by platform owners during deployment to:
 * 1. Establish the initial administrator without public registration or client-side selectors.
 * 2. Safely manage admin roles without exposing sensitive service keys.
 *
 * Usage:
 *   node scripts/bootstrap-admin.mjs --email admin@example.edu
 *   node scripts/bootstrap-admin.mjs --user-id <uuid>
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createClient } from '@supabase/supabase-js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

// Load environment variables from .env if present
const envPath = path.join(rootDir, '.env');
const env = {};
if (fs.existsSync(envPath)) {
  const lines = fs.readFileSync(envPath, 'utf8').split('\n');
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eqIdx = trimmed.indexOf('=');
    if (eqIdx !== -1) {
      const key = trimmed.slice(0, eqIdx).trim();
      const val = trimmed.slice(eqIdx + 1).trim();
      env[key] = val;
    }
  }
}

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || env.SUPABASE_SERVICE_ROLE_KEY;

// Parse CLI flags
const args = process.argv.slice(2);
let targetEmail = null;
let targetUserId = null;

for (let i = 0; i < args.length; i++) {
  if (args[i] === '--email' && args[i + 1]) {
    targetEmail = args[i + 1].trim().toLowerCase();
    i++;
  } else if (args[i] === '--user-id' && args[i + 1]) {
    targetUserId = args[i + 1].trim();
    i++;
  }
}

console.log('='.repeat(70));
console.log(' SkillBridge V2: Administrator Bootstrap & Platform Governance Tool');
console.log('='.repeat(70));

if (!targetEmail && !targetUserId) {
  console.log(`
Usage:
  node scripts/bootstrap-admin.mjs --email <admin_email>
  node scripts/bootstrap-admin.mjs --user-id <user_uuid>

Example:
  node scripts/bootstrap-admin.mjs --email principal.admin@mitwpu.edu.in
`);
  process.exit(1);
}

const identifier = targetEmail || targetUserId;
console.log(`[*] Target Administrator Candidate: ${identifier}`);

async function runBootstrap() {
  if (SUPABASE_SERVICE_KEY && SUPABASE_URL) {
    console.log('[+] SUPABASE_SERVICE_ROLE_KEY detected. Connecting via privileged server client...');
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
      auth: { persistSession: false },
    });

    // 1. Locate profile
    let query = supabase.from('profiles').select('*');
    if (targetEmail) {
      query = query.eq('email', targetEmail);
    } else {
      query = query.eq('user_id', targetUserId);
    }

    const { data: profile, error: findError } = await query.maybeSingle();

    if (findError) {
      console.error('[-] Database query error:', findError.message);
      process.exit(1);
    }

    if (!profile) {
      console.error(`[-] No profile found for ${identifier}.`);
      console.log('    The user must sign up or sign in first so their profile row exists.');
      process.exit(1);
    }

    // 2. Promote to admin and verify
    const { error: updateError } = await supabase
      .from('profiles')
      .update({
        is_admin: true,
        verification_status: 'verified',
        verified_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('user_id', profile.user_id);

    if (updateError) {
      console.error('[-] Failed to promote user to administrator:', updateError.message);
      process.exit(1);
    }

    // 3. Insert audit log
    try {
      await supabase.from('admin_audit_log').insert({
        actor_id: profile.user_id,
        action: 'bootstrap_initial_admin',
        target_type: 'profile',
        target_id: profile.user_id,
        details: {
          email: profile.email,
          full_name: profile.full_name,
          source: 'cli_bootstrap_script',
        },
      });
    } catch (auditErr) {
      console.warn('[!] Audit log table insert note:', auditErr.message);
    }

    console.log(`[SUCCESS] User "${profile.full_name}" (${profile.email}) is now an authorized Platform Administrator!`);
    console.log(`[*] User ID: ${profile.user_id}`);
    console.log('[*] Status: Verified Student & Administrator');
    console.log('[*] The admin can now log in at /login and access /admin.');
    return;
  }

  // If no service key provided in local env, print direct SQL procedure
  console.log('\n[!] Note: SUPABASE_SERVICE_ROLE_KEY was not found in environment.');
  console.log('    To maintain zero secret leakage, you can execute this direct SQL statement');
  console.log('    inside the Supabase Dashboard SQL Editor:');
  console.log('-'.repeat(70));

  const filterClause = targetEmail
    ? `email = '${targetEmail}'`
    : `user_id = '${targetUserId}'::uuid`;

  console.log(`
-- =========================================================================
-- SkillBridge Initial Administrator Bootstrap SQL
-- =========================================================================

-- 1. Ensure user has registered account in profiles
-- 2. Promote user to Platform Administrator & Verified Status:
UPDATE public.profiles
SET is_admin = true,
    verification_status = 'verified',
    verified_at = now(),
    updated_at = now()
WHERE ${filterClause};

-- 3. Record in platform governance audit log:
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
  jsonb_build_object(
    'target_email', email,
    'method', 'direct_dashboard_bootstrap'
  )
FROM public.profiles
WHERE ${filterClause};

-- 4. Verify administrator status:
SELECT user_id, full_name, email, is_admin, verification_status 
FROM public.profiles 
WHERE ${filterClause};
`);
  console.log('-'.repeat(70));
  console.log('[*] Once executed, the user will possess full platform administration authority.');
}

runBootstrap().catch((err) => {
  console.error('Unexpected error:', err);
  process.exit(1);
});
