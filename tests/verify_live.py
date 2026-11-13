import sys
from playwright.sync_api import sync_playwright

if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')

LIVE_URL = "https://vibhorsxni.github.io/GTR-V2/"

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    page = browser.new_page(viewport={"width": 1440, "height": 900})
    
    errors = []
    page.on("console", lambda msg: errors.append(msg.text) if msg.type == "error" else None)
    
    print(f"Loading live URL: {LIVE_URL}")
    page.goto(LIVE_URL, wait_until="domcontentloaded")
    page.wait_for_selector("#loader.is-hidden", timeout=10000)
    print("[OK] Live site preloader dismissed")
    
    # Check title
    title = page.title()
    print(f"[OK] Live page title: {title}")
    
    # Check R32 drawer open on live site
    open_btn = page.locator("#r32-drawer-open")
    open_btn.scroll_into_view_if_needed()
    open_btn.click()
    page.wait_for_selector("#r32-drawer.is-open", timeout=3000)
    print("[OK] Live R32 drawer opened successfully")
    
    page.keyboard.press("Escape")
    page.wait_for_selector("#r32-drawer:not(.is-open)", timeout=3000)
    print("[OK] Live R32 drawer closed via Escape")
    
    browser.close()
    print("\n[PASS] Remote GitHub Pages live deployment verified successfully!")
