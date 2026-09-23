"""Tests for `deckx.build`. Run with `uv run pytest`."""

from __future__ import annotations

import json
import re
from pathlib import Path

import pytest

from deckx import build
from deckx.build import BuildError

ROOT = Path(__file__).resolve().parent.parent


def write(path: Path, text: str) -> Path:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(text, encoding='utf-8')
    return path


# --- slide validation ------------------------------------------------------


def test_validate_slides_counts_markers():
    assert build.validate_slides('<slide/>\n# one\n<slide layout="title">\n# two\n', Path('deck.md')) == 2


def test_validate_slides_ignores_markers_in_fences():
    source = '<slide/>\n```html\n<slide/>\n```\n~~~\n<slide/>\n~~~\n'
    assert build.validate_slides(source, Path('deck.md')) == 1


def test_validate_slides_rejects_preamble():
    with pytest.raises(BuildError, match=r'deck\.md:1: content before the first'):
        build.validate_slides('# hello\n<slide/>\n', Path('deck.md'))


def test_validate_slides_rejects_empty():
    with pytest.raises(BuildError, match='no slides found'):
        build.validate_slides('\n\n', Path('deck.md'))


def test_validate_slides_rejects_self_closing_component():
    with pytest.raises(BuildError, match=r'deck\.md:2: self-closing'):
        build.validate_slides('<slide/>\n<component src="X.html"/>\n', Path('deck.md'))


# --- components ------------------------------------------------------------


def test_collect_components_follows_nesting(tmp_path: Path):
    comps = tmp_path / 'components'
    write(comps / 'A.html', '<div>a<component src="B.html"></component></div>')
    write(comps / 'B.html', '<p>b</p>')
    found = build.collect_components('<component src="A.html"></component>', comps)
    assert set(found) == {'A.html', 'B.html'}
    assert found['B.html'] == '<p>b</p>'


def test_collect_components_detects_cycle(tmp_path: Path):
    comps = tmp_path / 'components'
    write(comps / 'A.html', '<component src="B.html"></component>')
    write(comps / 'B.html', '<component src="A.html"></component>')
    with pytest.raises(BuildError, match=re.escape('component cycle: A.html -> B.html -> A.html')):
        build.collect_components('<component src="A.html"></component>', comps)


def test_collect_components_rejects_escape(tmp_path: Path):
    comps = tmp_path / 'components'
    comps.mkdir()
    write(tmp_path / 'secret.html', 'x')
    with pytest.raises(BuildError, match='escapes'):
        build.collect_components('<component src="../secret.html"></component>', comps)


def test_collect_components_missing(tmp_path: Path):
    comps = tmp_path / 'components'
    comps.mkdir()
    with pytest.raises(BuildError, match='component not found'):
        build.collect_components('<component src="Nope.html"></component>', comps)


# --- images ----------------------------------------------------------------


def test_collect_images_normalises_paths_and_skips_external(tmp_path: Path):
    write(tmp_path / 'assets' / 'a.png', 'png')
    write(tmp_path / 'assets' / 'b.svg', '<svg/>')
    texts = [
        '![alt](./assets/a.png) and <img src="assets//b.svg">',
        'background: url("assets/../assets/a.png"); <img src="https://x/y.png"> <img src="/abs.png">',
    ]
    images = build.collect_images(texts, tmp_path)
    assert set(images) == {'assets/a.png', 'assets/b.svg'}
    assert images['assets/a.png'].startswith('data:image/png;base64,')
    assert images['assets/b.svg'].startswith('data:image/svg+xml;base64,')


def test_collect_images_missing_file(tmp_path: Path):
    with pytest.raises(BuildError, match='image not found'):
        build.collect_images(['![x](assets/missing.png)'], tmp_path)


# --- page ------------------------------------------------------------------


def blob_of(page: str) -> str:
    """The raw text of the JSON blob embedded in a built page."""
    match = re.search(r'id="deck-data">(.*?)</script>', page, re.DOTALL)
    assert match is not None
    return match.group(1)


def test_render_page_escapes_script_breakers():
    data: dict[str, object] = {'markdown': '</script><!--<script>', 'components': {}}
    page = build.render_page('T & T', None, data)
    blob = blob_of(page)
    assert '<' not in blob
    assert json.loads(blob) == data
    assert '<title>T &amp; T</title>' in page


# --- end to end ------------------------------------------------------------


def test_build_starter_example(tmp_path: Path):
    deck_js = write(tmp_path / 'deck.js', '// stub')
    out = build.build_html(ROOT / 'examples' / 'starter', tmp_path / 'out' / 'index.html', deck_js=deck_js)
    assert out.is_file()
    assert (tmp_path / 'out' / 'deck.js').read_text() == '// stub'
    page = out.read_text(encoding='utf-8')
    blob = json.loads(blob_of(page))
    assert blob['config']['theme'] == 'markdown-dark'
    assert 'Hero.html' in blob['components'] and 'Callout.html' in blob['components']
    assert 'assets/logo.svg' in blob['images']
    assert '<slide' in blob['markdown']


def test_build_reports_missing_deck_js(tmp_path: Path):
    with pytest.raises(BuildError, match='pnpm build'):
        build.build_html(ROOT / 'examples' / 'starter', tmp_path / 'index.html', deck_js=tmp_path / 'nope.js')


def test_load_config_rejects_bad_theme(tmp_path: Path):
    write(tmp_path / 'deck.md', '<slide/>\n# hi\n')
    write(tmp_path / 'deckx.toml', 'theme = "neon"\n')
    with pytest.raises(BuildError, match='invalid theme'):
        build.load_config(tmp_path)


def test_load_config_rejects_dropped_keys(tmp_path: Path):
    write(tmp_path / 'deck.md', '<slide/>\n# hi\n')
    write(tmp_path / 'deckx.toml', 'code_light_theme = "github-light"\n')
    with pytest.raises(BuildError, match='no longer supported'):
        build.load_config(tmp_path)
