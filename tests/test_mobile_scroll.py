import sys
import time
import http.server
import socketserver
import threading
from playwright.sync_api import sync_playwright

if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')

PORT = 8092
DIRECTORY = "D:/Anti-Gravity/gtr v2"

class Handler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=DIRECTORY, **kwargs)
    def log_message(self, format, *args):
        pass

httpd = socketserver.TCPServer(("", PORT), Handler)
server_thread = threading.Thread(target=httpd.serve_forever, daemon=True)
server_thread.start()
print(f"Test server active on http://127.0.0.1:{PORT}")

with sync_playwright() as p:
    # -------------------------------------------------------------
    # Test 1: Mobile Touch Viewport (Pixel 7 / Android: 412x915)
    # -------------------------------------------------------------
    browser = p.chromium.launch(headless=True)
    context = browser.new_context(
        viewport={"width": 412, "height": 915},
        is_mobile=True,
        has_touch=True,
        user_agent="Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/116.0.0.0 Mobile Safari/537.36"
    )
    page = context.new_page()

    errors = []
    page.on("console", lambda msg: errors.append(msg.text) if msg.type == "error" else None)

    print("\n--- Testing Mobile Landing on Pixel 7 (412x915) ---")
    page.goto(f"http://127.0.0.1:{PORT}/index.html", wait_until="domcontentloaded")
    page.wait_for_selector("#loader.is-hidden", timeout=8000)

    # Verify hero 3D model iframe pointer-events is 'none' on mobile touch
    pointer_events = page.eval_on_selector(".hero-model iframe", "el => window.getComputedStyle(el).pointerEvents")
    print(f"[Mobile] .hero-model iframe pointer-events: {pointer_events}")
    assert pointer_events == "none", f"Expected pointer-events: none on mobile, got {pointer_events}"

    # Verify hero min-height is 1 screen on mobile (not 260vh)
    hero_height = page.eval_on_selector(".hero", "el => el.getBoundingClientRect().height")
    print(f"[Mobile] .hero height on 915px screen: {hero_height:.1f}px")
    assert hero_height <= 950, f"Expected mobile hero height around 915px, got {hero_height}"

    # Verify scroll to intro via scroll-hint click
    scroll_hint = page.locator(".hero__scroll-hint")
    scroll_hint.click()
    page.wait_for_timeout(1000)
    
    scroll_y = page.evaluate("() => window.scrollY")
    intro_top = page.eval_on_selector("#intro", "el => el.offsetTop")
    print(f"[Mobile] After clicking scroll hint: scrollY={scroll_y:.1f}px, introTop={intro_top:.1f}px")
    assert scroll_y > 400, f"Expected scrollY > 400, got {scroll_y}"

    # Reset to top
    page.evaluate("() => window.scrollTo(0, 0)")
    page.wait_for_timeout(500)

    # Test touch swipe up on hero
    print("[Mobile] Simulating touch swipe up on hero landing...")
    # Touch start at (200, 600) and move to (200, 300)
    page.touchscreen.tap(200, 600)
    # Perform swipe via mouse drag with touch simulation
    page.mouse.move(200, 600)
    page.mouse.down()
    page.mouse.move(200, 300, steps=10)
    page.mouse.up()
    page.wait_for_timeout(1000)

    scroll_after_swipe = page.evaluate("() => window.scrollY")
    print(f"[Mobile] scrollY after swipe gesture: {scroll_after_swipe:.1f}px")
    assert scroll_after_swipe > 400, f"Expected page to scroll to intro, got scrollY={scroll_after_swipe}"

    # -------------------------------------------------------------
    # Test 2: Desktop Viewport (1440x900) Remains Parallax
    # -------------------------------------------------------------
    print("\n--- Testing Desktop Viewport (1440x900) ---")
    desk_context = browser.new_context(viewport={"width": 1440, "height": 900})
    desk_page = desk_context.new_page()
    desk_page.goto(f"http://127.0.0.1:{PORT}/index.html", wait_until="domcontentloaded")
    desk_page.wait_for_selector("#loader.is-hidden", timeout=8000)

    desk_hero_height = desk_page.eval_on_selector(".hero", "el => el.getBoundingClientRect().height")
    print(f"[Desktop] .hero height on desktop: {desk_hero_height:.1f}px (expected ~2340px for 260vh)")
    assert desk_hero_height >= 2000, f"Expected desktop 260vh hero, got {desk_hero_height}"

    desk_pointer_events = desk_page.eval_on_selector(".hero-model iframe", "el => window.getComputedStyle(el).pointerEvents")
    print(f"[Desktop] .hero-model iframe pointer-events: {desk_pointer_events}")

    browser.close()
    httpd.shutdown()

    assert len(errors) == 0, f"Console errors detected: {errors}"
    print("\n[PASS] All mobile scroll and direct intro navigation tests passed successfully!")
