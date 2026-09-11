#!/usr/bin/env python3
"""Rebuild and run real Chromium simulation checks.
Requires: pip install playwright; playwright install chromium
Optional: CHROMIUM=/path/to/chromium python3 tests/run.py
No HTTP server, Internet access or test-only engine is used.
"""
from __future__ import annotations
import datetime as dt
import hashlib
import json
import os
from pathlib import Path
import subprocess
import sys
from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'test-results'

def main() -> int:
    subprocess.run([sys.executable, str(ROOT / 'tools/build.py')], check=True)
    OUT.mkdir(exist_ok=True)
    html = (ROOT / 'dist/street-fighter-6-atelier.html').read_text(encoding='utf-8')
    errors: list[str] = []
    with sync_playwright() as p:
        options = {'headless': True}
        if os.environ.get('CHROMIUM'):
            options['executable_path'] = os.environ['CHROMIUM']
        browser = p.chromium.launch(**options)
        try:
            page = browser.new_page(viewport={'width': 1440, 'height': 1000})
            page.on('pageerror', lambda error: errors.append(str(error)))
            page.set_content(html, wait_until='load')
            mechanics = page.evaluate((ROOT / 'tests/mechanics.js').read_text(encoding='utf-8'))
            replays = page.evaluate((ROOT / 'tests/replays.js').read_text(encoding='utf-8'))
            failed_mechanics = [t for t in mechanics if not t.get('pass')]
            failed_replays = [t for t in replays if not all(t.get(k) for k in ('started', 'finite', 'validSVG'))]
            report = {
                'timeUTC': dt.datetime.now(dt.timezone.utc).isoformat(),
                'browser': browser.version,
                'htmlSHA256': hashlib.sha256(html.encode('utf-8')).hexdigest(),
                'scope': 'mechanics scenarios and every move startup/full simulation/SVG validity; not an official-frame-data or visual-perfection certification',
                'mechanicsPassed': len(mechanics) - len(failed_mechanics),
                'mechanicsTotal': len(mechanics),
                'replaysPassed': len(replays) - len(failed_replays),
                'replaysTotal': len(replays),
                'browserErrors': errors,
                'mechanics': mechanics,
                'replays': replays,
            }
            (OUT / 'report.json').write_text(json.dumps(report, ensure_ascii=False, indent=2), encoding='utf-8')
            print(f"Mechanics: {report['mechanicsPassed']}/{len(mechanics)}; move replays: {report['replaysPassed']}/{len(replays)}; browser errors: {len(errors)}")
            print(f'Report: {OUT / "report.json"}')
            return int(bool(failed_mechanics or failed_replays or errors))
        finally:
            browser.close()

if __name__ == '__main__':
    raise SystemExit(main())
