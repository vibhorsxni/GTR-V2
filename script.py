import re

# 1. Update styles.css
css_path = r'D:\Anti-Gravity\Project GTR\css\styles.css'
with open(css_path, 'r', encoding='utf-8') as f:
    css_content = f.read()

# Find all blocks containing .r33-
# A CSS rule roughly matches: selector { ... }
# We can use a regex to find all rules that have .r33- in their selector
rules = re.findall(r'([^{}]*\.r33-[^{]*{[^{}]*})', css_content)
r34_rules = [rule.replace('.r33-', '.r34-') for rule in rules]

with open(css_path, 'a', encoding='utf-8') as f:
    f.write('\n\n/* R34 DRAWER STYLES */\n\n')
    f.write('\n\n'.join(r34_rules))

# 2. Update main.js
js_path = r'D:\Anti-Gravity\Project GTR\js\main.js'
with open(js_path, 'r', encoding='utf-8') as f:
    js_content = f.read()

r34_js = '''
(function initR34Drawer() {
  const drawer = document.getElementById("r34-drawer");
  const openBtn = document.getElementById("r34-drawer-open");
  const backdrop = document.getElementById("r34-drawer-backdrop");
  const scrollContainer = document.getElementById("r34-drawer-content");
  const panel = drawer?.querySelector(".r34-drawer__panel");
  const closeButtons = drawer?.querySelectorAll(".r34-drawer__close") || [];

  if (!drawer || !openBtn || !backdrop || !scrollContainer || !panel) {
    return;
  }

  let drawerObserver = null;

  function openDrawer() {
    drawer.classList.add("is-open");
    drawer.setAttribute("aria-hidden", "false");
    document.body.style.overflow = "hidden";
    panel.scrollTop = 0;
    setupDrawerReveals();
  }

  function closeDrawer() {
    drawer.classList.remove("is-open");
    drawer.setAttribute("aria-hidden", "true");
    document.body.style.overflow = "";
    resetDrawerReveals();
  }

  function setupDrawerReveals() {
    if (drawerObserver) {
      drawerObserver.disconnect();
    }

    drawerObserver = new IntersectionObserver(
      entries => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-visible");
          }
        });
      },
      {
        root: panel,
        threshold: 0.12,
      }
    );

    scrollContainer.querySelectorAll(".r34-reveal").forEach(el => {
      drawerObserver.observe(el);
    });
  }

  function resetDrawerReveals() {
    if (drawerObserver) {
      drawerObserver.disconnect();
      drawerObserver = null;
    }

    scrollContainer.querySelectorAll(".r34-reveal").forEach(el => {
      el.classList.remove("is-visible");
    });
  }

  openBtn.addEventListener("click", openDrawer);
  closeButtons.forEach(button => button.addEventListener("click", closeDrawer));
  backdrop.addEventListener("click", closeDrawer);

  document.addEventListener("keydown", event => {
    if (event.key === "Escape" && drawer.classList.contains("is-open")) {
      closeDrawer();
    }
  });

  const stories = {
    tech: {
      kicker: "Advanced Tech",
      title: "5.8-inch MFD.",
      copy: "The R34 introduced a 5.8-inch multifunction display (MFD) developed with gaming expertise, showing turbo boost, oil temp, water temp, and lap timing. Very futuristic for 1999.",
      stat: "5.8\"",
      label: "Multifunction Display"
    },
    variants: {
      kicker: "V-Spec",
      title: "Famous Variants.",
      copy: "The V-Spec offered better suspension tuning and track focus. The V-Spec II introduced a carbon fiber hood with NACA duct and further chassis refinements.",
      stat: "AWD",
      label: "ATTESA E-TS Pro"
    },
    nur: {
      kicker: "Nür Editions",
      title: "The Ultimate R34.",
      copy: "The M-Spec Nür and V-Spec II Nür were the final special editions honoring the Nürburgring testing heritage. Only 1000 Nür editions were built, making them extremely collectible.",
      stat: "1000",
      label: "Nür Editions Built"
    },
    popculture: {
      kicker: "Godzilla Returns",
      title: "Pop Culture Icon.",
      copy: "The R34 became globally legendary through games like Gran Turismo and Need for Speed, and movies like Fast & Furious with Paul Walker.",
      stat: "Icon",
      label: "Global Legacy"
    }
  };

  const storyButtons = scrollContainer.querySelectorAll("[data-story]");
  const focusKicker = document.getElementById("r34-focus-kicker");
  const focusTitle = document.getElementById("r34-focus-title");
  const focusCopy = document.getElementById("r34-focus-copy");
  const focusStat = document.getElementById("r34-focus-stat");
  const focusLabel = document.getElementById("r34-focus-label");

  function selectStory(storyKey) {
    const story = stories[storyKey];

    if (!story || !focusKicker || !focusTitle || !focusCopy || !focusStat || !focusLabel) {
      return;
    }

    focusKicker.textContent = story.kicker;
    focusTitle.textContent = story.title;
    focusCopy.textContent = story.copy;
    focusStat.textContent = story.stat;
    focusLabel.textContent = story.label;

    storyButtons.forEach(button => {
      const isActive = button.dataset.story === storyKey;
      button.classList.toggle("is-active", isActive);
      button.setAttribute("aria-selected", String(isActive));
    });
  }

  storyButtons.forEach(button => {
    button.addEventListener("click", () => selectStory(button.dataset.story));
  });
})();
'''

with open(js_path, 'a', encoding='utf-8') as f:
    f.write('\n' + r34_js)

print(f"Added {len(r34_rules)} CSS rules and initR34Drawer function.")
