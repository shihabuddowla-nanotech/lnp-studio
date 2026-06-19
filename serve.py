#!/usr/bin/env python3
"""Tiny static server + Avanti scrape proxy for the LNP Formulation Studio PWA.

Serves the app over http://localhost so that ES modules, the service worker
and PWA install all work (file:// cannot do these). No third-party deps.

It also exposes one small JSON endpoint that the "Add custom lipid" modal calls
to auto-fill a lipid from an Avanti product page (direct browser scraping is
blocked by CORS, so the fetch + parse happen here, server-side):

    GET /api/fetch-lipid?url=<avanti product url>
        -> { ok, name, abbr, code, mw, formula, cls } | { ok:false, error }

Run:
    py -3 serve.py            # serves on port 8080 and opens the browser
    py -3 serve.py 9000       # custom port
"""
import http.server
import html as htmlmod
import json
import os
import re
import sys
import threading
import urllib.parse
import urllib.request
import webbrowser

# Port priority: explicit CLI arg > PORT env var (used by the preview tool) > 8080
if len(sys.argv) > 1:
    PORT = int(sys.argv[1])
    OPEN_BROWSER = True
elif os.environ.get('PORT'):
    PORT = int(os.environ['PORT'])
    OPEN_BROWSER = False  # launched by tooling; don't spawn a browser window
else:
    PORT = 8080
    OPEN_BROWSER = True
ROOT = os.path.dirname(os.path.abspath(__file__))
os.chdir(ROOT)

# Only these hosts may be proxied (prevents the endpoint being an open proxy / SSRF).
ALLOWED_HOSTS = {
    'avantiresearch.com', 'www.avantiresearch.com',
    'avantilipids.com', 'www.avantilipids.com',
}
UA = ('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 '
      '(KHTML, like Gecko) Chrome/124.0 Safari/537.36')


def guess_class(name, formula):
    s = (name + ' ' + formula).lower()
    if 'peg' in s or 'polyethylene glycol' in s or 'methoxypolyethylene' in s:
        return 'peg'
    if 'cholesterol' in s or 'sterol' in s:
        return 'cholesterol'
    if any(t in s for t in ('mc3', 'ionizable', 'dlin', 'klin', '-dma')):
        return 'ionizable'
    if any(t in s for t in ('trimethylammonium', 'dotap', 'dotma', 'ddab', 'ethylphospho')):
        return 'cationic'
    if any(t in s for t in ('rhod', 'nbd', 'bodipy', 'topfluor', 'dansyl', 'fluor', ' cy3', ' cy5')):
        return 'fluorescent'
    if any(t in s for t in ('phosphatidylglycerol', 'phosphatidylserine', 'phosphatidic',
                            ' pg ', ' ps ', ' pa ', '(sodium salt)')):
        return 'anionic'
    return 'helper'


def scrape_avanti(url):
    parsed = urllib.parse.urlparse(url)
    if parsed.scheme not in ('http', 'https') or (parsed.hostname or '').lower() not in ALLOWED_HOSTS:
        return {'ok': False, 'error': 'Only Avanti Research / Avanti Lipids product URLs are supported.'}

    req = urllib.request.Request(url, headers={'User-Agent': UA, 'Accept-Language': 'en'})
    with urllib.request.urlopen(req, timeout=20) as resp:
        page = resp.read().decode('utf-8', 'ignore')

    # --- name: prefer JSON-LD Product, fall back to <title> ---
    name = None
    m = re.search(r'<script type="application/ld\+json"[^>]*>(.*?)</script>', page, re.S)
    if m:
        try:
            data = json.loads(m.group(1))
            if isinstance(data, list):
                data = next((d for d in data if isinstance(d, dict) and d.get('@type') == 'Product'), data[0])
            if isinstance(data, dict):
                name = data.get('name')
        except Exception:
            pass
    if not name:
        t = re.search(r'<title[^>]*>(.*?)</title>', page, re.S)
        if t:
            name = t.group(1).split('|')[0]
    name = htmlmod.unescape(re.sub(r'\s+', ' ', name)).strip() if name else None

    # --- spec table: <td>label</td><td>value</td> pairs ---
    fields = {}
    for km in re.finditer(
            r'(?is)<td[^>]*>\s*([A-Za-z][A-Za-z0-9 /()\-.]{2,40}?)\s*</td>\s*<td[^>]*>\s*(.*?)\s*</td>', page):
        k = re.sub(r'\s+', ' ', km.group(1)).strip().lower()
        v = htmlmod.unescape(re.sub(r'\s+', ' ', re.sub(r'<[^>]+>', '', km.group(2)))).strip()
        if k and v and k not in fields:
            fields[k] = v

    # --- molecular weight (prefer Avanti's "formula weight") ---
    mw = None
    for key in ('formula weight', 'average mass', 'molecular weight', 'molar mass', 'exact mass'):
        if key in fields:
            mm = re.search(r'[0-9]+(?:\.[0-9]+)?', fields[key].replace(',', ''))
            if mm:
                val = float(mm.group(0))
                if 100 <= val <= 10000:
                    mw = val
                    break
    formula = fields.get('molecular formula')

    # --- product code from the URL ---
    code = None
    cm = re.search(r'/product/(\d{4,7})', url) or re.search(r'/(\d{6})(?:[-/]|$)', parsed.path)
    if cm:
        code = cm.group(1)

    # --- abbreviation: a parenthetical acronym in the name, else the name itself
    # (e.g. "POPC", "18:0 PG"), else the bare product code as a last resort ---
    abbr = None
    if name:
        pm = re.search(r'\(([A-Za-z0-9][A-Za-z0-9\-]{1,11})\)', name)
        if pm:
            abbr = pm.group(1)
    if not abbr:
        abbr = name or code

    return {
        'ok': True,
        'name': name,
        'abbr': abbr,
        'code': code,
        'mw': mw,
        'formula': formula,
        'cls': guess_class(name or '', formula or ''),
    }


class Handler(http.server.SimpleHTTPRequestHandler):
    extensions_map = {
        **http.server.SimpleHTTPRequestHandler.extensions_map,
        '.js': 'text/javascript',
        '.mjs': 'text/javascript',
        '.json': 'application/json',
        '.webmanifest': 'application/manifest+json',
        '.css': 'text/css',
        '.svg': 'image/svg+xml',
        '.png': 'image/png',
        '.wasm': 'application/wasm',
        '': 'application/octet-stream',
    }

    def do_GET(self):
        if self.path.startswith('/api/fetch-lipid'):
            return self.handle_fetch()
        return super().do_GET()

    def handle_fetch(self):
        try:
            query = urllib.parse.urlparse(self.path).query
            target = (urllib.parse.parse_qs(query).get('url') or [''])[0]
            if not target:
                result = {'ok': False, 'error': 'Missing url parameter.'}
            else:
                result = scrape_avanti(target)
        except Exception as exc:  # noqa: BLE001 - report any failure gracefully
            result = {'ok': False, 'error': 'Could not fetch the page (%s).' % exc.__class__.__name__}
        body = json.dumps(result).encode('utf-8')
        self.send_response(200)
        self.send_header('Content-Type', 'application/json; charset=utf-8')
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Content-Length', str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def end_headers(self):
        # Always revalidate so pushed updates show up on the next load (no SW cache).
        self.send_header('Cache-Control', 'no-cache')
        super().end_headers()

    def log_message(self, fmt, *args):  # quieter console
        sys.stderr.write('  %s\n' % (fmt % args))


def main():
    url = f'http://localhost:{PORT}/'
    print('=' * 56)
    print('  LNP / Liposome Formulation Studio')
    print(f'  Serving {ROOT}')
    print(f'  Open:  {url}')
    print('  Press Ctrl+C to stop.')
    print('=' * 56)
    if OPEN_BROWSER:
        threading.Timer(0.8, lambda: webbrowser.open(url)).start()
    # Bind all interfaces when hosted (a PaaS sets $PORT); localhost-only otherwise.
    host = '0.0.0.0' if os.environ.get('PORT') else '127.0.0.1'
    with http.server.ThreadingHTTPServer((host, PORT), Handler) as httpd:
        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            print('\nStopped.')


if __name__ == '__main__':
    main()
