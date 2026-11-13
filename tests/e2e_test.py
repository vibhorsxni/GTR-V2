import os
import sys
import time
import threading
from http.server import SimpleHTTPRequestHandler, HTTPServer
from playwright.sync_api import sync_playwright

if sys.stdout.encoding != 'utf-8':
    sys.stdout.reconfigure(encoding='utf-8')


class QuietHandler(SimpleHTTPRequestHandler):
    def log_message(self, format, *args):
        pass

PORT = 8999
server = HTTPServer(('127.0.0.1', PORT), QuietHandler)
server_thread = threading.Thread(target=server.serve_forever, daemon=True)
server_thread.start()
time.sleep(0.5)

print(f"Test server running on http://127.0.0.1:{PORT}")

qa_report = {
    "viewports_checked": [],
    "drawer_tests": [],
    "nav_tests": [],
    "console_errors": [],
    "failed_requests": [],
    "overall_passed": True
}

viewports = [
    ("Desktop 1920x1080", 1920, 1080),
    ("Desktop 1440x900", 1440, 900),
    ("Desktop 1366x768", 1366, 768),
    ("Tablet 1024x768", 1024, 768),
    ("Tablet 768x1024", 768, 1024),
    ("Mobile 425x850", 425, 850),
    ("Mobile 390x844 (iPhone 14/Pixel)", 390, 844),
    ("Mobile 375x667 (SE/Small)", 375, 667),
    ("Mobile 320x568 (Min spec)", 320, 568),
]

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    page = browser.new_page(viewport={"width": 1920, "height": 1080})

    page.on("console", lambda msg: (
        qa_report["console_errors"].append(f"[{msg.type.upper()}] {msg.text}")
        if msg.type == "error" else None
    ))
    page.on("requestfailed", lambda req: (
        qa_report["failed_requests"].append(f"[FAIL] {req.url}")
    ))

    # 1. Load Page
    print("\n--- 1. LOADING HOMEPAGE ---")
    page.goto(f"http://127.0.0.1:{PORT}/index.html", wait_until="domcontentloaded")
    page.wait_for_timeout(3000)

    title = page.title()
    print(f"Title: {title}")
    assert "Project GTR" in title, f"Unexpected title: {title}"

    # 2. Test All 4 Generation Drawers (R32, R33, R34, R35)
    for gen in ['r32', 'r33', 'r34', 'r35']:
        print(f"\n--- Testing Drawer: {gen.upper()} ---")
        open_btn = f"#{gen}-drawer-open"
        drawer = f"#{gen}-drawer"
        close_btn = f"#{gen}-drawer-close"
        
        # Verify trigger exists and is visible
        page.locator(open_btn).scroll_into_view_if_needed()
        page.wait_for_timeout(400)
        assert page.is_visible(open_btn), f"Trigger {open_btn} not visible"
        
        # Click trigger to open drawer
        page.click(open_btn)
        page.wait_for_timeout(600)
        is_open = page.locator(drawer).evaluate("el => el.classList.contains('is-open')")
        assert is_open, f"Drawer {drawer} failed to open"
        print(f"  ✓ {gen.upper()} Drawer opened successfully")

        # Test Dossier Stories inside the drawer
        story_cards = page.locator(f"{drawer} [data-story]")
        count = story_cards.count()
        print(f"  Found {count} interactive story tabs in {gen.upper()}")
        for i in range(count):
            card = story_cards.nth(i)
            story_key = card.get_attribute("data-story")
            card.click()
            page.wait_for_timeout(100)
            is_active = card.evaluate("el => el.classList.contains('is-active')")
            stat_text = page.locator(f"#{gen}-focus-stat").text_content()
            assert is_active, f"Story {story_key} did not become active"
            print(f"    - Tab [{story_key}]: Stat = {stat_text}")

        # Close drawer
        page.click(close_btn)
        page.wait_for_timeout(600)
        is_closed = not page.locator(drawer).evaluate("el => el.classList.contains('is-open')")
        assert is_closed, f"Drawer {drawer} failed to close"
        print(f"  ✓ {gen.upper()} Drawer closed successfully")
        qa_report["drawer_tests"].append(f"{gen.upper()} Drawer & Dossier fully functional")

    # 3. Test Navigation and Mobile Toggle
    print("\n--- 3. TESTING NAVIGATION & MOBILE MENU ---")
    page.set_viewport_size({"width": 390, "height": 844})
    page.wait_for_timeout(400)
    
    nav_toggle = page.locator("#nav-toggle")
    assert nav_toggle.is_visible(), "Mobile nav toggle button not visible on 390px"
    
    # Click mobile hamburger
    nav_toggle.click()
    page.wait_for_timeout(400)
    is_nav_open = page.locator("#primary-nav").evaluate("el => el.classList.contains('is-open')")
    assert is_nav_open, "Primary nav did not open on mobile"
    print("  ✓ Mobile hamburger opened primary nav drawer")

    # Click a link inside mobile nav
    page.click("#primary-nav a[href='#r34']")
    page.wait_for_timeout(500)
    is_nav_closed = not page.locator("#primary-nav").evaluate("el => el.classList.contains('is-open')")
    assert is_nav_closed, "Primary nav did not close after clicking link"
    print("  ✓ Primary nav automatically closed after link click")
    qa_report["nav_tests"].append("Mobile menu open, click, close verified")

    # 4. Test Back to Top Button
    print("\n--- 4. TESTING BACK TO TOP BUTTON ---")
    page.set_viewport_size({"width": 1920, "height": 1080})
    page.evaluate("() => window.scrollTo(0, 1500)")
    page.wait_for_timeout(500)
    btt = page.locator("#back-to-top")
    is_btt_visible = btt.evaluate("el => el.classList.contains('is-visible')")
    print(f"Back to top visible at scroll 1500: {is_btt_visible}")
    if is_btt_visible:
        btt.click()
        page.wait_for_timeout(600)
        current_scroll = page.evaluate("() => window.scrollY")
        print(f"Scroll position after clicking Back to Top: {current_scroll}")
        assert current_scroll < 100, f"Scroll did not return to top (scrollY={current_scroll})"
        print("  ✓ Back to top scrolled smoothly to top")

    # 5. Test Horizontal Overflow Across ALL 9 Viewports
    print("\n--- 5. TESTING HORIZONTAL OVERFLOW ACROSS VIEWPORTS ---")
    overflow_failures = []
    for name, w, h in viewports:
        page.set_viewport_size({"width": w, "height": h})
        page.wait_for_timeout(300)
        scroll_w = page.evaluate("() => document.documentElement.scrollWidth")
        win_w = page.evaluate("() => window.innerWidth")
        has_overflow = scroll_w > win_w
        status = "FAIL (OVERFLOW)" if has_overflow else "PASS"
        print(f"  {name}: innerWidth={win_w}, scrollWidth={scroll_w} => [{status}]")
        qa_report["viewports_checked"].append((name, w, win_w, scroll_w, not has_overflow))
        if has_overflow:
            overflow_failures.append((name, w, scroll_w))

    assert len(overflow_failures) == 0, f"Horizontal overflow detected on: {overflow_failures}"

    # Take verification screenshots
    os.makedirs("screenshots", exist_ok=True)
    page.set_viewport_size({"width": 1920, "height": 1080})
    page.screenshot(path="screenshots/desktop_verified.png", full_page=False)
    page.set_viewport_size({"width": 390, "height": 844})
    page.screenshot(path="screenshots/mobile_verified.png", full_page=False)
    print("  ✓ Verification screenshots saved to screenshots/")

    browser.close()

print("\n==========================================")
print("             QA REPORT SUMMARY            ")
print("==========================================")
print(f"Drawers Tested: {len(qa_report['drawer_tests'])}")
for t in qa_report['drawer_tests']:
    print(f"  + {t}")
print(f"Navigation Tests: {len(qa_report['nav_tests'])}")
for t in qa_report['nav_tests']:
    print(f"  + {t}")
print(f"Viewports Tested for Overflow: {len(qa_report['viewports_checked'])}")
for name, w, win_w, scroll_w, passed in qa_report['viewports_checked']:
    print(f"  + {name}: {'PERFECT' if passed else 'FAILED'}")
print(f"Console Errors: {len(qa_report['console_errors'])}")
for err in qa_report['console_errors']:
    print(f"  ! {err}")
print(f"Failed Requests: {len(qa_report['failed_requests'])}")
for r in qa_report['failed_requests']:
    print(f"  x {r}")
print("==========================================")
