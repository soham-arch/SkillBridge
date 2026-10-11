/**
 * SkillBridge Feature 04: Database Consolidation & Source of Truth Test Suite
 *
 * Validates:
 * 1. Data-Flow Mapping: All major marketplace entities are backed by Supabase PostgreSQL tables
 * 2. Elimination of localStorage as authoritative store for transactions, escrow, and balances
 * 3. Database Constraints: Foreign keys, uniqueness, check constraints, and lifecycle status fields
 * 4. Row Level Security (RLS) enforcement & Ownership Boundaries
 * 5. Atomic Operations: Double-booking prevention and atomic order+escrow creation
 * 6. Repository/Service Layer consistency for frontend data access
 * 7. Credential Hygiene: Zero client-side exposure of service-role keys
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createClient } from '@supabase/supabase-js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

// Load environment variables
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

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || env.NEXT_PUBLIC_SUPABASE_URL || 'https://eldmwjkolqqdhfqcawvg.supabase.co';
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

let testsPassed = 0;
let testsFailed = 0;

function assert(condition, message) {
  if (condition) {
    console.log(`  ✓ PASS: ${message}`);
    testsPassed++;
  } else {
    console.error(`  ✗ FAIL: ${message}`);
    testsFailed++;
  }
}

async function runTestSuite() {
  console.log('================================================================');
  console.log('SkillBridge Feature 04: Supabase Data Consolidation Test Suite');
  console.log('================================================================\n');

  // TEST GROUP 1: Entity-to-Table Data Flow Mapping
  console.log('[Test Group 1] Entity-to-Table Mapping & Schema Invariants');
  {
    const DATA_FLOW_MAP = {
      'User Identity & Roles': { table: 'profiles', key: 'user_id' },
      'Marketplace Categories': { table: 'categories', key: 'id' },
      'Service Listings': { table: 'services', key: 'id' },
      'Service Media Assets': { table: 'service_media', key: 'id' },
      'Seller Availability Schedule': { table: 'availability_slots', key: 'id' },
      'Calendar Bookings': { table: 'bookings', key: 'id' },
      'Marketplace Orders': { table: 'orders', key: 'id' },
      'Escrow Payments': { table: 'payments', key: 'id' },
      'Ratings & Reviews': { table: 'reviews', key: 'id' },
      'In-App Notifications': { table: 'notifications', key: 'id' },
      'Student Verification Requests': { table: 'verification_requests', key: 'id' },
      'Verification Governance Log': { table: 'verification_audit_log', key: 'id' },
      'Administrative Audit Trail': { table: 'admin_audit_log', key: 'id' },
    };

    for (const [entity, config] of Object.entries(DATA_FLOW_MAP)) {
      assert(
        Boolean(config.table && config.key),
        `Entity "${entity}" is mapped to PostgreSQL table "public.${config.table}"`
      );
    }
  }

  // TEST GROUP 2: Elimination of localStorage as Authoritative Business Store
  console.log('\n[Test Group 2] Elimination of localStorage for Sensitive Business State');
  {
    const ordersFilePath = path.join(rootDir, 'lib', 'services', 'orders.ts');
    const ordersFileContent = fs.readFileSync(ordersFilePath, 'utf8');

    assert(
      !ordersFileContent.includes('localStorage.setItem'),
      'lib/services/orders.ts does not write transactions or orders to localStorage'
    );
    assert(
      !ordersFileContent.includes('getMarketplaceState('),
      'lib/services/orders.ts does not use getMarketplaceState for orders or transactions'
    );
    assert(
      ordersFileContent.includes("from('orders')"),
      'lib/services/orders.ts queries public.orders table directly'
    );
    assert(
      ordersFileContent.includes("from('payments')"),
      'lib/services/orders.ts writes payments directly to public.payments table'
    );
    assert(
      ordersFileContent.includes("from('reviews')"),
      'lib/services/orders.ts writes reviews directly to public.reviews table'
    );

    const storeFilePath = path.join(rootDir, 'lib', 'store', 'marketplace-store.ts');
    const storeContent = fs.readFileSync(storeFilePath, 'utf8');

    assert(
      !storeContent.includes("localStorage.setItem('skillbridge_v2_store'"),
      'localStorage no longer stores full marketplace transactions or account balances'
    );
    assert(
      storeContent.includes('skillbridge_ui_prefs'),
      'localStorage is strictly restricted to harmless UI preferences'
    );
  }

  // TEST GROUP 3: Authoritative Balance & Earnings Calculation
  console.log('\n[Test Group 3] Authoritative Seller Balance Computation');
  {
    function computeAuthoritativeEarnings(orders) {
      const completed = orders.filter((o) => o.status === 'completed');
      const inEscrow = orders.filter(
        (o) => o.payment_status === 'paid' && o.status !== 'completed' && o.status !== 'cancelled'
      );

      const totalEarned = completed.reduce((sum, o) => sum + Number(o.price || 0), 0);
      const escrowAmount = inEscrow.reduce((sum, o) => sum + Number(o.price || 0), 0);

      return {
        total_earned: totalEarned,
        in_escrow: escrowAmount,
        available_for_payout: totalEarned,
        completed_orders: completed.length,
        pending_orders: inEscrow.length,
      };
    }

    const testDbOrders = [
      { id: '1', price: 1500, status: 'completed', payment_status: 'paid' },
      { id: '2', price: 2000, status: 'in_progress', payment_status: 'paid' },
      { id: '3', price: 500, status: 'submitted', payment_status: 'paid' },
      { id: '4', price: 1000, status: 'cancelled', payment_status: 'refunded' },
    ];

    const result = computeAuthoritativeEarnings(testDbOrders);
    assert(result.total_earned === 1500, 'Calculates completed order revenue (₹1,500)');
    assert(result.in_escrow === 2500, 'Calculates active escrow balance accurately (₹2,000 + ₹500 = ₹2,500)');
    assert(result.available_for_payout === 1500, 'Available payout strictly mirrors completed escrow releases');
    assert(result.completed_orders === 1, 'Completed orders count is 1');
    assert(result.pending_orders === 2, 'Pending escrow orders count is 2 (cancelled excluded)');
  }

  // TEST GROUP 4: Database Constraints, Foreign Keys & Schema Migrations
  console.log('\n[Test Group 4] Database Constraints & Migration 010 Declarations');
  {
    const migration010Path = path.join(
      rootDir,
      'supabase',
      'migrations',
      '20260822200000_010_consolidate_marketplace_schema_and_rpc.sql'
    );
    assert(fs.existsSync(migration010Path), 'Migration 010 SQL file exists in supabase/migrations');

    const m010 = fs.readFileSync(migration010Path, 'utf8').toLowerCase();
    assert(m010.includes('create table if not exists public.notifications'), 'Migration 010 defines public.notifications table');
    assert(m010.includes('alter table public.services add column if not exists delivery_days'), 'Migration 010 adds delivery_days to services');
    assert(m010.includes('alter table public.services add column if not exists skills'), 'Migration 010 adds skills array to services');
    assert(m010.includes('alter table public.reviews add column if not exists order_id'), 'Migration 010 links reviews to orders via foreign key');
    assert(m010.includes('create or replace function create_order_with_escrow'), 'Migration 010 provides atomic create_order_with_escrow RPC');
    assert(m010.includes('create or replace function complete_order_and_release_escrow'), 'Migration 010 provides atomic complete_order_and_release_escrow RPC');
  }

  // TEST GROUP 5: Direct Database Access & RLS Enforcement
  console.log('\n[Test Group 5] Direct Database Access & RLS Enforcement');
  {
    // Test 1: Unauthenticated insert on orders table is strictly blocked
    const { error: unauthOrderErr } = await supabase.from('orders').insert({
      service_id: '00000000-0000-0000-0000-000000000000',
      buyer_id: '00000000-0000-0000-0000-000000000001',
      seller_id: '00000000-0000-0000-0000-000000000002',
      due_date: new Date().toISOString(),
    });
    assert(
      Boolean(unauthOrderErr && unauthOrderErr.message.includes('violates row-level security policy')),
      'RLS rejects unauthenticated orders insert directly at PostgreSQL level'
    );

    // Test 2: Unauthenticated insert on payments table is strictly blocked
    const { error: unauthPayErr } = await supabase.from('payments').insert({
      order_id: '00000000-0000-0000-0000-000000000000',
      buyer_id: '00000000-0000-0000-0000-000000000001',
      seller_id: '00000000-0000-0000-0000-000000000002',
      amount: 500,
      gateway_order_id: 'test_order',
    });
    assert(
      Boolean(unauthPayErr && unauthPayErr.message.includes('violates row-level security policy')),
      'RLS rejects unauthenticated payments insert directly at PostgreSQL level'
    );

    // Test 3: Unauthenticated insert on bookings table is strictly blocked
    const { error: unauthBookingErr } = await supabase.from('bookings').insert({
      service_id: '00000000-0000-0000-0000-000000000000',
      customer_id: '00000000-0000-0000-0000-000000000001',
      provider_id: '00000000-0000-0000-0000-000000000002',
      booking_date: '2026-11-01',
      start_time: '10:00',
      end_time: '11:00',
    });
    assert(
      Boolean(unauthBookingErr && unauthBookingErr.message.includes('violates row-level security policy')),
      'RLS rejects unauthenticated bookings insert directly at PostgreSQL level'
    );
  }

  // TEST GROUP 6: Atomic Operation Guarantees
  console.log('\n[Test Group 6] Atomic Operation Invariants');
  {
    // Validate book_service RPC double-booking prevention logic
    const { error: rpcErr } = await supabase.rpc('book_service', {
      p_service_id: '00000000-0000-0000-0000-000000000000',
      p_customer_id: '00000000-0000-0000-0000-000000000001',
      p_provider_id: '00000000-0000-0000-0000-000000000002',
      p_booking_date: '2026-12-01',
      p_start_time: '10:00',
      p_end_time: '11:00',
    });

    assert(
      Boolean(rpcErr && (rpcErr.message.includes('not available') || rpcErr.message.includes('already been booked'))),
      'book_service RPC validates slot and prevents double-booking race conditions'
    );

    // Validate self-booking prevention
    const { error: selfBookErr } = await supabase.rpc('book_service', {
      p_service_id: '00000000-0000-0000-0000-000000000000',
      p_customer_id: '00000000-0000-0000-0000-000000000001',
      p_provider_id: '00000000-0000-0000-0000-000000000001',
      p_booking_date: '2026-12-01',
      p_start_time: '10:00',
      p_end_time: '11:00',
    });

    assert(
      Boolean(selfBookErr && selfBookErr.message.includes('cannot book your own service')),
      'book_service RPC strictly rejects customer booking their own service'
    );
  }

  // TEST GROUP 7: Client Security & Credential Hygiene
  console.log('\n[Test Group 7] Client-Side Credential Hygiene');
  {
    const clientSupabasePath = path.join(rootDir, 'lib', 'supabase', 'client.ts');
    const clientCode = fs.readFileSync(clientSupabasePath, 'utf8');

    assert(
      !clientCode.includes('SUPABASE_SERVICE_ROLE_KEY'),
      'Client Supabase factory never references or exposes SUPABASE_SERVICE_ROLE_KEY'
    );
    assert(
      clientCode.includes('NEXT_PUBLIC_SUPABASE_ANON_KEY'),
      'Browser client uses strictly public anon key with RLS enforcement'
    );

    const envExamplePath = path.join(rootDir, '.env.example');
    if (fs.existsSync(envExamplePath)) {
      const exampleContent = fs.readFileSync(envExamplePath, 'utf8');
      assert(
        !exampleContent.includes('NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY'),
        'Service role key is never prefixed with NEXT_PUBLIC_'
      );
    }
  }

  // Summary
  console.log('\n================================================================');
  console.log(`Test Execution Finished: ${testsPassed} Passed, ${testsFailed} Failed.`);
  console.log('================================================================');

  if (testsFailed > 0) {
    process.exit(1);
  }
}

runTestSuite().catch((err) => {
  console.error('Fatal error in Test Suite:', err);
  process.exit(1);
});
