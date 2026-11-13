import sys
import os
import http.server
import socketserver
import threading
from playwright.sync_api import sync_playwright

if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')

PORT = 8097
DIRECTORY = "D:/Anti-Gravity/gtr v2"
SCREENSHOT_DIR = "D:/Anti-Gravity/gtr v2/screenshots/mobile_debug"
os.makedirs(SCREENSHOT_DIR, exist_ok=True)

class Handler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=DIRECTORY, **kwargs)
    def log_message(self, format, *args):
        pass

httpd = socketserver.TCPServer(("", PORT), Handler)
server_thread = threading.Thread(target=httpd.serve_forever, daemon=True)
server_thread.start()

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    context = browser.new_context(
        viewport={"width": 390, "height": 844},
        device_scale_factor=2,
        is_mobile=True,
        has_touch=True
    )
    page = context.new_page()

    page.goto(f"http://127.0.0.1:{PORT}/index.html", wait_until="domcontentloaded")
    page.wait_for_selector("#loader.is-hidden", state="attached", timeout=8000)
    page.wait_for_timeout(1000)

    # 1. Hero
    page.screenshot(path=f"{SCREENSHOT_DIR}/01_hero.png")

    # 2. Open Mobile Menu
    page.click("#nav-toggle")
    page.wait_for_timeout(600)
    page.screenshot(path=f"{SCREENSHOT_DIR}/02_mobile_menu.png")
    # Close mobile menu
    page.click("#nav-toggle")
    page.wait_for_timeout(400)

    # 3. Intro
    page.eval_on_selector("#intro", "el => el.scrollIntoView()")
    page.wait_for_timeout(600)
    page.screenshot(path=f"{SCREENSHOT_DIR}/03_intro.png")

    # 4. R32
    page.eval_on_selector("#r32", "el => el.scrollIntoView()")
    page.wait_for_timeout(600)
    page.screenshot(path=f"{SCREENSHOT_DIR}/04_r32.png")

    # 5. R33
    page.eval_on_selector("#r33", "el => el.scrollIntoView()")
    page.wait_for_timeout(600)
    page.screenshot(path=f"{SCREENSHOT_DIR}/07_r33.png")

    # 6. R34
    page.eval_on_selector("#r34", "el => el.scrollIntoView()")
    page.wait_for_timeout(600)
    page.screenshot(path=f"{SCREENSHOT_DIR}/08_r34.png")

    # 7. R35
    page.eval_on_selector("#r35", "el => el.scrollIntoView()")
    page.wait_for_timeout(600)
    page.screenshot(path=f"{SCREENSHOT_DIR}/09_r35.png")

    # 8. Timeline
    page.eval_on_selector("#timeline", "el => el.scrollIntoView()")
    page.wait_for_timeout(600)
    page.screenshot(path=f"{SCREENSHOT_DIR}/10_timeline.png")

    # 9. Quote / Record
    page.eval_on_selector(".quote", "el => el.scrollIntoView()")
    page.wait_for_timeout(600)
    page.screenshot(path=f"{SCREENSHOT_DIR}/10b_quote.png")

    # 10. Finale
    page.eval_on_selector("#finale", "el => el.scrollIntoView()")
    page.wait_for_timeout(600)
    page.screenshot(path=f"{SCREENSHOT_DIR}/11_finale.png")

    # 11. Drawer R32 opened
    page.eval_on_selector("#r32", "el => el.scrollIntoView()")
    page.click("#r32-drawer-open")
    page.wait_for_timeout(800)
    page.screenshot(path=f"{SCREENSHOT_DIR}/05_r32_drawer_top.png")

    page.eval_on_selector(".r32-drawer__panel", "el => el.scrollTo(0, 500)")
    page.wait_for_timeout(500)
    page.screenshot(path=f"{SCREENSHOT_DIR}/06_r32_drawer_briefing.png")

    browser.close()
    httpd.shutdown()
    print("All screenshots captured!")
