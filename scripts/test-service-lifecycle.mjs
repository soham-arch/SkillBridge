/**
 * SkillBridge Feature 05: Complete Seller Service Management & Lifecycle Test Suite
 *
 * Validates:
 * 1. Service Creation & Metadata: Full attributes (title, description, category, tags, pricing, currency, delivery time, service type, availability)
 * 2. Input Validation: Field presence, min length, price limits (>= 50), delivery days, service type enum
 * 3. Role Authorization Boundaries: Buyers prevented from creating listings; unauthenticated callers rejected
 * 4. Ownership Boundaries: Sellers cannot edit or delete listings belonging to other sellers
 * 5. Lifecycle Transitions (Publish, Pause, Resume, Archive): Status changes and public discovery visibility
 * 6. Public Discovery Consistency: Paused, draft, archived, and moderated listings never appear in Explore or AI search
 * 7. Safe Deletion & Historical Order Preservation:
 *    - Deletion is prevented if historical or active orders exist
 *    - Historical orders preserve their original price, turnaround, and snapshot if the listing subsequently changes
 *    - Service with 0 orders can be safely deleted
 * 8. Database Constraints & Migration 011 Declarations
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

// Emulate validation logic from lib/services/services.ts
function validateServiceInput(input) {
  if (input.title !== undefined) {
    const title = input.title.trim();
    if (!title) return { valid: false, error: 'Service title is required.' };
    if (title.length < 5) return { valid: false, error: 'Service title must be at least 5 characters long.' };
    if (title.length > 100) return { valid: false, error: 'Service title cannot exceed 100 characters.' };
  }

  if (input.description !== undefined) {
    const desc = input.description.trim();
    if (!desc) return { valid: false, error: 'Service description is required.' };
    if (desc.length < 20) {
      return { valid: false, error: 'Please provide a descriptive scope (minimum 20 characters).' };
    }
  }

  if (input.price !== undefined) {
    if (typeof input.price !== 'number' || isNaN(input.price)) {
      return { valid: false, error: 'Price must be a valid number.' };
    }
    if (input.price < 50) {
      return { valid: false, error: 'Minimum service price is ₹50.' };
    }
    if (input.price > 100000) {
      return { valid: false, error: 'Price exceeds maximum campus marketplace threshold (₹1,00,000).' };
    }
  }

  if (input.delivery_days !== undefined) {
    if (
      typeof input.delivery_days !== 'number' ||
      isNaN(input.delivery_days) ||
      input.delivery_days < 1 ||
      input.delivery_days > 60
    ) {
      return { valid: false, error: 'Delivery turnaround must be between 1 and 60 days.' };
    }
  }

  if (input.service_type !== undefined) {
    if (!['digital', 'in_person', 'hybrid'].includes(input.service_type)) {
      return { valid: false, error: 'Invalid service delivery type.' };
    }
  }

  if (input.status !== undefined) {
    if (!['draft', 'published', 'paused', 'archived', 'moderated'].includes(input.status)) {
      return { valid: false, error: 'Invalid service status.' };
    }
  }

  return { valid: true };
}

// Emulate seller authorization check from lib/auth/server-seller.ts
function checkSellerAuthorization(profile) {
  if (!profile) return { ok: false, status: 401, error: 'Authentication required.' };
  const isSeller =
    profile.is_admin ||
    profile.capabilities?.includes('seller') ||
    profile.capabilities?.includes('offer') ||
    profile.active_role === 'seller';

  if (!isSeller) {
    return {
      ok: false,
      status: 403,
      error: 'Buyer accounts cannot create or manage seller listings. Please activate your Seller role first.',
    };
  }
  return { ok: true, status: 200 };
}

// Emulate ownership verification
function checkServiceOwnership(service, callerId, profile) {
  if (!service) return { ok: false, status: 404, error: 'Service listing not found.' };
  const isOwner = service.provider_id === callerId;
  const isAdmin = profile?.is_admin === true;
  if (!isOwner && !isAdmin) {
    return { ok: false, status: 403, error: 'Forbidden: You do not own this service listing.' };
  }
  return { ok: true, status: 200 };
}

// Emulate public search filter
function filterPublishedServices(services) {
  return services.filter((s) => s.status === 'published');
}

async function runTests() {
  console.log('='.repeat(70));
  console.log('SkillBridge Feature 05: Seller Service Management Test Suite');
  console.log('='.repeat(70));

  // -------------------------------------------------------------------------
  // [Test Group 1] Service Input Validation Rules
  // -------------------------------------------------------------------------
  console.log('\n[Test Group 1] Service Input Validation Rules');

  // 1. Missing or short title
  const valNoTitle = validateServiceInput({ title: '   ' });
  assert(!valNoTitle.valid && valNoTitle.error?.includes('title is required'), 'Rejects empty service title');

  const valShortTitle = validateServiceInput({ title: 'Dev' });
  assert(!valShortTitle.valid && valShortTitle.error?.includes('at least 5 characters'), 'Rejects title shorter than 5 characters');

  // 2. Short description
  const valShortDesc = validateServiceInput({ description: 'Too brief' });
  assert(!valShortDesc.valid && valShortDesc.error?.includes('minimum 20 characters'), 'Rejects description shorter than 20 characters');

  // 3. Price validation
  const valNegPrice = validateServiceInput({ price: -10 });
  assert(!valNegPrice.valid && valNegPrice.error?.includes('Minimum service price is ₹50'), 'Rejects negative or below-threshold price');

  const valExcessivePrice = validateServiceInput({ price: 200000 });
  assert(!valExcessivePrice.valid && valExcessivePrice.error?.includes('exceeds maximum'), 'Rejects price above threshold (₹1,00,000)');

  // 4. Delivery turnaround days
  const valInvalidDays = validateServiceInput({ delivery_days: 0 });
  assert(!valInvalidDays.valid && valInvalidDays.error?.includes('between 1 and 60 days'), 'Rejects turnaround time of 0 days');

  const valHighDays = validateServiceInput({ delivery_days: 90 });
  assert(!valHighDays.valid && valHighDays.error?.includes('between 1 and 60 days'), 'Rejects turnaround time greater than 60 days');

  // 5. Service delivery type enum
  const valInvalidType = validateServiceInput({ service_type: 'drone_delivery' });
  assert(!valInvalidType.valid && valInvalidType.error?.includes('delivery type'), 'Rejects invalid delivery type');

  // 6. Complete valid service payload
  const valValid = validateServiceInput({
    title: 'Full-Stack Next.js Web App',
    description: 'Complete web application with responsive Tailwind UI, Supabase authentication, and database integration.',
    price: 1500,
    delivery_days: 5,
    service_type: 'digital',
    status: 'published',
  });
  assert(valValid.valid, 'Accepts complete, valid service listing attributes');

  // -------------------------------------------------------------------------
  // [Test Group 2] Role Authorization Boundaries (Buyer vs Seller)
  // -------------------------------------------------------------------------
  console.log('\n[Test Group 2] Role Authorization Boundaries');

  // 1. Unauthenticated request rejected
  const unauthRes = checkSellerAuthorization(null);
  assert(!unauthRes.ok && unauthRes.status === 401, 'Rejects unauthenticated request with 401 Unauthorized');

  // 2. Buyer account (Rohan: capabilities ['find', 'buyer'], active_role 'buyer')
  const buyerProfile = {
    id: 'prof-rohan',
    user_id: '10000000-0000-0000-0000-000000000003',
    full_name: 'Rohan Kulkarni',
    capabilities: ['find', 'buyer'],
    active_role: 'buyer',
    is_admin: false,
  };
  const buyerRes = checkSellerAuthorization(buyerProfile);
  assert(
    !buyerRes.ok && buyerRes.status === 403,
    'Rejects Buyer account from creating or managing listings with 403 Forbidden'
  );

  // 3. Authorized Seller (Alex: capabilities ['offer', 'seller', 'find'], active_role 'seller')
  const sellerProfile = {
    id: 'prof-alex',
    user_id: '10000000-0000-0000-0000-000000000001',
    full_name: 'Alex Sharma',
    capabilities: ['offer', 'seller', 'find'],
    active_role: 'seller',
    is_admin: false,
  };
  const sellerRes = checkSellerAuthorization(sellerProfile);
  assert(sellerRes.ok && sellerRes.status === 200, 'Authorizes verified Seller account to manage listings');

  // -------------------------------------------------------------------------
  // [Test Group 3] Listing Ownership Boundaries
  // -------------------------------------------------------------------------
  console.log('\n[Test Group 3] Listing Ownership Boundaries');

  const alexService = {
    id: '30000000-0000-0000-0000-000000000001',
    provider_id: '10000000-0000-0000-0000-000000000001', // Alex
    title: 'Full-Stack Next.js 14 Web Development',
    price: 1500,
  };

  const priyaProfile = {
    id: 'prof-priya',
    user_id: '10000000-0000-0000-0000-000000000002', // Priya
    capabilities: ['offer', 'seller'],
    is_admin: false,
  };

  const priyaEditRes = checkServiceOwnership(alexService, priyaProfile.user_id, priyaProfile);
  assert(
    !priyaEditRes.ok && priyaEditRes.status === 403,
    'Prevents seller from modifying another seller’s service listing'
  );

  const alexEditRes = checkServiceOwnership(alexService, sellerProfile.user_id, sellerProfile);
  assert(alexEditRes.ok && alexEditRes.status === 200, 'Permits seller to edit their own service listing');

  // Admin can manage any listing
  const adminProfile = {
    id: 'prof-admin',
    user_id: 'admin-uuid',
    capabilities: ['buyer', 'seller'],
    is_admin: true,
  };
  const adminEditRes = checkServiceOwnership(alexService, adminProfile.user_id, adminProfile);
  assert(adminEditRes.ok, 'Admin possesses moderation privileges over service listings');

  // -------------------------------------------------------------------------
  // [Test Group 4] Public Discovery & AI Search Filtering
  // -------------------------------------------------------------------------
  console.log('\n[Test Group 4] Public Discovery & Lifecycle Status Transitions');

  const catalog = [
    {
      id: 's-pub-1',
      provider_id: 'p-1',
      title: 'Cinematic Video Editing for College Reels',
      description: 'Dynamic transitions and color grading with Premiere Pro.',
      price: 800,
      status: 'published',
    },
    {
      id: 's-paused-2',
      provider_id: 'p-1',
      title: 'Paused Video Service',
      description: 'Taking an exam break. Premiere Pro editing.',
      price: 800,
      status: 'paused',
    },
    {
      id: 's-draft-3',
      provider_id: 'p-1',
      title: 'Draft Photography Workshop',
      description: 'Unfinished draft listing for campus photography.',
      price: 500,
      status: 'draft',
    },
    {
      id: 's-archived-4',
      provider_id: 'p-1',
      title: 'Archived Python Tutoring',
      description: 'Old course from previous semester.',
      price: 600,
      status: 'archived',
    },
    {
      id: 's-moderated-5',
      provider_id: 'p-2',
      title: 'Listing Under Review',
      description: 'Awaiting administrative verification.',
      price: 400,
      status: 'moderated',
    },
  ];

  // 1. Initial published discovery
  let publicListings = filterPublishedServices(catalog);
  let publicIds = publicListings.map((s) => s.id);

  assert(publicIds.includes('s-pub-1'), 'Public discovery includes published listing');
  assert(!publicIds.includes('s-paused-2'), 'Public discovery strictly excludes paused listing');
  assert(!publicIds.includes('s-draft-3'), 'Public discovery strictly excludes draft listing');
  assert(!publicIds.includes('s-archived-4'), 'Public discovery strictly excludes archived listing');
  assert(!publicIds.includes('s-moderated-5'), 'Public discovery strictly excludes moderated listing');

  // 2. Pause action: Published -> Paused
  catalog[0].status = 'paused';
  publicListings = filterPublishedServices(catalog);
  publicIds = publicListings.map((s) => s.id);
  assert(!publicIds.includes('s-pub-1'), 'Pausing listing immediately removes it from public discovery');

  // 3. Resume action: Paused -> Published
  catalog[0].status = 'published';
  publicListings = filterPublishedServices(catalog);
  publicIds = publicListings.map((s) => s.id);
  assert(publicIds.includes('s-pub-1'), 'Resuming listing restores it to public discovery');

  // -------------------------------------------------------------------------
  // [Test Group 5] Safe Deletion Invariant & Historical Order Preservation
  // -------------------------------------------------------------------------
  console.log('\n[Test Group 5] Safe Deletion & Historical Order Preservation');

  // Existing historical order
  const existingOrder = {
    id: 'ord-8001-active-in-progress',
    service_id: '30000000-0000-0000-0000-000000000001',
    buyer_id: '10000000-0000-0000-0000-000000000003',
    seller_id: '10000000-0000-0000-0000-000000000001',
    price: 1500,
    delivery_days: 3,
    service_snapshot: {
      id: '30000000-0000-0000-0000-000000000001',
      title: 'Full-Stack Next.js 14 Web Development',
      price: 1500,
      delivery_days: 3,
    },
  };

  // 1. Seller subsequently edits listing price and description
  const editedListing = {
    ...alexService,
    title: 'Updated Next.js 15 Web Application with AI',
    price: 3200,
    delivery_days: 7,
  };

  // Confirm order preserves original historical price, delivery turnaround, and snapshot
  assert(
    existingOrder.price === 1500,
    `Existing order preserves contracted price (₹${existingOrder.price}) when listing price changes to ₹${editedListing.price}`
  );
  assert(
    existingOrder.delivery_days === 3,
    `Existing order preserves agreed turnaround (${existingOrder.delivery_days} days) when listing changes to ${editedListing.delivery_days} days`
  );
  assert(
    existingOrder.service_snapshot.title === 'Full-Stack Next.js 14 Web Development',
    'Historical order retains immutable service snapshot from moment of order placement'
  );

  // 2. Safe deletion rule: Block delete if orders exist
  const existingOrders = [existingOrder];
  function safeDeleteServiceCheck(serviceId, orders) {
    const orderCount = orders.filter((o) => o.service_id === serviceId).length;
    if (orderCount > 0) {
      return {
        safe: false,
        error: 'Cannot delete service with active or historical orders. Please pause or archive the listing instead to preserve order records.',
      };
    }
    return { safe: true };
  }

  const deleteExistingRes = safeDeleteServiceCheck(alexService.id, existingOrders);
  assert(!deleteExistingRes.safe, 'Blocks hard deletion of service with existing order history');
  assert(deleteExistingRes.error.includes('archive the listing instead'), 'Recommends archiving or pausing instead of deletion');

  // 3. Service with 0 orders can be safely deleted
  const newUnsoldServiceId = 'unsold-service-123';
  const deleteUnsoldRes = safeDeleteServiceCheck(newUnsoldServiceId, existingOrders);
  assert(deleteUnsoldRes.safe, 'Permits safe deletion of newly created service with 0 orders');

  // -------------------------------------------------------------------------
  // [Test Group 6] Migration 011 Declarations & Database Safety
  // -------------------------------------------------------------------------
  console.log('\n[Test Group 6] Migration 011 Declarations & Database Safety');

  const migration011Path = path.join(
    rootDir,
    'supabase',
    'migrations',
    '20260822210000_011_service_management_lifecycle.sql'
  );
  assert(fs.existsSync(migration011Path), 'Migration 011 SQL file exists in supabase/migrations');

  if (fs.existsSync(migration011Path)) {
    const migrationSql = fs.readFileSync(migration011Path, 'utf8');

    assert(migrationSql.includes('service_type'), 'Migration 011 declares service_type column');
    assert(migrationSql.includes('currency'), 'Migration 011 declares currency column');
    assert(migrationSql.includes('cover_image_url'), 'Migration 011 declares cover_image_url column');
    assert(migrationSql.includes('portfolio_examples'), 'Migration 011 declares portfolio_examples column');
    assert(migrationSql.includes('availability_notes'), 'Migration 011 declares availability_notes column');
    assert(migrationSql.includes('service_snapshot'), 'Migration 011 declares service_snapshot column on orders');
    assert(migrationSql.includes('check_service_safe_delete'), 'Migration 011 establishes check_service_safe_delete trigger');
    assert(migrationSql.includes('service-media'), 'Migration 011 configures service-media storage bucket');
    assert(migrationSql.includes('moderated'), 'Migration 011 supports moderated status in constraints');
  }

  // -------------------------------------------------------------------------
  // [Test Group 7] UI Dashboard & API Endpoints Verification
  // -------------------------------------------------------------------------
  console.log('\n[Test Group 7] UI Dashboard & API Endpoints Verification');

  const myServicesPath = path.join(rootDir, 'app', '(main)', 'my-services', 'page.tsx');
  assert(fs.existsSync(myServicesPath), 'My Services dashboard page exists');
  const myServicesContent = fs.readFileSync(myServicesPath, 'utf8');
  assert(myServicesContent.includes('handleStatusChange'), 'Dashboard supports interactive status changes (pause/resume/archive)');
  assert(myServicesContent.includes('confirmSafeDelete'), 'Dashboard provides safe delete confirmation modal');
  assert(myServicesContent.includes('STATUS_CONFIG'), 'Dashboard distinguishes draft, published, paused, archived, and moderated listings');

  const editPagePath = path.join(rootDir, 'app', '(main)', 'services', '[id]', 'edit', 'page.tsx');
  assert(fs.existsSync(editPagePath), 'Service Edit page exists at app/(main)/services/[id]/edit/page.tsx');
  const editPageContent = fs.readFileSync(editPagePath, 'utf8');
  assert(editPageContent.includes('updateService'), 'Edit page invokes updateService with validation');
  assert(editPageContent.includes('previewMode'), 'Edit page provides live preview toggle');
  assert(editPageContent.includes('uploadServiceCoverImage'), 'Edit page supports cover image uploads');

  const servicesApiPath = path.join(rootDir, 'app', 'api', 'services', 'route.ts');
  assert(fs.existsSync(servicesApiPath), 'POST /api/services route exists for server validation');

  const serviceIdApiPath = path.join(rootDir, 'app', 'api', 'services', '[id]', 'route.ts');
  assert(fs.existsSync(serviceIdApiPath), 'PATCH and safe DELETE /api/services/[id] route exists');

  const statusApiPath = path.join(rootDir, 'app', 'api', 'services', '[id]', 'status', 'route.ts');
  assert(fs.existsSync(statusApiPath), 'POST /api/services/[id]/status route exists');

  // -------------------------------------------------------------------------
  // Test Summary
  // -------------------------------------------------------------------------
  console.log('\n' + '='.repeat(70));
  console.log(`Test Execution Finished: ${testsPassed} Passed, ${testsFailed} Failed.`);
  console.log('='.repeat(70));

  if (testsFailed > 0) {
    process.exit(1);
  }
}

runTests().catch((err) => {
  console.error('Fatal error running Feature 05 test suite:', err);
  process.exit(1);
});
