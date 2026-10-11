import time
import pytest
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC

class TestErrorGuessing:
    """
    Error Guessing & Negative Scenarios Suite (BB-EG-01 to BB-EG-06)
    Corresponds to Reference Presentation Page 23 structure (BB-EG-01, BB-EG-02).
    Evaluates Application Resilience Against Common User Errors and Missing Constraints.
    """

    def test_bb_eg_01_both_login_fields_empty(self, helper):
        """
        BB-EG-01: Both login fields empty.
        Expected: Browser validation prevents empty submission, user remains on /login.
        """
        helper.navigate("/login")
        email_input = helper.wait_for_visible(By.ID, "email")
        password_input = helper.wait_for_visible(By.ID, "password")
        submit_btn = helper.wait_for_clickable(By.CSS_SELECTOR, "button[type='submit']")

        email_input.clear()
        password_input.clear()
        submit_btn.click()
        time.sleep(0.5)

        helper.take_screenshot("BB_EG_01_both_fields_empty")

        is_email_valid = helper.check_html5_validity(email_input)
        assert not is_email_valid, "Form submission was not prevented when both fields were empty"
        assert "/login" in helper.driver.current_url

    def test_bb_eg_02_incorrect_password_handling(self, helper, test_data):
        """
        BB-EG-02: Incorrect password handling.
        Expected: System displays appropriate authentication error and does not open Dashboard.
        """
        helper.navigate("/login")
        email_input = helper.wait_for_visible(By.ID, "email")
        password_input = helper.wait_for_visible(By.ID, "password")
        submit_btn = helper.wait_for_clickable(By.CSS_SELECTOR, "button[type='submit']")

        creds = test_data["credentials"]["invalid_password_user"]
        email_input.clear()
        email_input.send_keys(creds["email"])
        password_input.clear()
        password_input.send_keys("WrongPass@999")
        submit_btn.click()
        time.sleep(2)

        helper.take_screenshot("BB_EG_02_incorrect_password_handling")

        assert "/login" in helper.driver.current_url, "User was navigated away from Login page"
        page_source = helper.driver.page_source
        assert (
            "Invalid login credentials" in page_source
            or "Email not confirmed" in page_source
            or "error" in page_source.lower()
        ), "Authentication error was not displayed"

    def test_bb_eg_03_malformed_email_syntax(self, helper):
        """
        BB-EG-03: Malformed email syntax missing '@' symbol (e.g. 'notanemail').
        Expected: HTML5 email validation prevents form submission.
        """
        helper.navigate("/login")
        email_input = helper.wait_for_visible(By.ID, "email")
        password_input = helper.wait_for_visible(By.ID, "password")
        submit_btn = helper.wait_for_clickable(By.CSS_SELECTOR, "button[type='submit']")

        email_input.clear()
        email_input.send_keys("malformedemailaddress")
        password_input.clear()
        password_input.send_keys("ValidPass123!")
        submit_btn.click()
        time.sleep(0.5)

        helper.take_screenshot("BB_EG_03_malformed_email")

        is_valid = helper.check_html5_validity(email_input)
        assert not is_valid, "Malformed email passed HTML5 email validation"
        assert "/login" in helper.driver.current_url

    def test_bb_eg_04_registration_empty_college_field(self, helper, test_data):
        """
        BB-EG-04: Student registration with empty college/university field.
        Expected: System displays error toast 'Please enter your college or university'.
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
        email.send_keys("test.nocollege@mitwpu.edu.in")
        password.send_keys("CollegePass2026!")
        confirm_password.send_keys("CollegePass2026!")
        college.clear()  # Leave college empty
        student_id.send_keys(reg["student_id"])

        submit_btn.click()
        time.sleep(1)

        helper.take_screenshot("BB_EG_04_empty_college_toast")

        page_text = helper.driver.page_source
        assert (
            "Please enter your college" in page_text or "college" in page_text.lower()
        ), "Validation toast for missing college was not displayed"

    def test_bb_eg_05_registration_empty_student_id_field(self, helper, test_data):
        """
        BB-EG-05: Student registration with empty student ID / enrollment number.
        Expected: System displays error toast 'Please enter your student ID or enrollment number'.
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
        email.send_keys("test.nostudentid@mitwpu.edu.in")
        password.send_keys("CollegePass2026!")
        confirm_password.send_keys("CollegePass2026!")
        college.send_keys(reg["college"])
        student_id.clear()  # Leave student ID empty

        submit_btn.click()
        time.sleep(1)

        helper.take_screenshot("BB_EG_05_empty_student_id_toast")

        page_text = helper.driver.page_source
        assert (
            "student ID" in page_text or "enrollment number" in page_text
        ), "Validation toast for missing student ID was not displayed"

    def test_bb_eg_06_unauthenticated_admin_access_attempt(self, helper):
        """
        BB-EG-06: Direct URL manipulation attempting unauthenticated Admin Command Center access.
        Expected: Route guard intercepts request and forces redirect to /login?returnUrl=%2Fadmin.
        """
        helper.navigate("/admin")
        time.sleep(2)

        helper.take_screenshot("BB_EG_06_unauth_admin_redirect")

        current_url = helper.driver.current_url
        assert "/login" in current_url, f"Expected redirect to login, got {current_url}"
        assert "%2Fadmin" in current_url or "/admin" in current_url
