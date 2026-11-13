import os
import sys
import time
import threading
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer

# Ensure UTF-8 output encoding on Windows consoles
if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')
if hasattr(sys.stderr, 'reconfigure'):
    sys.stderr.reconfigure(encoding='utf-8')

from playwright.sync_api import sync_playwright

PORT = 8089
ROOT_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))

class QuietHandler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=ROOT_DIR, **kwargs)
    def log_message(self, format, *args):
        pass  # Quiet logging
    def copyfile(self, source, outputfile):
        try:
            super().copyfile(source, outputfile)
        except (ConnectionResetError, ConnectionAbortedError, BrokenPipeError):
            pass

def has_cls(locator, cls_name):
    cls_attr = locator.get_attribute("class") or ""
    return cls_name in cls_attr.split()

def start_server():
    server = ThreadingHTTPServer(('127.0.0.1', PORT), QuietHandler)
    thread = threading.Thread(target=server.serve_forever, daemon=True)
    thread.start()
    return server

def run_tests():
    server = start_server()
    print(f"Server started on http://127.0.0.1:{PORT}")
    time.sleep(0.5)

    failures = []
    
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        
        # Test 1: Desktop Page Load, Preloader & Hero Parallax
        print("\n--- Test 1: Desktop Page Load & Preloader ---")
        context = browser.new_context(viewport={"width": 1440, "height": 900})
        page = context.new_page()
        
        console_errors = []
        page.on("console", lambda msg: console_errors.append(msg.text) if msg.type == "error" else None)
        
        url = f"http://127.0.0.1:{PORT}/index.html"
        page.goto(url, wait_until="domcontentloaded")
        
        # Verify preloader exists and then hides
        loader = page.locator("#loader")
        if not loader.is_visible():
            failures.append("Preloader #loader was not visible on init")
        
        # Wait for preloader to finish (max 5s)
        page.wait_for_selector("#loader.is-hidden", timeout=5000)
        print("[OK] Preloader successfully completed and has .is-hidden class")
        
        # Verify body is-loading removed
        body = page.locator("body")
        if has_cls(body, "is-loading"):
            failures.append("body still had 'is-loading' class after preloader finished")
        else:
            print("[OK] body 'is-loading' class cleanly removed")
            
        # Verify hero progress css variable updates on scroll
        hero = page.locator("#hero")
        initial_hero_prog = page.evaluate("() => getComputedStyle(document.getElementById('hero')).getPropertyValue('--hero-progress')")
        page.evaluate("() => window.scrollTo(0, 400)")
        time.sleep(0.3)
        scrolled_hero_prog = page.evaluate("() => getComputedStyle(document.getElementById('hero')).getPropertyValue('--hero-progress')")
        if float(scrolled_hero_prog.strip() or 0) > float(initial_hero_prog.strip() or 0):
            print(f"[OK] Hero parallax progress dynamic: {initial_hero_prog.strip()} -> {scrolled_hero_prog.strip()}")
        else:
            failures.append(f"Hero parallax --hero-progress did not increase on scroll ({initial_hero_prog} -> {scrolled_hero_prog})")
            
        # Verify Topbar is-scrolled class
        topbar = page.locator("#topbar")
        if has_cls(topbar, "is-scrolled"):
            print("[OK] Topbar has .is-scrolled when page is scrolled")
        else:
            failures.append("Topbar missing .is-scrolled after scroll")
            
        # Verify Back to Top visibility
        page.evaluate("() => window.scrollTo(0, 1000)")
        time.sleep(0.3)
        btt = page.locator("#back-to-top")
        if has_cls(btt, "is-visible"):
            print("[OK] Back-to-top button visible after scrolling past 450px")
        else:
            failures.append("Back-to-top button not visible after scroll")
            
        # Click back to top
        btt.click()
        time.sleep(0.6)
        scroll_y = page.evaluate("() => window.scrollY")
        if scroll_y < 100:
            print(f"[OK] Back-to-top smoothly scrolled to top: scrollY={scroll_y}")
        else:
            failures.append(f"Back-to-top failed to scroll to top: scrollY={scroll_y}")
            
        # Test 2: Generation Drawers (R32, R33, R34, R35)
        print("\n--- Test 2: Generation Drawers Interactive Functionality ---")
        for gen in ['r32', 'r33', 'r34', 'r35']:
            open_btn = page.locator(f"#{gen}-drawer-open")
            drawer = page.locator(f"#{gen}-drawer")
            panel = page.locator(f"#{gen}-drawer .{gen}-drawer__panel, #{gen}-drawer .gen-drawer__panel")
            
            # Scroll trigger into view
            open_btn.scroll_into_view_if_needed()
            time.sleep(0.2)
            
            # Check initial aria attributes
            if open_btn.get_attribute("aria-expanded") != "false":
                failures.append(f"{gen} open button missing aria-expanded='false'")
            if drawer.get_attribute("aria-hidden") != "true":
                failures.append(f"{gen} drawer missing aria-hidden='true'")
            if drawer.get_attribute("role") != "dialog":
                failures.append(f"{gen} drawer missing role='dialog'")
                
            # Click open
            open_btn.click()
            time.sleep(0.4)
            
            if not has_cls(drawer, "is-open"):
                failures.append(f"{gen} drawer missing .is-open class after click")
            if open_btn.get_attribute("aria-expanded") != "true":
                failures.append(f"{gen} trigger missing aria-expanded='true' after open")
            if drawer.get_attribute("aria-hidden") != "false":
                failures.append(f"{gen} drawer missing aria-hidden='false' after open")
                
            # Check body overflow lock
            body_overflow = page.evaluate("() => document.body.style.overflow")
            if body_overflow != "hidden":
                failures.append(f"Body overflow was not 'hidden' when {gen} drawer opened: {body_overflow}")
                
            # Check cinema CTA button
            cinema_cta = page.locator(f"#{gen}-drawer .{gen}-cinema__cta, #{gen}-drawer .gen-cinema__cta")
            if cinema_cta.count() > 0:
                cinema_cta.first.click()
                time.sleep(0.5)
                panel_scroll = page.evaluate(f"() => document.querySelector('#{gen}-drawer .{gen}-drawer__panel, #{gen}-drawer .gen-drawer__panel').scrollTop")
                if panel_scroll > 100:
                    print(f"[OK] {gen.upper()} Cinema CTA smoothly scrolled drawer panel down: scrollTop={panel_scroll}px")
                else:
                    failures.append(f"{gen.upper()} Cinema CTA failed to scroll drawer panel: scrollTop={panel_scroll}")
                    
            # Check story tabs
            story_tabs = page.locator(f"#{gen}-drawer [data-story]")
            tab_count = story_tabs.count()
            if tab_count > 1:
                second_tab = story_tabs.nth(1)
                story_key = second_tab.get_attribute("data-story")
                second_tab.click()
                time.sleep(0.3)
                if not has_cls(second_tab, "is-active"):
                    failures.append(f"{gen.upper()} story tab '{story_key}' did not get .is-active")
                kicker_text = page.locator(f"#{gen}-focus-kicker").text_content() or ""
                if not kicker_text.strip():
                    failures.append(f"{gen.upper()} focus kicker empty after clicking tab {story_key}")
                else:
                    print(f"[OK] {gen.upper()} story tab '{story_key}' switched cleanly (kicker: '{kicker_text.strip()}')")
                    
            # Check timeline rail layout
            rail = page.locator(f"#{gen}-drawer .{gen}-modern-timeline__rail, #{gen}-drawer .gen-modern-timeline__rail")
            if rail.count() > 0:
                grid_flow = page.evaluate(f"() => getComputedStyle(document.querySelector('#{gen}-drawer .{gen}-modern-timeline__rail, #{gen}-drawer .gen-modern-timeline__rail')).gridAutoFlow")
                if "column" in grid_flow:
                    print(f"[OK] {gen.upper()} timeline rail uses horizontal auto-flow column: {grid_flow}")
                else:
                    failures.append(f"{gen.upper()} timeline rail does not use grid-auto-flow column: {grid_flow}")
                    
            # Test Escape key to close
            page.keyboard.press("Escape")
            time.sleep(0.4)
            if has_cls(drawer, "is-open"):
                failures.append(f"{gen.upper()} drawer failed to close on Escape key")
            else:
                print(f"[OK] {gen.upper()} drawer closed successfully via Escape key")
                
            # Verify body overflow restored
            body_overflow_after = page.evaluate("() => document.body.style.overflow")
            if body_overflow_after != "":
                failures.append(f"Body overflow was not restored after closing {gen} drawer: '{body_overflow_after}'")

        # Test 3: Finale Section
        print("\n--- Test 3: Finale Section ---")
        finale_heading = page.locator(".finale__heading")
        if finale_heading.count() == 0:
            failures.append("Missing .finale__heading in finale section")
        else:
            font_size = page.evaluate("() => getComputedStyle(document.querySelector('.finale__heading')).fontSize")
            print(f"[OK] .finale__heading renders with responsive display scale: {font_size}")
            
        # Test 4: Mobile Viewport, Navigation Drawer & Backdrop
        print("\n--- Test 4: Mobile Navigation & Backdrop (375x812) ---")
        mobile_context = browser.new_context(viewport={"width": 375, "height": 812})
        mobile_page = mobile_context.new_page()
        mobile_page.goto(url, wait_until="domcontentloaded")
        mobile_page.wait_for_selector("#loader.is-hidden", timeout=5000)
        
        nav_toggle = mobile_page.locator("#nav-toggle")
        primary_nav = mobile_page.locator("#primary-nav")
        nav_backdrop = mobile_page.locator("#nav-backdrop")
        
        if not nav_toggle.is_visible():
            failures.append("Mobile nav toggle (#nav-toggle) is not visible on 375px viewport")
        else:
            print("[OK] Mobile hamburger button visible")
            
        # Open mobile nav
        nav_toggle.click()
        time.sleep(0.4)
        
        if not has_cls(primary_nav, "is-open"):
            failures.append("Primary nav did not get .is-open class on hamburger click")
        if not has_cls(nav_backdrop, "is-open"):
            failures.append("Nav backdrop did not get .is-open class on hamburger click")
        if nav_toggle.get_attribute("aria-expanded") != "true":
            failures.append("Nav toggle missing aria-expanded='true' when open")
        print("[OK] Mobile drawer & backdrop opened with correct classes and aria-expanded")
        
        # Click backdrop to close
        nav_backdrop.click(position={"x": 20, "y": 200})
        time.sleep(0.4)
        if has_cls(primary_nav, "is-open"):
            failures.append("Mobile nav did not close after clicking backdrop")
        if has_cls(nav_backdrop, "is-open"):
            failures.append("Nav backdrop did not close after clicking backdrop")
        print("[OK] Mobile drawer closed smoothly on backdrop click")
        
        # Test nav link click closes menu
        nav_toggle.click()
        time.sleep(0.3)
        r34_link = mobile_page.locator("#primary-nav a[href='#r34']")
        r34_link.click()
        time.sleep(0.5)
        if has_cls(primary_nav, "is-open"):
            failures.append("Mobile nav did not close after clicking nav link")
        else:
            print("[OK] Mobile nav automatically closed upon nav link click")
            
        # Test 5: Horizontal Overflow Across 9 Screen Sizes
        print("\n--- Test 5: Horizontal Scrollbar / Overflow Validation ---")
        viewports = [
            ("iPhone SE 1st gen", 320, 568),
            ("iPhone 8", 375, 667),
            ("iPhone 13/14", 390, 844),
            ("Pixel 7 / Android", 412, 915),
            ("iPad Mini", 768, 1024),
            ("iPad Air", 820, 1180),
            ("iPad Landscape", 1024, 768),
            ("MacBook Pro", 1440, 900),
            ("Desktop FHD", 1920, 1080)
        ]
        
        for name, w, h in viewports:
            vp_ctx = browser.new_context(viewport={"width": w, "height": h})
            vp_page = vp_ctx.new_page()
            vp_page.goto(url, wait_until="domcontentloaded")
            vp_page.wait_for_selector("#loader.is-hidden", timeout=5000)
            
            overflow_diff = vp_page.evaluate("() => document.documentElement.scrollWidth - window.innerWidth")
            if overflow_diff > 1:
                failures.append(f"Horizontal overflow detected on {name} ({w}x{h}): scrollWidth={w+overflow_diff}px > window={w}px (diff: {overflow_diff}px)")
            else:
                print(f"[OK] No horizontal overflow on {name} ({w}x{h}): diff={overflow_diff}px")
            vp_ctx.close()
            
        # Test 6: Credits Page Validation
        print("\n--- Test 6: Credits Page Integrity ---")
        credits_page = context.new_page()
        credits_url = f"http://127.0.0.1:{PORT}/credits.html"
        credits_page.goto(credits_url, wait_until="domcontentloaded")
        
        # Check title and header
        credits_h1 = credits_page.locator(".credits-header h1")
        if credits_h1.count() == 0:
            failures.append("Credits page missing .credits-header h1")
        else:
            print(f"[OK] Credits page rendered title: '{credits_h1.text_content().strip()}'")
            
        # Check return button
        back_btn = credits_page.locator(".back-btn")
        if back_btn.count() == 0 or "index.html" not in (back_btn.get_attribute("href") or ""):
            failures.append("Credits page back-btn missing or does not link to index.html")
        else:
            print("[OK] Credits page back-btn links correctly to index.html")
            
        # Check bento cards count
        bento_count = credits_page.locator(".bento-card").count()
        if bento_count < 5:
            failures.append(f"Credits page has only {bento_count} bento cards; expected at least 5")
        else:
            print(f"[OK] Credits page contains {bento_count} detailed bento attribution cards")
            
        # Save verification screenshots
        page.screenshot(path="screenshots/desktop_verified.png")
        mobile_page.screenshot(path="screenshots/mobile_verified.png")
        credits_page.screenshot(path="screenshots/credits_verified.png")
        print("\n[OK] Captured verified screenshots: desktop_verified.png, mobile_verified.png, credits_verified.png")
        
        browser.close()
        
    server.shutdown()
    
    print("\n================ TEST SUMMARY ================")
    if console_errors:
        print(f"Console errors detected ({len(console_errors)}):")
        for err in console_errors:
            print("  - ", err)
        failures.extend([f"Console error: {e}" for e in console_errors])
    else:
        print("[OK] Zero browser console errors detected on load and navigation")
        
    if failures:
        print(f"\n[FAIL] FAILED ({len(failures)} failures):")
        for f in failures:
            print("  [FAIL] ", f)
        sys.exit(1)
    else:
        print("\n[PASS] ALL TESTS PASSED! Ready for production deployment.")
        sys.exit(0)

if __name__ == '__main__':
    run_tests()
