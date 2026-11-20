#!/usr/bin/env python3
"""Prepare the REG.RU release without changing the GitHub Pages demo files."""
import argparse
import hashlib
import json
import re
import shutil
import subprocess
import zipfile
from pathlib import Path
from xml.etree.ElementTree import Element, SubElement, ElementTree

ROOT = Path(__file__).resolve().parents[1]
DOMAIN = 'www.кавергруппачелябинск.рф'.encode('idna').decode('ascii')
ORIGIN = 'https://' + DOMAIN
DEMO = 'https://dunshaar.github.io/demowebsite/'
PAGES = ('index.html', 'brend.html', 'mybach.html',
         'brend-repertoire.html', 'mybach-repertoire.html')
ROOT_FILES = (*PAGES, 'styles.css', 'repertoire.css', 'app.js', '.nojekyll')


def git(*args):
    return subprocess.check_output(['git', '-C', str(ROOT), *args], text=True).strip()


def page_url(name):
    return ORIGIN + '/' + ('' if name == 'index.html' else name)


def render_html(name, source, indexable):
    # Keep all public content and handlers byte-for-byte; transform the head only.
    head, body = source.split('</head>', 1)
    assert re.search(r'<meta name="robots" content="noindex,nofollow">', head), name
    robots = 'index,follow' if indexable else 'noindex,nofollow'
    head = head.replace('<meta name="robots" content="noindex,nofollow">',
                        f'<meta name="robots" content="{robots}">')
    head = head.replace(DEMO, ORIGIN + '/')
    head = head.replace(f'property="og:url" content="{ORIGIN}/index.html"',
                        f'property="og:url" content="{ORIGIN}/"')
    head = re.sub(r'<link\b[^>]*\brel=[\"\']canonical[\"\'][^>]*>', '', head)
    head += f'<link rel="canonical" href="{page_url(name)}">'
    result = head + '</head>' + body
    assert '/demowebsite/' not in result and 'dunshaar.github.io' not in result, name
    assert result.split('</head>', 1)[1] == body
    return result


def build(indexable):
    phase = 'live' if indexable else 'staging'
    release = ROOT / 'dist' / 'reg-ru' / phase
    public = release / 'site'
    if public.exists():
        raise SystemExit(f'Release already exists: {public}. Keep it for rollback; move it before rebuilding.')
    public.mkdir(parents=True)
    assets = git('ls-files', '--', 'assets/').splitlines()
    assert assets and all(p.startswith('assets/') for p in assets)
    files = [*ROOT_FILES, *assets]
    for name in files:
        source = ROOT / name
        assert source.is_file() and not source.is_symlink(), name
        target = public / name
        target.parent.mkdir(parents=True, exist_ok=True)
        if name in PAGES:
            target.write_text(render_html(name, source.read_text(), indexable), encoding='utf-8')
        else:
            shutil.copy2(source, target)
    for name, count in [('brend-repertoire.html', 63), ('mybach-repertoire.html', 71)]:
        assert (public / name).read_text().count('data-song-id=') == count
    directive = 'Allow: /' if indexable else 'Disallow: /'
    (public / 'robots.txt').write_text(f'User-agent: *\n{directive}\n\nSitemap: {ORIGIN}/sitemap.xml\n')
    sitemap = Element('urlset', xmlns='http://www.sitemaps.org/schemas/sitemap/0.9')
    for name in PAGES:
        SubElement(SubElement(sitemap, 'url'), 'loc').text = page_url(name)
    ElementTree(sitemap).write(public / 'sitemap.xml', encoding='utf-8', xml_declaration=True)
    entries = []
    for path in sorted(public.rglob('*')):
        if path.is_file():
            data = path.read_bytes()
            entries.append({'path': path.relative_to(public).as_posix(),
                            'bytes': len(data), 'sha256': hashlib.sha256(data).hexdigest()})
    manifest = {'source_commit': git('rev-parse', 'HEAD'), 'origin': ORIGIN,
                'indexable': indexable, 'files': entries}
    (release / 'manifest.json').write_text(json.dumps(manifest, ensure_ascii=False, indent=2))
    with zipfile.ZipFile(release / f'reg-ru-{phase}.zip', 'w', zipfile.ZIP_DEFLATED) as archive:
        for entry in entries:
            archive.write(public / entry['path'], entry['path'])
    # The final indexing switch needs only these small files after staging has passed.
    with zipfile.ZipFile(release / f'reg-ru-{phase}-pages.zip', 'w', zipfile.ZIP_DEFLATED) as archive:
        for name in (*PAGES, 'robots.txt', 'sitemap.xml'):
            archive.write(public / name, name)
    print(json.dumps({'phase': phase, 'directory': str(public), 'files': len(entries),
                      'bytes': sum(e['bytes'] for e in entries), 'commit': manifest['source_commit']},
                     ensure_ascii=False))


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--indexable', action='store_true',
                        help='Enable indexing only after the public-domain checks pass')
    build(parser.parse_args().indexable)
