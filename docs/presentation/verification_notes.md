# SkillBridge Project Showcase: Verification Notes

## Deliverable

- Editable PowerPoint: `SkillBridge_Project_Showcase.pptx`
- Generation source: `presentation_sources/build_skillbridge_showcase.mjs`
- Cover asset: `assets/skillbridge-hero.png` (original AI-generated illustration)

## Technical source inventory

The presentation content was derived from the local repository rather than copied from the TrustLens reference. Principal evidence reviewed:

- `types/index.ts` for domain entities and enumerated lifecycles.
- `app/api/payments/create-order/route.ts` and `app/api/payments/verify/route.ts` for checkout, price authority, Razorpay test-mode order creation, and signature verification.
- `app/api/orders/[id]/transition/route.ts` for order-state transitions and actor permissions.
- `app/api/services/route.ts` and `lib/auth/server-seller.ts` for seller listing authorization.
- `app/api/orders/[id]/messages/route.ts` and `app/api/reviews/submit/route.ts` for participant-only messaging and completed-order review constraints.
- Supabase migrations for profiles, services, availability, bookings, orders, payments, messages, reviews, notifications, verification, and administration.
- `skillbridge_blackbox_testing/test_results/junit_report.xml` and `reports/ppt_testing_evidence/` for testing totals and authentic terminal screenshots.

## Diagram review

| Diagram | Verification basis | Review result |
|---|---|---|
| DFD Level 0 | Roles, payment routes, and external Razorpay integration | Context boundary shows Buyer, Seller, Admin, Razorpay Test Mode, and SkillBridge only. |
| DFD Level 1 | Profiles, services, orders, payments, reviews, verification, and admin modules | Internal processes and data stores match implemented areas; flows are labelled consistently with Level 0. |
| DFD Level 2 | Payment creation and verification routes | Checkout decomposition uses only code-supported validation, server price lookup, gateway order creation, signature verification, persistence, and notification. |
| Use Case Diagram | Implemented routes and role checks | Buyer, Seller, and Admin use cases are separated. No unsupported include or extend relationship is asserted. |
| Buyer Sequence | Payment routes and Supabase persistence | Flow follows service selection, server-side validation, Razorpay order creation, signature verification, and status update. |
| Seller Sequence | Seller authorization, listing creation, and order transitions | Seller actions correspond to persisted listing and order workflows. |
| Domain Model | `types/index.ts` and migrations | Presented as a domain model, not as a claim of an object-relational class implementation. |
| Activity Diagram | Order transition route | Shows the fixed-scope delivery path and bounded revision loop. |

## Estimation assumptions

Function Point and COCOMO values are academic estimates, not measured project data.

- Unadjusted Function Points: 123.
- General System Characteristics assumption: 35, giving VAF 1.00 and adjusted FP 123.
- Conversion assumption: 53 LOC per FP for the TypeScript/JavaScript application, giving 6.52 KLOC.
- Basic COCOMO organic-mode estimate: 17.3 person-months, 7.4 months, and 2.3 average staff.

## Testing evidence interpretation

- Initial full Selenium suite from the JUnit report: 39 tests, 22 passed, 17 failed, 0 errors.
- Focused evidence suite: 9 selected Selenium tests passed in 18.42 seconds.
- The presentation does not treat all 17 baseline failures as application defects and does not claim 607 passing assertions.
- No executable white-box coverage report was present in the supplied testing artifacts. The deck explicitly states this limitation rather than inventing coverage.

## Presentation verification

- The final PPTX contains 27 slides.
- Package integrity, slide count, native table presence, text fit, and first-party re-import checks passed through the presentation finalizer.
- Every slide was rendered for visual review. The cover visual and terminal-evidence images are embedded into the PPTX.
- PDF conversion was attempted with both the bundled presentation export and locally installed PowerPoint, but neither produced a reliable PDF in this environment. The editable PPTX is the validated final deliverable.
