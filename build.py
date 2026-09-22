# /// script
# requires-python = ">=3.11"
# dependencies = []
# ///
"""Build a self-contained HTML slide deck from markdown, HTML components and CSS.

A deck directory looks like:

    deckx.toml      title, theme, footer, tabs, path overrides (all optional)
    deck.md         the slides, one `<slide .../>` line starting each slide
    styles.css      CSS variable overrides (optional)
    components/     HTML files pulled in with <component src="Name.html"></component>
    assets/         images referenced from the markdown, components or styles

Nothing is rendered here. The markdown source, every referenced component, the user's
styles and every referenced image (as a data URI) are written into the page as one JSON
blob, and `deck.js` (the browser runtime, built from src/ with `pnpm build`) renders the
deck when the page loads. The output is `dist/index.html` plus a copy of `deck.js`, which
works from `file://` and prints to PDF with Chrome headless.

Usage:

    uv run build.py html [output] [--dir DIR]
    uv run build.py pdf [output] [--dir DIR]
    uv run build.py html-to-pdf input.html output.pdf
"""

from __future__ import annotations

import argparse
import base64
import html
import json
import mimetypes
import os
import posixpath
import re
import shutil
import subprocess
import sys
import tomllib
from dataclasses import dataclass, field
from pathlib import Path

HERE = Path(__file__).resolve().parent
TEMPLATE_PATH = HERE / 'template.html'
DECK_JS_PATH = HERE / 'dist' / 'deck.js'

THEMES = ('light', 'dark', 'markdown-light', 'markdown-dark')
IMAGE_EXTS = ('.png', '.jpg', '.jpeg', '.gif', '.svg', '.webp')
FAVICON_EXTS = ('.svg', '.png', '.ico', '.jpg', '.jpeg')

# Slide page size in inches, matching the @page rule in src/styles/base.css (16:9).
PAPER_WIDTH_IN = 11
PAPER_HEIGHT_IN = 6.1875


class BuildError(Exception):
    """A problem in the input files, reported without a traceback."""


# ---------------------------------------------------------------------------
# Config
# ---------------------------------------------------------------------------


@dataclass
class Config:
    """Resolved deckx.toml with defaults applied and paths made absolute."""

    cwd: Path
    markdown_path: Path
    styles_path: Path
    components_dir: Path
    title: str | None = None
    theme: str = 'light'
    footer: str | None = None
    favicon_path: Path | None = None
    tabs: list[dict[str, str]] = field(default_factory=list)

    def to_json(self) -> dict[str, object]:
        """The `config` field of the JSON blob, matching `DeckConfig` in src/types.ts."""
        data: dict[str, object] = {'theme': self.theme, 'tabs': self.tabs}
        if self.title is not None:
            data['title'] = self.title
        if self.footer is not None:
            data['footer'] = self.footer
        return data


def load_config(cwd: Path) -> Config:
    """Load deckx.toml from `cwd` if present and validate it. A missing deck.md is fatal."""
    cwd = cwd.resolve()
    toml_path = cwd / 'deckx.toml'
    raw: dict[str, object] = {}
    if toml_path.is_file():
        try:
            raw = tomllib.loads(toml_path.read_text(encoding='utf-8'))
        except tomllib.TOMLDecodeError as exc:
            raise BuildError(f'{toml_path}: {exc}') from exc

    for key in ('code_light_theme', 'code_dark_theme', 'mdx'):
        if key in raw:
            raise BuildError(f'deckx.toml: `{key}` is no longer supported (code is highlighted in the browser)')

    def optional_str(key: str) -> str | None:
        value = raw.get(key)
        if value is None:
            return None
        if not isinstance(value, str):
            raise BuildError(f'deckx.toml: `{key}` must be a string, got {value!r}')
        return value

    markdown_path = cwd / (optional_str('markdown') or 'deck.md')
    if not markdown_path.is_file():
        raise BuildError(f'markdown file not found: {markdown_path}')

    theme = optional_str('theme') or 'light'
    if theme not in THEMES:
        raise BuildError(f'deckx.toml: invalid theme {theme!r}. Valid values: {", ".join(THEMES)}')

    tabs = raw.get('tabs', [])
    if not isinstance(tabs, list):
        raise BuildError('deckx.toml: `tabs` must be an array of {id, label} tables')
    for tab in tabs:
        if not (isinstance(tab, dict) and isinstance(tab.get('id'), str) and isinstance(tab.get('label'), str)):
            raise BuildError(f'deckx.toml: every `tabs` entry needs string `id` and `label`, got {tab!r}')

    favicon_path: Path | None = None
    favicon = optional_str('favicon')
    if favicon:
        favicon_path = cwd / favicon
        if not favicon_path.is_file():
            raise BuildError(f'favicon not found: {favicon_path}')
        if favicon_path.suffix.lower() not in FAVICON_EXTS:
            raise BuildError(
                f'unsupported favicon extension {favicon_path.suffix!r}. Use one of: {", ".join(FAVICON_EXTS)}'
            )

    return Config(
        cwd=cwd,
        markdown_path=markdown_path,
        styles_path=cwd / (optional_str('styles') or 'styles.css'),
        components_dir=cwd / (optional_str('components') or 'components'),
        title=optional_str('title'),
        theme=theme,
        footer=optional_str('footer'),
        favicon_path=favicon_path,
        tabs=[{'id': t['id'], 'label': t['label']} for t in tabs],
    )


# ---------------------------------------------------------------------------
# Slide structure
# ---------------------------------------------------------------------------

# Mirrors SLIDE_RE / FENCE_RE in src/split.ts; the runtime does the real split.
SLIDE_RE = re.compile(r'^\s*<slide\b[^>]*?\s*/?>\s*$', re.IGNORECASE)
FENCE_RE = re.compile(r'^ {0,3}(`{3,}|~{3,})')
SELF_CLOSING_COMPONENT_RE = re.compile(r'<component\b[^>]*/>', re.IGNORECASE)


def validate_slides(source: str, path: Path) -> int:
    """Check the slide structure the way the runtime will read it; returns the slide count.

    Errors: content before the first `<slide/>` line, no slides at all, or a self-closing
    `<component .../>` (the HTML parser would swallow everything after it).
    """
    count = 0
    fence: str | None = None
    for number, line in enumerate(source.splitlines(), start=1):
        fence_match = FENCE_RE.match(line)
        if fence is None:
            if fence_match:
                fence = fence_match.group(1)
                continue
            if SLIDE_RE.match(line):
                count += 1
                continue
            if count == 0 and line.strip():
                raise BuildError(f'{path}:{number}: content before the first <slide .../> line: {line.strip()!r}')
            if SELF_CLOSING_COMPONENT_RE.search(line):
                raise BuildError(
                    f'{path}:{number}: self-closing <component .../> is not valid HTML; '
                    'write <component src="Name.html"></component>'
                )
        elif fence_match and fence_match.group(1)[0] == fence[0] and len(fence_match.group(1)) >= len(fence):
            if not line[fence_match.end() :].strip():
                fence = None
    if count == 0:
        raise BuildError(f'{path}: no slides found; start each slide with a <slide .../> line')
    return count


# ---------------------------------------------------------------------------
# Components
# ---------------------------------------------------------------------------

COMPONENT_RE = re.compile(r"""<component\s+src=(["'])(?P<src>[^"']+)\1\s*>\s*</component>""", re.IGNORECASE)


def collect_components(body: str, components_dir: Path) -> dict[str, str]:
    """Load every component reachable from `body`, following nested references; keyed by `src`."""
    components: dict[str, str] = {}

    def visit(source_html: str, chain: tuple[str, ...]) -> None:
        for match in COMPONENT_RE.finditer(source_html):
            src = match.group('src')
            if src in chain:
                raise BuildError(f'component cycle: {" -> ".join((*chain, src))}')
            if src in components:
                continue
            components[src] = load_component(src, components_dir, chain)
            visit(components[src], (*chain, src))

    visit(body, ())
    return components


def load_component(src: str, components_dir: Path, chain: tuple[str, ...]) -> str:
    """Read one component file, refusing paths that leave the components directory."""
    if not components_dir.is_dir():
        raise BuildError(f'components directory not found: {components_dir} (needed for <component src="{src}">)')
    path = (components_dir / src).resolve()
    if components_dir.resolve() not in path.parents:
        raise BuildError(f'component src {src!r} escapes {components_dir}')
    referenced_from = f' (referenced from {chain[-1]})' if chain else ''
    if not path.is_file():
        raise BuildError(f'component not found: {path}{referenced_from}')
    if SELF_CLOSING_COMPONENT_RE.search(path.read_text(encoding='utf-8')):
        raise BuildError(f'{path}: self-closing <component .../> is not valid HTML')
    return path.read_text(encoding='utf-8')


# ---------------------------------------------------------------------------
# Images
# ---------------------------------------------------------------------------

# `src="..."` in HTML, `![alt](path)` in markdown, `url(...)` in CSS.
HTML_SRC_RE = re.compile(r"""\bsrc\s*=\s*(["'])(?P<path>[^"']+)\1""", re.IGNORECASE)
MD_IMAGE_RE = re.compile(r'!\[[^\]]*\]\(\s*(?P<path>[^)\s]+)')
CSS_URL_RE = re.compile(r"""url\(\s*(["']?)(?P<path>[^"')]+)\1\s*\)""", re.IGNORECASE)


def is_external(path: str) -> bool:
    """True for URLs, data URIs and absolute paths, which are left alone."""
    return path.startswith('/') or re.match(r'^[a-z][a-z0-9+.-]*:', path, re.IGNORECASE) is not None


def collect_images(texts: list[str], base: Path) -> dict[str, str]:
    """Find relative image references in `texts` and read them as data URIs, keyed by normalised path."""
    images: dict[str, str] = {}
    for text in texts:
        for regex in (HTML_SRC_RE, MD_IMAGE_RE, CSS_URL_RE):
            for match in regex.finditer(text):
                raw = match.group('path')
                if is_external(raw) or not raw.lower().endswith(IMAGE_EXTS):
                    continue
                key = posixpath.normpath(raw)
                if key in images:
                    continue
                file = base / key
                if not file.is_file():
                    raise BuildError(f'image not found: {file} (referenced as {raw!r})')
                images[key] = data_uri(file)
    return images


def data_uri(path: Path) -> str:
    """Base64 data URI for a file, with the MIME type guessed from its extension."""
    mime, _ = mimetypes.guess_type(path.name)
    if mime is None:
        raise BuildError(f'cannot determine MIME type of {path}')
    return f'data:{mime};base64,{base64.b64encode(path.read_bytes()).decode()}'


# ---------------------------------------------------------------------------
# Page
# ---------------------------------------------------------------------------


def build_deck_data(cfg: Config) -> dict[str, object]:
    """Assemble the JSON blob the runtime reads; shape matches `DeckData` in src/types.ts."""
    markdown = cfg.markdown_path.read_text(encoding='utf-8')
    validate_slides(markdown, cfg.markdown_path)
    components = collect_components(markdown, cfg.components_dir)
    styles = cfg.styles_path.read_text(encoding='utf-8') if cfg.styles_path.is_file() else ''
    images = collect_images([markdown, *components.values(), styles], cfg.cwd)
    return {
        'config': cfg.to_json(),
        'markdown': markdown,
        'components': components,
        'styles': styles,
        'images': images,
    }


def render_page(title: str, favicon: Path | None, data: dict[str, object]) -> str:
    """Fill template.html with the title, favicon link and JSON blob."""
    # `<` is escaped to `<`, which is still valid JSON. That defeats `</script>` and the
    # `<!--` sequence, which would otherwise put the HTML tokenizer into a state where the real
    # closing tag is ignored. Component HTML can contain both.
    blob = json.dumps(data, ensure_ascii=False).replace('<', '\\u003c')
    favicon_tag = ''
    if favicon is not None:
        favicon_tag = f'\n<link rel="icon" href="{data_uri(favicon)}">'
    template = TEMPLATE_PATH.read_text(encoding='utf-8')
    return template.replace('{title}', html.escape(title)).replace('{favicon}', favicon_tag).replace('{blob}', blob)


def build_html(cwd: Path, output: Path | None = None, deck_js: Path = DECK_JS_PATH) -> Path:
    """Build `cwd` into a single HTML file (default `cwd/dist/index.html`) plus `deck.js` beside it."""
    cfg = load_config(cwd)
    data = build_deck_data(cfg)
    page = render_page(cfg.title or cfg.markdown_path.stem, cfg.favicon_path, data)

    if not deck_js.is_file():
        raise BuildError(f'{deck_js} is missing: run `pnpm build` in {HERE} to create it')
    out = (output or cwd / 'dist' / 'index.html').resolve()
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text(page, encoding='utf-8')
    shutil.copyfile(deck_js, out.parent / 'deck.js')
    print(f'wrote {relative(out)} ({len(page.encode()):,} bytes) and deck.js')
    return out


# ---------------------------------------------------------------------------
# PDF
# ---------------------------------------------------------------------------


def find_chrome() -> str | None:
    """Locate a Chrome or Chromium executable: the macOS app bundle, then names on PATH."""
    mac_path = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
    if sys.platform == 'darwin' and os.path.exists(mac_path):
        return mac_path
    for name in ('google-chrome', 'google-chrome-stable', 'chromium', 'chromium-browser'):
        found = shutil.which(name)
        if found:
            return found
    return None


def html_to_pdf(html_path: Path, pdf_path: Path) -> None:
    """Print an HTML file to PDF with Chrome headless at deckx's slide page size.

    The exact command is printed first so it can be copied and edited if Chrome is not found
    or the conversion fails.
    """
    html_path = html_path.resolve()
    pdf_path = pdf_path.resolve()
    if not html_path.is_file():
        raise BuildError(f'HTML input not found: {html_path}')
    chrome = find_chrome()
    args = [
        '--headless=new',
        '--disable-gpu',
        '--no-margins',
        '--print-to-pdf-no-header',
        f'--paper-width={PAPER_WIDTH_IN}',
        f'--paper-height={PAPER_HEIGHT_IN}',
        f'--print-to-pdf={pdf_path}',
        html_path.as_uri(),
    ]
    printable = ' '.join(shell_quote(a) for a in (chrome or 'google-chrome', *args))
    print(f'running Chrome to convert HTML to PDF:\n  {printable}\n')
    if chrome is None:
        raise BuildError('Chrome / Chromium not found on PATH or in /Applications; run the command above yourself')
    result = subprocess.run([chrome, *args], check=False)
    if result.returncode != 0:
        raise BuildError(f'Chrome exited with code {result.returncode}')
    print(f'wrote {relative(pdf_path)}')


def shell_quote(s: str) -> str:
    """Quote one argument for display (POSIX style)."""
    if re.fullmatch(r'[A-Za-z0-9_\-./:=@%+,]+', s):
        return s
    return "'" + s.replace("'", "'\\''") + "'"


def relative(path: Path) -> str:
    """Path relative to the cwd when possible, for friendlier messages."""
    try:
        return str(path.relative_to(Path.cwd()))
    except ValueError:
        return str(path)


# ---------------------------------------------------------------------------
# CLI
# ---------------------------------------------------------------------------


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(
        prog='deckx', description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter
    )
    sub = parser.add_subparsers(dest='command')

    p_html = sub.add_parser('html', help='build the deck to a single HTML file (default: DIR/dist/index.html)')
    p_html.add_argument('output', nargs='?', type=Path)
    p_html.add_argument('--dir', type=Path, default=Path('.'), help='deck directory (default: current directory)')

    p_pdf = sub.add_parser(
        'pdf', help='build HTML, then convert to PDF via Chrome headless (default: DIR/dist/deck.pdf)'
    )
    p_pdf.add_argument('output', nargs='?', type=Path)
    p_pdf.add_argument('--dir', type=Path, default=Path('.'), help='deck directory (default: current directory)')

    p_h2p = sub.add_parser('html-to-pdf', help='convert an existing HTML file to PDF without rebuilding')
    p_h2p.add_argument('input', type=Path)
    p_h2p.add_argument('output', type=Path)

    args = parser.parse_args(argv)
    if args.command is None:
        parser.print_help()
        return 1
    try:
        if args.command == 'html':
            build_html(args.dir, args.output)
        elif args.command == 'pdf':
            html_path = build_html(args.dir)
            html_to_pdf(html_path, args.output or html_path.parent / 'deck.pdf')
        else:
            html_to_pdf(args.input, args.output)
    except BuildError as exc:
        print(f'error: {exc}', file=sys.stderr)
        return 1
    return 0


if __name__ == '__main__':
    sys.exit(main())
