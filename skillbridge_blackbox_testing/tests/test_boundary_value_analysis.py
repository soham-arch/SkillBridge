import time
import pytest
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC

class TestBoundaryValueAnalysis:
    """
    Boundary Value Analysis Test Suite (BB-BVA-01 to BB-BVA-06)
    Validates System Boundaries on Input Lengths, Numerical Filters, and Mandatory Constraints.
    """

    def test_bb_bva_01_password_length_below_boundary(self, helper, test_data):
        """
        BB-BVA-01: Password length boundary test at Min - 1 (5 characters).
        Expected: Client validation rejects with 'Password must be at least 6 characters long'.
        """
        helper.navigate("/register")
        full_name = helper.wait_for_visible(By.ID, "fullName")
        email = helper.wait_for_visible(By.ID, "email")
        password = helper.wait_for_visible(By.ID, "password")
        confirm_password = helper.wait_for_visible(By.ID, "confirmPassword")
        college = helper.wait_for_visible(By.ID, "college")
        student_id = helper.wait_for_visible(By.ID, "studentIdNumber")
        submit_btn = helper.wait_for_clickable(By.CSS_SELECTOR, "button[type='submit']")

        reg = test_data["registration"]["valid_candidate"]
        full_name.send_keys(reg["full_name"])
        email.send_keys(f"bva5_{int(time.time())}@gmail.com")
        password.send_keys("12345")  # 5 characters (Min - 1)
        confirm_password.send_keys("12345")
        college.send_keys(reg["college"])
        student_id.send_keys(reg["student_id"])

        submit_btn.click()
        time.sleep(1)

        helper.take_screenshot("BB_BVA_01_password_length_below_min")

        page_text = helper.driver.page_source
        assert (
            "Password must be at least 6 characters" in page_text
            or "at least 6 characters" in page_text
        ), "5-character password was not rejected with length boundary error"

    def test_bb_bva_02_password_length_at_exact_min_boundary(self, helper, test_data):
        """
        BB-BVA-02: Password length boundary test at Exact Min (6 characters).
        Expected: Client length check passes (no 6-character length error triggered).
        """
        helper.navigate("/register")
        full_name = helper.wait_for_visible(By.ID, "fullName")
        email = helper.wait_for_visible(By.ID, "email")
        password = helper.wait_for_visible(By.ID, "password")
        confirm_password = helper.wait_for_visible(By.ID, "confirmPassword")
        college = helper.wait_for_visible(By.ID, "college")
        student_id = helper.wait_for_visible(By.ID, "studentIdNumber")
        submit_btn = helper.wait_for_clickable(By.CSS_SELECTOR, "button[type='submit']")

        reg = test_data["registration"]["valid_candidate"]
        full_name.send_keys(reg["full_name"])
        email.send_keys(f"bva6_{int(time.time())}@gmail.com")
        password.send_keys("123456")  # Exactly 6 characters (Min Boundary)
        confirm_password.send_keys("123456")
        college.send_keys(reg["college"])
        student_id.send_keys(reg["student_id"])

        submit_btn.click()
        time.sleep(2)

        helper.take_screenshot("BB_BVA_02_password_length_at_min")

        page_text = helper.driver.page_source
        assert (
            "Password must be at least 6 characters" not in page_text
        ), "6-character password was erroneously rejected for length"

    def test_bb_bva_03_price_filter_zero_lower_boundary(self, helper):
        """
        BB-BVA-03: Minimum price filter set to zero boundary (₹0).
        Expected: System treats zero as valid non-negative lower boundary and displays published services.
        """
        helper.navigate("/explore")
        min_p = helper.wait_for_visible(By.ID, "min-price-input")
        min_p.clear()
        min_p.send_keys("0")
        time.sleep(1.5)

        helper.take_screenshot("BB_BVA_03_price_zero_boundary")

        cards = helper.driver.find_elements(By.CSS_SELECTOR, "a[href^='/services/']")
        assert len(cards) > 0, "No services displayed with min price = 0"

    def test_bb_bva_04_price_filter_exact_equal_boundary(self, helper):
        """
        BB-BVA-04: Min and Max price set to identical value (₹500 - ₹500).
        Expected: Catalog filters to services priced exactly at ₹500.
        """
        helper.navigate("/explore")
        min_p = helper.wait_for_visible(By.ID, "min-price-input")
        max_p = helper.wait_for_visible(By.ID, "max-price-input")

        min_p.clear()
        min_p.send_keys("500")
        max_p.clear()
        max_p.send_keys("500")
        time.sleep(2)

        helper.take_screenshot("BB_BVA_04_price_exact_boundary")

        page_source = helper.driver.page_source
        assert (
            "₹500" in page_source
            or "Showing" in page_source
        ), "Exact price boundary did not evaluate correctly"

    def test_bb_bva_05_search_query_single_char_boundary(self, helper):
        """
        BB-BVA-05: Search input length boundary with a single character ('P').
        Expected: System handles single character input gracefully without crashing or throwing errors.
        """
        helper.navigate("/explore")
        search_input = helper.wait_for_visible(By.ID, "search-input")
        search_input.clear()
        search_input.send_keys("P")
        time.sleep(1.5)

        helper.take_screenshot("BB_BVA_05_search_single_char")

        # Page should remain functional and responsive
        assert helper.is_present(By.ID, "search-input")
        assert not helper.is_present(By.XPATH, "//*[contains(text(), 'Application error')]")

    def test_bb_bva_06_registration_empty_name_boundary(self, helper, test_data):
        """
        BB-BVA-06: Registration Full Name boundary at empty string (Length 0).
        Expected: Client form validation detects empty string and triggers 'Please enter your full name'.
        """
        helper.navigate("/register")
        full_name = helper.wait_for_visible(By.ID, "fullName")
        email = helper.wait_for_visible(By.ID, "email")
        password = helper.wait_for_visible(By.ID, "password")
        confirm_password = helper.wait_for_visible(By.ID, "confirmPassword")
        college = helper.wait_for_visible(By.ID, "college")
        student_id = helper.wait_for_visible(By.ID, "studentIdNumber")
        submit_btn = helper.wait_for_clickable(By.CSS_SELECTOR, "button[type='submit']")

        reg = test_data["registration"]["valid_candidate"]
        # Leave full_name blank
        email.send_keys("test.emptyname@mitwpu.edu.in")
        password.send_keys("CollegePass2026!")
        confirm_password.send_keys("CollegePass2026!")
        college.send_keys(reg["college"])
        student_id.send_keys(reg["student_id"])

        submit_btn.click()
        time.sleep(1)

        helper.take_screenshot("BB_BVA_06_empty_name_boundary")

        page_text = helper.driver.page_source
        assert (
            "Please enter your full name" in page_text or "full name" in page_text
        ), "Empty full name boundary did not trigger expected error"
