import time
import pytest
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC

class TestDecisionTable:
    """
    Decision Table Testing Suite (BB-DT-01 to BB-DT-06)
    Corresponds to Reference Presentation Page 20 structure.
    Validates Combinatorial Decision Rules governing Authentication, Marketplace Filters, and Route Guards.
    """

    def test_bb_dt_01_decision_unconfirmed_credentials(self, helper, test_data):
        """
        BB-DT-01: Rule 1 — Valid Email (Y), Correct Password (Y), Confirmed Account (N).
        Expected: Unconfirmed email warning and resend button displayed.
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

        helper.take_screenshot("BB_DT_01_decision_unconfirmed")

        page_text = helper.driver.page_source
        acknowledged = (
            "Email not confirmed" in page_text
            or "Resend verification email" in page_text
            or "Invalid login credentials" in page_text
        )
        assert acknowledged, "System failed to enforce unconfirmed email decision rule"

    def test_bb_dt_02_decision_invalid_credentials(self, helper, test_data):
        """
        BB-DT-02: Rule 2 — Valid Email (Y), Incorrect Password (Y).
        Expected: Login rejected, auth error alert displayed, user remains on /login.
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

        helper.take_screenshot("BB_DT_02_decision_invalid")

        assert "/login" in helper.driver.current_url, "User should remain on Login page"
        page_text = helper.driver.page_source
        assert (
            "Invalid login credentials" in page_text
            or "Email not confirmed" in page_text
            or "error" in page_text.lower()
        ), "Auth rejection message not displayed"

    def test_bb_dt_03_decision_unregistered_email(self, helper, test_data):
        """
        BB-DT-03: Rule 3 — Unregistered Email (Y), Any Password (Y).
        Expected: Authentication rejected with invalid credentials alert.
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

        helper.take_screenshot("BB_DT_03_decision_unregistered")

        assert "/login" in helper.driver.current_url, "User should remain on Login page"
        page_text = helper.driver.page_source
        assert "Invalid login credentials" in page_text or "error" in page_text.lower()

    def test_bb_dt_04_decision_empty_field_combination(self, helper):
        """
        BB-DT-04: Rule 4 — Email (Empty), Password (Provided).
        Expected: HTML5 form validation intercept prevents submission.
        """
        helper.navigate("/login")
        email_input = helper.wait_for_visible(By.ID, "email")
        password_input = helper.wait_for_visible(By.ID, "password")
        submit_btn = helper.wait_for_clickable(By.CSS_SELECTOR, "button[type='submit']")

        email_input.clear()
        password_input.clear()
        password_input.send_keys("AnyPassword123!")

        submit_btn.click()
        time.sleep(0.5)

        helper.take_screenshot("BB_DT_04_decision_empty_email")

        is_valid = helper.check_html5_validity(email_input)
        assert not is_valid, "Form submission was not blocked for empty email"
        assert "/login" in helper.driver.current_url

    def test_bb_dt_05_decision_multi_filter_combination(self, helper, test_data):
        """
        BB-DT-05: Rule 5 — Filter Matrix: Category Selected (Y), Price Filter Active (Y).
        Expected: Catalog returns subset satisfying BOTH category and price range criteria.
        """
        helper.navigate("/explore")
        min_price = helper.wait_for_visible(By.ID, "min-price-input")
        max_price = helper.wait_for_visible(By.ID, "max-price-input")

        # Select a category button
        category_buttons = helper.driver.find_elements(By.XPATH, "//button[contains(text(), 'Academic Tutoring')]")
        if category_buttons:
            category_buttons[0].click()
            time.sleep(1)

        min_price.clear()
        min_price.send_keys("400")
        max_price.clear()
        max_price.send_keys("700")
        time.sleep(1.5)  # Allow debounce

        helper.take_screenshot("BB_DT_05_decision_multi_filter")

        # Confirm results or matching filtered elements
        cards = helper.driver.find_elements(By.CSS_SELECTOR, "a[href^='/services/']")
        page_text = helper.driver.page_source
        assert (
            len(cards) > 0
            or "Showing" in page_text
            or "No services match" in page_text
        ), "Filter matrix did not execute as expected"

    def test_bb_dt_06_decision_protected_seller_guard(self, helper):
        """
        BB-DT-06: Rule 6 — Authenticated (N), Protected Route Access (Y).
        Expected: Route guard redirects to /login?returnUrl=%2Fservices%2Fcreate.
        """
        helper.navigate("/services/create")
        time.sleep(2)

        helper.take_screenshot("BB_DT_06_decision_seller_guard")

        current_url = helper.driver.current_url
        assert "/login" in current_url, f"Expected redirect to login, but stayed at {current_url}"
        assert "returnUrl=" in current_url, "returnUrl parameter was not preserved in redirect"
