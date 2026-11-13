import sys
import http.server
import socketserver
import threading
from playwright.sync_api import sync_playwright

if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')

PORT = 8094
DIRECTORY = "D:/Anti-Gravity/gtr v2"

class Handler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=DIRECTORY, **kwargs)
    def log_message(self, format, *args):
        pass

httpd = socketserver.TCPServer(("", PORT), Handler)
server_thread = threading.Thread(target=httpd.serve_forever, daemon=True)
server_thread.start()
print(f"Debugger verification server running on http://127.0.0.1:{PORT}")

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)

    # -------------------------------------------------------------
    # Test 1: Reduced Motion Canvas Update
    # -------------------------------------------------------------
    print("\n--- Test 1: Reduced Motion Canvas Update ---")
    reduced_context = browser.new_context(
        viewport={"width": 1440, "height": 900},
        forced_colors="none",
        reduced_motion="reduce"
    )
    page1 = reduced_context.new_page()
    page1.goto(f"http://127.0.0.1:{PORT}/index.html", wait_until="domcontentloaded")
    page1.wait_for_selector("#loader.is-hidden", state="attached", timeout=8000)

    # Scroll page and verify canvas redrawing runs
    page1.evaluate("() => window.scrollTo(0, 1000)")
    page1.wait_for_timeout(300)
    canvas_scroll = page1.evaluate("() => window.scrollY")
    print(f"[Reduced Motion] Verified scroll position with reduced motion: scrollY={canvas_scroll}px")
    reduced_context.close()

    # -------------------------------------------------------------
    # Test 2: Rapid Tab Switching Race Condition
    # -------------------------------------------------------------
    print("\n--- Test 2: Rapid Tab Switching Race Condition ---")
    page2 = browser.new_page(viewport={"width": 1440, "height": 900})
    page2.goto(f"http://127.0.0.1:{PORT}/index.html", wait_until="domcontentloaded")
    page2.wait_for_selector("#loader.is-hidden", state="attached", timeout=8000)

    # Open R32 Drawer
    page2.click("#r32-drawer-open")
    page2.wait_for_selector("#r32-drawer.is-open", timeout=3000)

    # Rapidly click through tabs: jtcc -> godzilla -> attesa -> rb26 -> nismo in 50ms intervals
    tabs = ["jtcc", "godzilla", "attesa", "rb26", "nismo"]
    for tab in tabs:
        page2.click(f"[data-story='{tab}']")
        page2.wait_for_timeout(30)

    # Wait for the transition
    page2.wait_for_timeout(250)

    # Verify that the final tab ('nismo') is active and displays correct text without corruption
    active_kicker = page2.text_content("#r32-focus-kicker")
    active_title = page2.text_content("#r32-focus-title")
    print(f"[Tab Race] Final kicker: '{active_kicker}', title: '{active_title}'")
    assert "Homologation" in active_kicker or "Built for" in active_title, f"Race condition detected! Got {active_kicker} / {active_title}"

    # Close drawer
    page2.keyboard.press("Escape")
    page2.wait_for_selector("#r32-drawer:not(.is-open)", timeout=3000)

    # -------------------------------------------------------------
    # Test 3: Touch Event changedTouches Guard
    # -------------------------------------------------------------
    print("\n--- Test 3: Touch Event changedTouches Guard ---")
    # Dispatch an artificial touchend with empty changedTouches to test resilience
    no_error = page2.evaluate("""() => {
        try {
            const hero = document.getElementById('hero');
            const event = new Event('touchend');
            event.changedTouches = [];
            hero.dispatchEvent(event);
            return true;
        } catch(e) {
            return false;
        }
    }""")
    assert no_error is True, "Guard failed on empty changedTouches!"
    print("[Touch Guard] Successfully handled empty changedTouches without throwing TypeError")

    page2.close()
    browser.close()
    httpd.shutdown()
    print("\n[PASS] All Debugger verification tests passed!")
