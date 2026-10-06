#!/usr/bin/env python3
"""Validate the Percules static site without third-party dependencies."""

from __future__ import annotations

import json
import re
import struct
import sys
import xml.etree.ElementTree as ET
from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import unquote, urlparse


ROOT = Path(__file__).resolve().parents[1]
PUBLIC = ROOT / "public"
EXPECTED_LANG = "sr-Latn-RS"
EXPECTED_EMAIL = "aleksa.perisic2000@gmail.com"
EXPECTED_PHONE = "+381695312480"

REQUIRED_FILES = ('public/index.html', 'public/404.html', 'public/coin.html', 'public/coin.css', 'public/styles.css', 'public/galaxy.js', 'public/solar.js', 'public/jump.js', 'public/shield.js', 'public/audio.js', 'public/coin.js', 'public/robots.txt', 'public/sitemap.xml', 'public/_headers', 'public/_redirects', 'public/assets/galaxy-face-on-v2.webp', 'public/assets/brand/percules-emblem.webp', 'public/assets/brand/percules-outline.json', 'public/assets/solar/credits.json', 'public/assets/solar/sun.webp', 'public/assets/solar/sun-low.webp', 'public/assets/solar/earth.webp', 'public/assets/solar/earth-low.webp', 'public/assets/solar/mars.webp', 'public/assets/solar/mars-low.webp', 'public/assets/solar/jupiter.webp', 'public/assets/solar/jupiter-low.webp', 'public/assets/solar/mercury.webp', 'public/assets/solar/mercury-low.webp', 'public/assets/solar/venus.webp', 'public/assets/solar/venus-low.webp', 'public/assets/solar/saturn.webp', 'public/assets/solar/saturn-low.webp', 'public/assets/solar/uranus.webp', 'public/assets/solar/uranus-low.webp', 'public/assets/solar/neptune.webp', 'public/assets/solar/neptune-low.webp', 'scripts/validate_site.py', 'README.md', 'DEPLOYMENT.md', 'AGENTS.md', '.editorconfig', '.gitignore')

CANONICAL_URLS = {'index.html': 'https://percules.rs/', 'coin.html': 'https://percules.rs/coin.html', '404.html': 'https://percules.rs/404.html'}

EXPECTED_SITEMAP_URLS = {"https://percules.rs/"}

TEXT_SUFFIXES = {
    ".html", ".css", ".js", ".svg", ".txt", ".xml", ".webmanifest", ""
}


class SiteHTMLParser(HTMLParser):
    """Collect the page facts needed by the validator."""

    def __init__(self, path: Path) -> None:
        super().__init__(convert_charrefs=True)
        self.path = path
        self.lang = ""
        self.charset = ""
        self.title_parts: list[str] = []
        self.in_title = False
        self.h1_count = 0
        self.meta_description = ""
        self.canonical = ""
        self.ids: set[str] = set()
        self.references: list[tuple[str, str, str]] = []
        self.tel_links: list[str] = []
        self.mailto_links: list[str] = []
        self.json_ld_blocks: list[str] = []
        self.in_json_ld = False
        self.current_json_ld: list[str] = []
        self.errors: list[str] = []

    def handle_starttag(self, tag: str, attrs: list[tuple[str, str | None]]) -> None:
        data = {key.lower(): (value or "") for key, value in attrs}
        tag = tag.lower()

        if tag == "html":
            self.lang = data.get("lang", "")
        elif tag == "meta":
            if "charset" in data:
                self.charset = data["charset"]
            if data.get("name", "").lower() == "description":
                self.meta_description = data.get("content", "").strip()
        elif tag == "title":
            self.in_title = True
        elif tag == "h1":
            self.h1_count += 1
        elif tag == "link":
            rel_values = set(data.get("rel", "").lower().split())
            href = data.get("href", "")
            if "canonical" in rel_values:
                self.canonical = href
        elif tag == "script":
            script_type = data.get("type", "").lower()
            if script_type == "application/ld+json":
                self.in_json_ld = True
                self.current_json_ld = []
            src = data.get("src")
            if src is not None:
                if is_external(src):
                    self.errors.append(f"spoljna JavaScript datoteka nije dozvoljena: {src}")

        element_id = data.get("id")
        if element_id:
            self.ids.add(element_id)

        if tag in {"a", "link"} and "href" in data:
            href = data["href"].strip()
            self.references.append((tag, "href", href))
            if href.lower().startswith("tel:"):
                self.tel_links.append(href[4:].split("?", 1)[0])
            if href.lower().startswith("mailto:"):
                self.mailto_links.append(href[7:].split("?", 1)[0])

        if tag in {"img", "script", "source"} and "src" in data:
            src = data["src"].strip()
            self.references.append((tag, "src", src))
            if tag == "img":
                if not src:
                    self.errors.append("img element ima praznu src vrednost")
                if "alt" not in data:
                    self.errors.append(f"img element nema alt atribut: {src or '(prazno)' }")

    def handle_endtag(self, tag: str) -> None:
        tag = tag.lower()
        if tag == "title":
            self.in_title = False
        elif tag == "script" and self.in_json_ld:
            self.json_ld_blocks.append("".join(self.current_json_ld).strip())
            self.current_json_ld = []
            self.in_json_ld = False

    def handle_data(self, data: str) -> None:
        if self.in_title:
            self.title_parts.append(data)
        if self.in_json_ld:
            self.current_json_ld.append(data)

    @property
    def title(self) -> str:
        return "".join(self.title_parts).strip()


def is_external(value: str) -> bool:
    parsed = urlparse(value)
    return parsed.scheme in {"http", "https"} or value.startswith("//")


def read_utf8(path: Path, problems: list[str]) -> str | None:
    try:
        return path.read_text(encoding="utf-8")
    except UnicodeDecodeError:
        problems.append(f"{path.relative_to(ROOT)} nije ispravan UTF-8 dokument")
    except OSError as exc:
        problems.append(f"nije moguće pročitati {path.relative_to(ROOT)}: {exc}")
    return None


def public_target(page: Path, reference: str) -> tuple[Path | None, str]:
    parsed = urlparse(reference)
    if parsed.scheme or reference.startswith("//"):
        return None, ""

    path_part = unquote(parsed.path)
    fragment = unquote(parsed.fragment)
    if not path_part:
        return page, fragment
    if path_part == "/":
        return PUBLIC / "index.html", fragment
    if path_part.startswith("/"):
        target = PUBLIC / path_part.lstrip("/")
    else:
        target = page.parent / path_part

    try:
        target = target.resolve()
        target.relative_to(PUBLIC.resolve())
    except (OSError, ValueError):
        return Path("__outside_public__"), fragment
    return target, fragment


def parse_html_pages(problems: list[str]) -> dict[Path, SiteHTMLParser]:
    parsed_pages: dict[Path, SiteHTMLParser] = {}
    for path in sorted(PUBLIC.rglob("*.html")):
        text = read_utf8(path, problems)
        if text is None:
            continue
        parser = SiteHTMLParser(path.resolve())
        try:
            parser.feed(text)
            parser.close()
        except Exception as exc:  # HTMLParser should not abort the full validation.
            problems.append(f"HTML parser nije uspeo za {path.relative_to(ROOT)}: {exc}")
            continue

        parsed_pages[path.resolve()] = parser
        label = path.relative_to(ROOT)
        problems.extend(f"{label}: {error}" for error in parser.errors)

        if not parser.title:
            problems.append(f"{label}: nedostaje title")
        if not parser.meta_description:
            problems.append(f"{label}: nedostaje meta description")
        if not parser.canonical:
            problems.append(f"{label}: nedostaje canonical")
        elif parser.canonical != CANONICAL_URLS.get(path.name):
            problems.append(f"{label}: canonical nije očekivani URL ({parser.canonical})")
        if parser.h1_count != 1:
            problems.append(f"{label}: očekivan je tačno jedan H1, pronađeno {parser.h1_count}")
        if parser.lang != EXPECTED_LANG:
            problems.append(f"{label}: lang mora biti {EXPECTED_LANG}, pronađeno {parser.lang or '(prazno)' }")
        if parser.charset.lower() != "utf-8":
            problems.append(f"{label}: nedostaje meta charset UTF-8")

        for index, block in enumerate(parser.json_ld_blocks, start=1):
            if not block:
                problems.append(f"{label}: JSON-LD blok {index} je prazan")
                continue
            try:
                json.loads(block)
            except json.JSONDecodeError as exc:
                problems.append(f"{label}: JSON-LD blok {index} nije validan JSON ({exc})")

        for phone in parser.tel_links:
            if phone != EXPECTED_PHONE:
                problems.append(f"{label}: tel link ne odgovara konfiguraciji ({phone})")
        for email in parser.mailto_links:
            if email.lower() != EXPECTED_EMAIL.lower():
                problems.append(f"{label}: mailto link ne odgovara konfiguraciji ({email})")

    return parsed_pages


def validate_references(parsed_pages: dict[Path, SiteHTMLParser], problems: list[str]) -> None:
    ignored_schemes = {"http", "https", "mailto", "tel"}
    for page, parser in parsed_pages.items():
        for tag, attribute, value in parser.references:
            label = page.relative_to(ROOT)
            if not value:
                problems.append(f"{label}: prazan {attribute} na <{tag}> elementu")
                continue

            parsed = urlparse(value)
            if parsed.scheme.lower() in ignored_schemes or value.startswith("//"):
                continue

            target, fragment = public_target(page, value)
            if target is None:
                continue
            if target.name == "__outside_public__":
                problems.append(f"{label}: putanja izlazi iz public direktorijuma ({value})")
                continue
            if not target.exists():
                problems.append(f"{label}: lokalna putanja ne postoji ({value})")
                continue
            if fragment and target.suffix.lower() == ".html":
                target_parser = parsed_pages.get(target.resolve())
                if not target_parser:
                    problems.append(f"{label}: nije moguće proveriti anker ({value})")
                elif fragment not in target_parser.ids:
                    problems.append(f"{label}: interni anker ne postoji ({value})")


def validate_public_text(problems: list[str]) -> None:
    forbidden_literals = (
        "lorem ipsum",
        "percules" + ".pro",
        "ai " + "agent",
        "digitalni " + "dvojnik",
        "eksperiment " + "u toku",
        "hello@" + "percules" + ".pro",
        "~" + "/",
        "fonts.google" + "apis.com",
        "fonts.g" + "static.com",
    )
    marker_pattern = re.compile(r"\b(?:TODO|FIXME|PLACEHOLDER)\b", re.IGNORECASE)

    for path in sorted(PUBLIC.rglob("*")):
        if not path.is_file() or path.suffix.lower() not in TEXT_SUFFIXES:
            continue
        text = read_utf8(path, problems)
        if text is None:
            continue
        folded = text.casefold()
        for forbidden in forbidden_literals:
            if forbidden.casefold() in folded:
                problems.append(f"{path.relative_to(ROOT)}: pronađena zabranjena referenca: {forbidden}")
        if marker_pattern.search(text):
            problems.append(f"{path.relative_to(ROOT)}: pronađen nedovršen marker")


def png_dimensions(path: Path) -> tuple[int, int] | None:
    try:
        with path.open("rb") as handle:
            header = handle.read(24)
    except OSError:
        return None
    if len(header) != 24 or header[:8] != b"\x89PNG\r\n\x1a\n" or header[12:16] != b"IHDR":
        return None
    return struct.unpack(">II", header[16:24])


def validate_sitemap_and_robots(problems: list[str]) -> None:
    sitemap_path = PUBLIC / "sitemap.xml"
    try:
        root = ET.parse(sitemap_path).getroot()
        namespace = {"sm": "http://www.sitemaps.org/schemas/sitemap/0.9"}
        urls = {node.text.strip() for node in root.findall("sm:url/sm:loc", namespace) if node.text}
        if urls != EXPECTED_SITEMAP_URLS:
            problems.append(f"public/sitemap.xml: URL skup nije očekivan ({sorted(urls)})")
    except (ET.ParseError, OSError) as exc:
        problems.append(f"public/sitemap.xml nije validan XML ({exc})")

    robots = read_utf8(PUBLIC / "robots.txt", problems)
    if robots is not None and "Sitemap: https://percules.rs/sitemap.xml" not in robots:
        problems.append("public/robots.txt nema ispravnu referencu ka sitemapu")


def validate_required_files(problems: list[str]) -> None:
    for relative in REQUIRED_FILES:
        if not (ROOT / relative).is_file():
            problems.append(f"nedostaje obavezni fajl: {relative}")
    if (ROOT / "CNAME").exists():
        problems.append("stari root CNAME ne sme da postoji")


def validate_runtime_resources(problems: list[str]) -> None:
    for path in PUBLIC.glob("*.js"):
        text = path.read_text(encoding="utf-8")
        references = re.findall(r"import\(['\"]([^'\"]+)['\"]\)", text)
        references += re.findall(r"['\"](assets/[^'\"`$]+\.(?:json|webp))['\"]", text)
        for ref in references:
            target, _ = public_target(path, ref)
            if target is None or not target.is_file():
                problems.append(f"Missing lazy resource: {ref}")
    for path in PUBLIC.rglob("*.json"):
        try: json.loads(path.read_text(encoding="utf-8"))
        except (ValueError, OSError): problems.append(f"Invalid JSON resource: {path.name}")
    for path in PUBLIC.rglob("*.webp"):
        data = path.read_bytes()
        if data[:4] != b"RIFF" or data[8:12] != b"WEBP":
            problems.append(f"Invalid texture image: {path.name}")
    for path in PUBLIC.rglob("*.html"):
        text = path.read_text(encoding="utf-8")
        if "<style>" in text or re.search(r'<script(?![^>]*src=)', text):
            problems.append(f"Inline code blocked by CSP: {path.name}")
    if sum(p.stat().st_size for p in PUBLIC.rglob("*") if p.is_file()) > 3000000:
        problems.append("Release exceeds 3 MB budget")
    headers = (PUBLIC / "_headers").read_text()
    if "unsafe-inline" in headers or "unsafe-eval" in headers or "script-src 'self'" not in headers:
        problems.append("CSP was weakened")


def main() -> int:
    problems: list[str] = []
    validate_required_files(problems)
    validate_public_text(problems)
    parsed_pages = parse_html_pages(problems)
    validate_references(parsed_pages, problems)
    validate_sitemap_and_robots(problems)
    validate_runtime_resources(problems)

    unique_problems = list(dict.fromkeys(problems))
    if unique_problems:
        print(f"Validacija nije prošla — pronađeno problema: {len(unique_problems)}")
        for problem in unique_problems:
            print(f"- {problem}")
        return 1

    html_count = len(parsed_pages)
    print(f"Validacija je uspešna: {html_count} HTML stranice i svi obavezni lokalni resursi su provereni.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
