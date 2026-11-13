import re
import os

patterns = [r'src=["\']([^"\']+)["\']', r'href=["\']([^"\']+\.(?:png|jpg|jpeg|svg|mp4|webm|css|js))["\']', r'url\(["\']?([^"\'\)]+)["\']?\)']
files = ['index.html', 'credits.html', 'css/styles.css']

missing = []
found = []
for fpath in files:
    with open(fpath, 'r', encoding='utf-8') as f:
        text = f.read()
    for p in patterns:
        for match in re.findall(p, text):
            if match.startswith('http') or match.startswith('data:') or match.startswith('#') or 'fonts.googleapis' in match:
                continue
            clean = match.split('?')[0].split('#')[0]
            base_dir = os.path.dirname(fpath)
            target = os.path.normpath(os.path.join(base_dir, clean))
            if not os.path.exists(target):
                missing.append((fpath, match, target))
            else:
                found.append((fpath, match, target))

print(f"Verified {len(found)} assets.")
if missing:
    print("MISSING ASSETS:")
    for m in missing:
        print(f"  In {m[0]}: {m[1]} -> {m[2]}")
else:
    print("Zero missing assets!")
