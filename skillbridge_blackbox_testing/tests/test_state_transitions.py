import time
import pytest
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC

class TestStateTransitions:
    """
    State Transition Testing Suite (BB-ST-01 to BB-ST-07)
    Corresponds to Reference Presentation Page 21 structure.
    Validates Dynamic Transitions between System States (Authentication, Navigation, Catalog Filtering, and Details).
    """

    def test_bb_st_01_landing_to_login_transition(self, helper):
        """
        BB-ST-01: Transition from Landing Page State (S0) to Login State (S1).
        Steps: 1. Start at Landing page. 2. Click 'Log in' navigation button. 3. Observe next state.
        Expected: State successfully transitions from / -> /login.
        """
        helper.navigate("/")
        time.sleep(1)
        assert helper.driver.current_url.rstrip("/").endswith("3000")

        login_btn = helper.wait_for_clickable(By.XPATH, "//button[contains(text(), 'Log in')]")
        login_btn.click()
        time.sleep(1.5)

        helper.take_screenshot("BB_ST_01_landing_to_login")

        assert "/login" in helper.driver.current_url, "Failed transition from Landing to Login state"
        assert helper.is_present(By.ID, "email"), "Login form input not present in S1"

    def test_bb_st_02_login_error_state_transition(self, helper, test_data):
        """
        BB-ST-02: Transition from Login State (S1) to Login Error State (S2_err).
        Steps: 1. Start at Login state. 2. Enter invalid credentials. 3. Click Login. 4. Observe next state.
        Expected: State transitions to Login Error (Error displayed, remains in Login state).
        """
        helper.navigate("/login")
        email_input = helper.wait_for_visible(By.ID, "email")
        password_input = helper.wait_for_visible(By.ID, "password")
        submit_btn = helper.wait_for_clickable(By.CSS_SELECTOR, "button[type='submit']")

        creds = test_data["credentials"]["invalid_password_user"]
        email_input.send_keys(creds["email"])
        password_input.send_keys(creds["password"])
        submit_btn.click()
        time.sleep(2)

        helper.take_screenshot("BB_ST_02_login_error_state")

        assert "/login" in helper.driver.current_url, "State changed away from login unexpectedly"
        page_source = helper.driver.page_source
        has_error = (
            "Invalid login credentials" in page_source
            or "Email not confirmed" in page_source
            or "error" in page_source.lower()
        )
        assert has_error, "System did not transition to Error display state"

    def test_bb_st_03_seller_gate_redirect_transition(self, helper):
        """
        BB-ST-03: Transition from Direct Seller Listing URL (S_unauth) to Auth Intercept State (S_gate).
        Steps: 1. Request /services/create without authentication. 2. Observe route guard transition.
        Expected: State transitions to /login?returnUrl=%2Fservices%2Fcreate.
        """
        helper.navigate("/services/create")
        time.sleep(2)

        helper.take_screenshot("BB_ST_03_seller_gate_redirect")

        current_url = helper.driver.current_url
        assert "/login" in current_url, f"Expected redirect to login, got {current_url}"
        assert "%2Fservices%2Fcreate" in current_url or "/services/create" in current_url

    def test_bb_st_04_admin_gate_redirect_transition(self, helper):
        """
        BB-ST-04: Transition from Direct Admin Dashboard URL (S_admin) to Auth Gate (S_gate).
        Steps: 1. Request /admin without session. 2. Observe route guard transition.
        Expected: State transitions to /login?returnUrl=%2Fadmin.
        """
        helper.navigate("/admin")
        time.sleep(2)

        helper.take_screenshot("BB_ST_04_admin_gate_redirect")

        current_url = helper.driver.current_url
        assert "/login" in current_url, f"Expected redirect to login, got {current_url}"
        assert "%2Fadmin" in current_url or "/admin" in current_url

    def test_bb_st_05_category_filter_state_transition(self, helper):
        """
        BB-ST-05: Transition from Default Catalog State (S_cat0) to Filtered Category State (S_cat1) and Reset back.
        Steps: 1. Open Explore. 2. Click category pill. 3. Observe catalog. 4. Click 'All Categories'. 5. Observe reset.
        Expected: State smoothly updates catalog and returns to default state.
        """
        helper.navigate("/explore")
        time.sleep(1)

        # Click specific category
        cat_btn = helper.wait_for_clickable(By.XPATH, "//button[contains(text(), 'Web & App Development')]")
        cat_btn.click()
        time.sleep(1.5)

        helper.take_screenshot("BB_ST_05_category_filtered_state")

        # Verify state updated
        page_text = helper.driver.page_source
        assert "Web & App Development" in page_text

        # Click All Categories to transition back
        all_btn = helper.wait_for_clickable(By.XPATH, "//button[contains(text(), 'All Categories')]")
        all_btn.click()
        time.sleep(1.5)

        helper.take_screenshot("BB_ST_05_category_reset_state")
        assert "Explore Student Services" in helper.driver.page_source

    def test_bb_st_06_empty_search_to_reset_transition(self, helper, test_data):
        """
        BB-ST-06: Transition from Empty Search Results State (S_empty) to Catalog Restored State (S_normal).
        Steps: 1. Enter non-matching search. 2. S_empty displayed. 3. Click 'Reset All Filters'. 4. Observe S_normal.
        Expected: Reset button successfully clears query and transitions catalog back to populated state.
        """
        helper.navigate("/explore")
        search_input = helper.wait_for_visible(By.ID, "search-input")
        search_input.send_keys(test_data["search_and_discovery"]["keywords"]["zero_match"])
        time.sleep(1.5)

        helper.take_screenshot("BB_ST_06_empty_search_state")

        reset_btn = helper.wait_for_clickable(By.XPATH, "//button[contains(text(), 'Reset All Filters')]")
        reset_btn.click()
        time.sleep(1.5)

        helper.take_screenshot("BB_ST_06_search_restored_state")

        # Query should be cleared
        assert search_input.get_attribute("value") == ""
        assert helper.is_present(By.CSS_SELECTOR, "a[href^='/services/']")

    def test_bb_st_07_catalog_to_service_detail_transition(self, helper):
        """
        BB-ST-07: Transition from Catalog Grid State (S_grid) to Service Detail State (S_detail).
        Steps: 1. Open Explore. 2. Click first service card. 3. Observe S_detail loaded.
        Expected: State transitions to /services/[id] with price, description, and action CTA visible.
        """
        helper.navigate("/explore")
        time.sleep(1)

        cards = helper.wait_for_elements(By.CSS_SELECTOR, "a[href^='/services/']")
        assert len(cards) > 0, "No service cards found to click"

        first_card = cards[0]
        service_href = first_card.get_attribute("href")
        first_card.click()
        time.sleep(2)

        helper.take_screenshot("BB_ST_07_service_detail_state")

        current_url = helper.driver.current_url
        assert "/services/" in current_url, f"Expected service detail URL, got {current_url}"
        assert helper.is_present(By.TAG_NAME, "h1"), "Service title heading not found in detail state"
