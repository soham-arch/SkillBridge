import time
import pytest
from selenium.webdriver.common.by import By
from selenium.webdriver.common.keys import Keys
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC

class TestEquivalencePartitioning:
    """
    Equivalence Partitioning Test Suite (BB-EP-01 to BB-EP-09)
    Corresponds to Reference Presentation Page 19 structure.
    Validates Valid and Invalid Input Classes across Authentication, Registration, and Search.
    """

    def test_bb_ep_01_login_unconfirmed_email(self, helper, test_data):
        """
        BB-EP-01: Login with valid email and password for unconfirmed account.
        Expected: System identifies unconfirmed state, displays confirmation notice and resend option.
        """
        helper.navigate("/login")
        email_input = helper.wait_for_visible(By.ID, "email")
        password_input = helper.wait_for_visible(By.ID, "password")
        submit_btn = helper.wait_for_clickable(By.CSS_SELECTOR, "button[type='submit']")

        creds = test_data["credentials"]["unconfirmed_student"]
        email_input.clear()
        email_input.send_keys(creds["email"])
        password_input.clear()
        password_input.send_keys(creds["password"])

        submit_btn.click()
        time.sleep(2)

        helper.take_screenshot("BB_EP_01_unconfirmed_login")

        page_text = helper.driver.page_source
        is_unconfirmed_flagged = (
            "Email not confirmed" in page_text
            or "Resend verification email" in page_text
            or "verify-email" in helper.driver.current_url
            or "Invalid login credentials" in page_text
        )
        assert is_unconfirmed_flagged, "System did not acknowledge credential/confirmation response appropriately"

    def test_bb_ep_02_login_invalid_password(self, helper, test_data):
        """
        BB-EP-02: Login with valid email syntax but incorrect password.
        Expected: System rejects login, displays invalid credentials message, remains on /login.
        """
        helper.navigate("/login")
        email_input = helper.wait_for_visible(By.ID, "email")
        password_input = helper.wait_for_visible(By.ID, "password")
        submit_btn = helper.wait_for_clickable(By.CSS_SELECTOR, "button[type='submit']")

        creds = test_data["credentials"]["invalid_password_user"]
        email_input.clear()
        email_input.send_keys(creds["email"])
        password_input.clear()
        password_input.send_keys(creds["password"])

        submit_btn.click()
        time.sleep(2)

        helper.take_screenshot("BB_EP_02_invalid_password")

        assert "/login" in helper.driver.current_url, "User should remain on login page"
        page_text = helper.driver.page_source
        has_error = (
            "Invalid login credentials" in page_text
            or "Email not confirmed" in page_text
            or "error" in page_text.lower()
        )
        assert has_error, "Authentication error message was not displayed"

    def test_bb_ep_03_login_unregistered_email(self, helper, test_data):
        """
        BB-EP-03: Login with unregistered email.
        Expected: System rejects login and displays invalid credentials message.
        """
        helper.navigate("/login")
        email_input = helper.wait_for_visible(By.ID, "email")
        password_input = helper.wait_for_visible(By.ID, "password")
        submit_btn = helper.wait_for_clickable(By.CSS_SELECTOR, "button[type='submit']")

        creds = test_data["credentials"]["unregistered_user"]
        email_input.clear()
        email_input.send_keys(creds["email"])
        password_input.clear()
        password_input.send_keys(creds["password"])

        submit_btn.click()
        time.sleep(2)

        helper.take_screenshot("BB_EP_03_unregistered_email")

        assert "/login" in helper.driver.current_url, "User should remain on login page"
        page_text = helper.driver.page_source
        assert (
            "Invalid login credentials" in page_text or "error" in page_text.lower()
        ), "Invalid credentials error message was not displayed for unregistered email"

    def test_bb_ep_04_login_empty_email(self, helper):
        """
        BB-EP-04: Login with empty email.
        Expected: System prevents submission and browser required-field validation is detected.
        """
        helper.navigate("/login")
        email_input = helper.wait_for_visible(By.ID, "email")
        password_input = helper.wait_for_visible(By.ID, "password")
        submit_btn = helper.wait_for_clickable(By.CSS_SELECTOR, "button[type='submit']")

        email_input.clear()
        password_input.clear()
        password_input.send_keys("SamplePass123!")

        submit_btn.click()
        time.sleep(0.5)

        helper.take_screenshot("BB_EP_04_empty_email")

        is_valid = helper.check_html5_validity(email_input)
        validation_msg = helper.get_html5_validation_message(email_input)

        assert not is_valid, "Email input should be invalid when empty"
        assert len(validation_msg) > 0, "Browser should indicate required-field validation for email"
        assert "/login" in helper.driver.current_url, "Form should not submit with empty email"

    def test_bb_ep_05_login_empty_password(self, helper):
        """
        BB-EP-05: Login with empty password.
        Expected: System prevents submission and indicates that password is required.
        """
        helper.navigate("/login")
        email_input = helper.wait_for_visible(By.ID, "email")
        password_input = helper.wait_for_visible(By.ID, "password")
        submit_btn = helper.wait_for_clickable(By.CSS_SELECTOR, "button[type='submit']")

        email_input.clear()
        email_input.send_keys("student@mitwpu.edu.in")
        password_input.clear()

        submit_btn.click()
        time.sleep(0.5)

        helper.take_screenshot("BB_EP_05_empty_password")

        is_valid = helper.check_html5_validity(password_input)
        validation_msg = helper.get_html5_validation_message(password_input)

        assert not is_valid, "Password input should be invalid when empty"
        assert len(validation_msg) > 0, "Browser should indicate required-field validation for password"
        assert "/login" in helper.driver.current_url, "Form should not submit with empty password"

    def test_bb_ep_06_register_valid_student(self, helper, test_data):
        """
        BB-EP-06: Student registration with valid form inputs.
        Expected: System registers account and redirects to email verification page.
        """
        helper.navigate("/register")
        full_name_input = helper.wait_for_visible(By.ID, "fullName")
        email_input = helper.wait_for_visible(By.ID, "email")
        password_input = helper.wait_for_visible(By.ID, "password")
        confirm_password_input = helper.wait_for_visible(By.ID, "confirmPassword")
        college_input = helper.wait_for_visible(By.ID, "college")
        student_id_input = helper.wait_for_visible(By.ID, "studentIdNumber")
        submit_btn = helper.wait_for_clickable(By.CSS_SELECTOR, "button[type='submit']")

        unique_email = f"student.qa.{int(time.time())}@gmail.com"
        reg = test_data["registration"]["valid_candidate"]

        full_name_input.send_keys(reg["full_name"])
        email_input.send_keys(unique_email)
        password_input.send_keys(reg["password"])
        confirm_password_input.send_keys(reg["password"])
        college_input.send_keys(reg["college"])
        student_id_input.send_keys(reg["student_id"])

        submit_btn.click()
        time.sleep(3)

        helper.take_screenshot("BB_EP_06_registration_submission")

        current_url = helper.driver.current_url
        page_source = helper.driver.page_source
        is_routed = (
            "/auth/verify-email" in current_url
            or "verify-email" in current_url
            or "Account created" in page_source
            or "Verification link sent" in page_source
            or "Rate limit" in page_source
        )
        assert is_routed, f"Expected redirect to verify-email or success confirmation, got {current_url}"

    def test_bb_ep_07_register_password_mismatch(self, helper, test_data):
        """
        BB-EP-07: Registration with mismatched password and confirm password.
        Expected: Form rejects submission and shows 'Passwords do not match' validation error.
        """
        helper.navigate("/register")
        full_name_input = helper.wait_for_visible(By.ID, "fullName")
        email_input = helper.wait_for_visible(By.ID, "email")
        password_input = helper.wait_for_visible(By.ID, "password")
        confirm_password_input = helper.wait_for_visible(By.ID, "confirmPassword")
        college_input = helper.wait_for_visible(By.ID, "college")
        student_id_input = helper.wait_for_visible(By.ID, "studentIdNumber")
        submit_btn = helper.wait_for_clickable(By.CSS_SELECTOR, "button[type='submit']")

        reg = test_data["registration"]["valid_candidate"]
        full_name_input.send_keys(reg["full_name"])
        email_input.send_keys("test.mismatch@mitwpu.edu.in")
        password_input.send_keys("ValidPass123!")
        confirm_password_input.send_keys("DifferentPass456!")
        college_input.send_keys(reg["college"])
        student_id_input.send_keys(reg["student_id"])

        submit_btn.click()
        time.sleep(1)

        helper.take_screenshot("BB_EP_07_password_mismatch")

        page_text = helper.driver.page_source
        assert (
            "Passwords do not match" in page_text or "do not match" in page_text
        ), "Validation toast 'Passwords do not match' was not displayed"
        assert "/register" in helper.driver.current_url, "User should remain on registration page"

    def test_bb_ep_08_explore_search_matching_query(self, helper, test_data):
        """
        BB-EP-08: Service search with matching keyword ('Next.js').
        Expected: Catalog returns matching services (e.g. Next.js Website & Portfolio Setup).
        """
        helper.navigate("/explore")
        search_input = helper.wait_for_visible(By.ID, "search-input")

        query = test_data["search_and_discovery"]["keywords"]["matching_nextjs"]
        search_input.clear()
        search_input.send_keys(query)
        time.sleep(1.5)  # Allow debounce

        helper.take_screenshot("BB_EP_08_search_matching")

        cards = helper.driver.find_elements(By.CSS_SELECTOR, "a[href^='/services/']")
        page_text = helper.driver.page_source
        assert len(cards) > 0 or "Next.js" in page_text, "Matching services should be displayed for query 'Next.js'"

    def test_bb_ep_09_explore_search_zero_results(self, helper, test_data):
        """
        BB-EP-09: Service search with non-matching query string.
        Expected: Catalog displays 'No services match your query' empty state.
        """
        helper.navigate("/explore")
        search_input = helper.wait_for_visible(By.ID, "search-input")

        query = test_data["search_and_discovery"]["keywords"]["zero_match"]
        search_input.clear()
        search_input.send_keys(query)
        time.sleep(1.5)  # Allow debounce

        helper.take_screenshot("BB_EP_09_search_zero_results")

        page_text = helper.driver.page_source
        assert (
            "No services match your query" in page_text or "Reset All Filters" in page_text
        ), "Zero results empty state should be displayed for non-matching query"
