# SkillBridge Faculty Demonstration Checklist & Walkthrough Guide

This document provides a structured, time-budgeted demonstration script designed for academic faculty evaluations, project viva examinations, and capstone presentations.

---

## Demonstration Overview

| Stage | Demonstration Phase | Target Duration | Primary Personas |
|:-----:|:-------------------|:---------------:|:----------------|
| **1** | **System Architecture & Verification** | 2 mins | System / Architecture |
| **2** | **Student Onboarding & Verification Gate** | 2 mins | Student, Administrator |
| **3** | **Dual Listing Creation & Availability** | 2 mins | Verified Student Seller |
| **4** | **AI Semantic Search & Discovery** | 2 mins | Student Buyer |
| **5** | **Razorpay Sandbox Escrow Checkout** | 2 mins | Student Buyer |
| **6** | **Realtime Chat & Deliverable Workflow** | 2 mins | Buyer & Seller |
| **7** | **Escrow Release & Verified Reviews** | 2 mins | Buyer, Seller, Administrator |
| **8** | **Authoritative Dashboards & Audit Trail** | 1 min | Buyer, Seller, Administrator |

**Total Estimated Duration**: ~15 minutes.

---

## Stage 1: System Architecture & Automated Test Evidence (2 mins)

### Objective
Demonstrate that SkillBridge is a production-grade application backed by a fully typed, linted codebase and passing test suites.

### Steps to Present
1. Open the project terminal.
2. Run the master test command:
   ```bash
   npm run test:all
   ```
3. Highlight the results:
   - **607 Automated Tests** passed across 12 distinct functional suites.
   - Zero tests failed, zero tests skipped, and zero tests suppressed.
4. Run the production build command:
   ```bash
   npm run build
   ```
5. Show that all 48 pages and 27 serverless endpoints compile cleanly into static and server-rendered routes without TypeScript errors.

---

## Stage 2: Student Onboarding & Admin Verification Gate (2 mins)

### Objective
Demonstrate that sellers cannot publish services without official college verification, preventing anonymous fraud.

### Steps to Present
1. **New Student Registration**:
   - Navigate to `/register`.
   - Create a student account using a college email (e.g. `rohan@college.edu`).
   - Notice the status banner: `"Account unverified"`.
2. **Student ID Upload**:
   - Navigate to `/verify`.
   - Upload an institutional ID card and enter roll number and department.
   - The status immediately transitions to `"pending"` (`/verify/pending`).
3. **Attempt Premature Listing (Security Boundary)**:
   - Attempt to navigate to `/services/create`.
   - **Verification Gate**: The system intercepts the request and displays:
     > *"Student ID Verification Required. You must be an approved student seller to list services."*
4. **Administrator Approval**:
   - Switch to the Administrator account.
   - Navigate to `/admin`.
   - Under **Verifications Queue**, view Rohan's pending submission and ID preview.
   - Click **Approve**. The status changes to `verified`.
   - Check the **Audit Logs** tab: verify that an immutable log entry was recorded with admin ID and timestamp.

---

## Stage 3: Dual Service Creation & Availability Slots (2 mins)

### Objective
Demonstrate that SkillBridge cleanly separates fixed-scope deliverables from scheduled consultations.

### Steps to Present
1. **Log in as Verified Seller (Rohan)**.
2. Navigate to `/services/create`.
3. **Create Deliverable Gig**:
   - Select Service Type: **Deliverable Gig**.
   - Title: *"Full-Stack Next.js 14 Web Application Development"*.
   - Price: `₹2,500`. Delivery Time: `5 Days`. Revisions: `2`.
   - Submit. Service is published immediately.
4. **Create Consultation Service**:
   - Create a second service. Select Service Type: **Scheduled Consultation**.
   - Title: *"1-on-1 Data Structures & Algorithms Mock Interview"*.
   - Hourly Rate: `₹800/hour`. Session Duration: `60 minutes`.
5. **Set Availability Slots**:
   - Navigate to `/my-services/availability`.
   - Set Monday & Wednesday recurring hours (`16:00 - 19:00`).
   - Save calendar.

---

## Stage 4: AI Semantic Search & Service Discovery (2 mins)

### Objective
Demonstrate natural-language discovery powered by NVIDIA Nemotron AI and PostgreSQL trigram matching, resolving legacy service-not-found issues.

### Steps to Present
1. Open the Homepage `/`.
2. Enter conversational queries in the search bar:
   - *"I need someone to help me prepare for Google coding interviews."*
   - *"Build me a modern web app with database."*
3. **Observe Results**:
   - SkillBridge extracts intents and skills, matching Rohan's DSA Mock Interview and Next.js Development listings.
4. **Service Identifier Robustness**:
   - Click on the service to open `/services/[uuid]`.
   - Note that canonical UUIDs are used throughout the routing layer.
   - Demonstrate that legacy string IDs (e.g. `srv-1`) are safely intercepted and redirected to `/explore` with a user-friendly error toast instead of crashing the database.

---

## Stage 5: Razorpay Sandbox Escrow Checkout (2 mins)

### Objective
Demonstrate payment security where funds are locked into college escrow before work begins.

### Steps to Present
1. **Log in as Student Buyer (Priya)**.
2. Open Rohan's Next.js Development service (`₹2,500`).
3. Click **Order Service / Book Consultation**.
4. **Checkout Modal**:
   - Displays clear deliverables, agreed deadline, platform escrow guarantee, and anti-self-booking checks.
   - If a seller attempts to order their own service, the modal disables checkout and reports:
     > *"You cannot purchase your own listing."*
5. **Razorpay Sandbox Flow**:
   - Click **Proceed to Payment**.
   - The server verifies the authoritative service price in PostgreSQL and generates a Razorpay Order ID.
   - Razorpay Test Checkout modal opens.
   - Select **Netbanking / Success Simulation** and complete payment.
   - Server-side signature verification validates `razorpay_signature`.
   - Order transitions to `accepted` or `in_progress` with `funds_in_escrow = ₹2,500`.

---

## Stage 6: Realtime Order Chat & Deliverable Submission (2 mins)

### Objective
Demonstrate private, in-app buyer-seller communication and atomic milestone submission.

### Steps to Present
1. Navigate to the order detail page `/orders/[order_id]`.
2. **Access Control (Anti-IDOR Defense)**:
   - Copy the order URL and paste it into a third student's session.
   - Verify that non-participants receive an **Access Restricted (403 Forbidden)** screen.
3. **In-App Messaging**:
   - Priya (Buyer) sends project specifications in the order chat.
   - Rohan (Seller) receives the message in real time with unread count updates.
4. **Submitting Deliverable**:
   - Seller Rohan clicks **Submit Deliverables**.
   - Enters delivery notes and links a GitHub repository or zip file.
   - Order state transitions atomically to `delivered`.
   - Buyer receives an instant in-app notification.

---

## Stage 7: Escrow Release & Verified Reviews (2 mins)

### Objective
Demonstrate automated escrow payout release and authentic transaction-backed ratings.

### Steps to Present
1. **Accepting Deliverables**:
   - Buyer Priya reviews the work and clicks **Accept & Complete Order**.
   - Order state transitions to `completed`.
   - **Escrow Payout**: Rohan's seller balance increments from `in_escrow` directly into `total_earned`.
2. **Submitting Verified Review**:
   - Priya is presented with the **Review Your Experience** dialog.
   - Priya awards `5 Stars` with review text: *"Outstanding code quality and timely delivery!"*.
   - Review is submitted via `submit_verified_review` RPC.
3. **Anti-Duplication & Anti-Self-Review Checks**:
   - Attempt to submit a second review for the same order:
     > *"A verified review has already been submitted for this order."*
   - Attempt to review oneself: Strictly blocked.
4. **Reputation Update**:
   - Navigate to Rohan's public profile `/profile/[rohan_id]`.
   - Verify that Rohan's public rating immediately reflects `5.0 ★ (1 review)`.

---

## Stage 8: Real Authoritative Dashboards & Admin Moderation (1 min)

### Objective
Demonstrate that dashboards display live database data without hardcoded mocks.

### Steps to Present
1. **Buyer Dashboard (`/dashboard`)**:
   - Priya sees Active Orders: `0`, Completed Purchases: `1`, Reviews Awaiting: `0`.
2. **Seller Dashboard (`/dashboard`)**:
   - Rohan sees Total Earned: `₹2,500`, In Escrow: `₹0`, Completed Orders: `1`.
   - Notice zero double counting between Escrow and Total Earned.
3. **Admin Review Moderation**:
   - Log back into Admin account (`/admin`).
   - Open **Review Moderation** tab.
   - See Priya's review. Admin can inspect, verify authenticity, or hide inappropriate content if needed.
   - Audit trail captures all actions.

---

## Faculty Q&A Quick Reference

| Potential Faculty Question | Technical Answer & File Reference |
|----------------------------|-----------------------------------|
| *"How do you prevent money theft between students?"* | Funds are locked in escrow inside PostgreSQL with state-machine RPC enforcement (`lib/payments/escrow.ts` & Migration 013). |
| *"Can someone forge high ratings for their own account?"* | No. `submit_verified_review` RPC verifies the reviewer was a genuine buyer of a completed order, blocks duplicate submissions, and forbids self-reviews (`lib/reviews/reviews.ts` & Migration 015). |
| *"What happens if Razorpay webhooks fail or duplicate?"* | Webhooks are verified using cryptographic HMAC SHA256 and process events idempotently using transaction event IDs (`app/api/payments/webhook/route.ts`). |
| *"Where are private student ID images stored?"* | In a private Supabase Storage bucket (`student-ids`) accessible only to the owner and administrators via signed URLs (`lib/supabase/storage.ts`). |
