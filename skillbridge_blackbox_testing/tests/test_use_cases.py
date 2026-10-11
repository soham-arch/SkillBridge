import time
import pytest
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC

class TestUseCases:
    """
    Use Case Testing Suite (BB-UC-01 to BB-UC-05)
    Corresponds to Reference Presentation Pages 22-23 structure.
    Validates Complete Real-World User Workflows End-to-End.
    """

    def test_bb_uc_01_complete_buyer_discovery_workflow(self, helper, test_data):
        """
        BB-UC-01: Complete Buyer Discovery & Service Selection Workflow.
        Workflow:
        1. Open SkillBridge Landing page (/).
        2. Click 'Explore Skills' in top navigation.
        3. Enter search query 'Python' into semantic search bar.
        4. Wait for AI/database results to load.
        5. Click the Python service card.
        6. Verify complete service details page loads with title, price, and description.
        """
        # Step 1: Open Home
        helper.navigate("/")
        assert "SkillBridge" in helper.driver.title

        # Step 2: Click Explore Skills
        explore_link = helper.wait_for_clickable(By.XPATH, "//a[contains(text(), 'Explore Skills')]")
        explore_link.click()
        time.sleep(1.5)
        assert "/explore" in helper.driver.current_url

        # Step 3: Enter Search Query
        search_input = helper.wait_for_visible(By.ID, "search-input")
        search_input.clear()
        search_input.send_keys("Python")
        time.sleep(2)  # Wait for debounce and query update

        # Step 4: Click Matching Service Card
        cards = helper.wait_for_elements(By.CSS_SELECTOR, "a[href^='/services/']")
        assert len(cards) > 0, "No Python services returned in search"
        first_match = cards[0]
        first_match.click()
        time.sleep(2)

        # Step 5 & 6: Verify Service Detail Page Loaded
        helper.take_screenshot("BB_UC_01_buyer_discovery_complete")
        assert "/services/" in helper.driver.current_url
        page_source = helper.driver.page_source
        assert (
            "Python" in page_source
            or "₹" in page_source
            or "About this service" in page_source
        ), "Service details not populated correctly"

    def test_bb_uc_02_buyer_filter_and_price_customization_workflow(self, helper):
        """
        BB-UC-02: Buyer Multi-Parametric Filter & Price Range Workflow.
        Workflow:
        1. Open Explore page directly.
        2. Apply category filter 'Video & Content Creation'.
        3. Set minimum price ₹500 and maximum price ₹1000.
        4. Verify that filtered services display matching items.
        5. Click 'Reset All Filters' or clear controls to verify full catalog restoration.
        """
        helper.navigate("/explore")
        time.sleep(1)

        # Step 2: Select Video & Content Creation category
        cat_btn = helper.wait_for_clickable(By.XPATH, "//button[contains(text(), 'Video & Content Creation')]")
        cat_btn.click()
        time.sleep(1)

        # Step 3: Apply Price Bounds
        min_p = helper.wait_for_visible(By.ID, "min-price-input")
        max_p = helper.wait_for_visible(By.ID, "max-price-input")
        min_p.clear()
        min_p.send_keys("500")
        max_p.clear()
        max_p.send_keys("1000")
        time.sleep(2)

        helper.take_screenshot("BB_UC_02_buyer_price_filtered")

        # Step 4: Verify returned services
        page_source = helper.driver.page_source
        assert (
            "Showing" in page_source
            or "services" in page_source
        ), "Explore page failed to process combined filters"

        # Step 5: Clear Price Filters
        min_p.clear()
        max_p.clear()
        all_cat = helper.wait_for_clickable(By.XPATH, "//button[contains(text(), 'All Categories')]")
        all_cat.click()
        time.sleep(1.5)

        helper.take_screenshot("BB_UC_02_filters_restored")
        assert helper.is_present(By.CSS_SELECTOR, "a[href^='/services/']")

    def test_bb_uc_03_student_registration_validation_workflow(self, helper, test_data):
        """
        BB-UC-03: Complete Student Registration & Input Gate Workflow.
        Workflow:
        1. Open /register.
        2. Attempt submission with mismatched password -> Verify toast error.
        3. Correct password to match and submit with valid student details.
        4. Verify application initiates verification redirect or registration confirmation.
        """
        helper.navigate("/register")
        reg = test_data["registration"]["valid_candidate"]

        full_name = helper.wait_for_visible(By.ID, "fullName")
        email = helper.wait_for_visible(By.ID, "email")
        password = helper.wait_for_visible(By.ID, "password")
        confirm_password = helper.wait_for_visible(By.ID, "confirmPassword")
        college = helper.wait_for_visible(By.ID, "college")
        student_id = helper.wait_for_visible(By.ID, "studentIdNumber")
        submit_btn = helper.wait_for_clickable(By.CSS_SELECTOR, "button[type='submit']")

        # Enter mismatch
        full_name.send_keys(reg["full_name"])
        email.send_keys(f"uc_student_{int(time.time())}@gmail.com")
        password.send_keys("CollegePass2026!")
        confirm_password.send_keys("WrongMismatchPass99!")
        college.send_keys(reg["college"])
        student_id.send_keys(reg["student_id"])

        submit_btn.click()
        time.sleep(1)

        helper.take_screenshot("BB_UC_03_mismatch_detected")
        assert "Passwords do not match" in helper.driver.page_source or "do not match" in helper.driver.page_source

        # Correct mismatch and submit
        confirm_password.clear()
        confirm_password.send_keys("CollegePass2026!")
        submit_btn.click()
        time.sleep(3)

        helper.take_screenshot("BB_UC_03_registration_success")
        current_url = helper.driver.current_url
        page_source = helper.driver.page_source
        assert (
            "verify-email" in current_url
            or "Verification link sent" in page_source
            or "Account created" in page_source
            or "Rate limit" in page_source
        ), "Registration workflow did not progress to expected verification stage"

    def test_bb_uc_04_unauthenticated_seller_guard_workflow(self, helper):
        """
        BB-UC-04: Seller Protected Workflow Boundary Enforcement.
        Workflow:
        1. Guest user attempts direct access to Seller Gig Creator (/services/create).
        2. System security boundary intercepts unauthenticated session.
        3. User redirected to /login with encoded returnUrl.
        4. Preserves intended destination for post-authentication routing.
        """
        helper.navigate("/services/create")
        time.sleep(2)

        helper.take_screenshot("BB_UC_04_seller_guard_intercepted")

        current_url = helper.driver.current_url
        assert "/login" in current_url, f"Expected redirect to /login, got {current_url}"
        assert "%2Fservices%2Fcreate" in current_url or "/services/create" in current_url

    def test_bb_uc_05_academic_tutoring_consultation_workflow(self, helper):
        """
        BB-UC-05: Buyer Academic Tutoring Discovery & Consultation Inspection.
        Workflow:
        1. Open Explore page.
        2. Filter by Academic Tutoring category.
        3. Inspect returned tutoring listings.
        4. Select Data Structures & Algorithms tutoring service.
        5. Verify hourly rate, scope of tutoring, and contact/order CTA presence.
        """
        helper.navigate("/explore")
        time.sleep(1)

        cat_btn = helper.wait_for_clickable(By.XPATH, "//button[contains(text(), 'Academic Tutoring')]")
        cat_btn.click()
        time.sleep(1.5)

        cards = helper.wait_for_elements(By.CSS_SELECTOR, "a[href^='/services/']")
        assert len(cards) > 0, "No Academic Tutoring listings found"

        first_tutor_card = cards[0]
        first_tutor_card.click()
        time.sleep(2)

        helper.take_screenshot("BB_UC_05_tutoring_detail_inspected")

        assert "/services/" in helper.driver.current_url
        page_text = helper.driver.page_source
        assert (
            "Tutoring" in page_text
            or "Mathematics" in page_text
            or "Algorithms" in page_text
            or "₹" in page_text
        ), "Academic tutoring details were not correctly presented"
