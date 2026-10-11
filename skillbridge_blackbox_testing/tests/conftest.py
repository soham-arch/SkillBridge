import os
import json
import time
import pytest
from pathlib import Path
from selenium import webdriver
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC

BASE_DIR = Path(__file__).resolve().parent.parent
SCREENSHOT_DIR = BASE_DIR / "test_results" / "screenshots"
DATA_FILE = BASE_DIR / "test_data" / "test_data.json"

SCREENSHOT_DIR.mkdir(parents=True, exist_ok=True)

class SeleniumHelper:
    def __init__(self, driver, base_url="http://localhost:3000"):
        self.driver = driver
        self.base_url = base_url

    def navigate(self, path=""):
        url = f"{self.base_url}{path}" if path.startswith("/") else f"{self.base_url}/{path}"
        self.driver.get(url)
        return url

    def wait_for_element(self, by, value, timeout=10):
        return WebDriverWait(self.driver, timeout).until(
            EC.presence_of_element_located((by, value))
        )

    def wait_for_visible(self, by, value, timeout=10):
        return WebDriverWait(self.driver, timeout).until(
            EC.visibility_of_element_located((by, value))
        )

    def wait_for_clickable(self, by, value, timeout=10):
        return WebDriverWait(self.driver, timeout).until(
            EC.element_to_be_clickable((by, value))
        )

    def wait_for_elements(self, by, value, timeout=10):
        return WebDriverWait(self.driver, timeout).until(
            EC.presence_of_all_elements_located((by, value))
        )

    def is_present(self, by, value, timeout=3):
        try:
            WebDriverWait(self.driver, timeout).until(
                EC.presence_of_element_located((by, value))
            )
            return True
        except Exception:
            return False

    def wait_for_url_contains(self, text, timeout=10):
        return WebDriverWait(self.driver, timeout).until(
            EC.url_contains(text)
        )

    def take_screenshot(self, name):
        timestamp = time.strftime("%Y%m%d_%H%M%S")
        filename = f"{name}_{timestamp}.png" if not name.endswith(".png") else name
        filepath = SCREENSHOT_DIR / filename
        self.driver.save_screenshot(str(filepath))
        return str(filepath)

    def get_html5_validation_message(self, element):
        return self.driver.execute_script("return arguments[0].validationMessage;", element)

    def check_html5_validity(self, element):
        return self.driver.execute_script("return arguments[0].checkValidity();", element)

@pytest.fixture(scope="session")
def test_data():
    with open(DATA_FILE, "r", encoding="utf-8") as f:
        return json.load(f)

@pytest.fixture(scope="session")
def base_url(test_data):
    return test_data["application"]["base_url"]

@pytest.fixture(scope="function")
def driver():
    options = Options()
    options.add_argument("--headless=new")
    options.add_argument("--no-sandbox")
    options.add_argument("--disable-dev-shm-usage")
    options.add_argument("--disable-gpu")
    options.add_argument("--window-size=1920,1080")
    options.add_argument("--disable-blink-features=AutomationControlled")
    options.add_argument("--user-agent=Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 SkillBridgeTester/1.0")

    driver_instance = webdriver.Chrome(options=options)
    driver_instance.implicitly_wait(3)

    yield driver_instance

    driver_instance.quit()

@pytest.fixture(scope="function")
def helper(driver, base_url):
    return SeleniumHelper(driver, base_url)
