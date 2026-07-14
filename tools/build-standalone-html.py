#!/usr/bin/env python3
"""Build a single self-contained HTML file with embedded images for WhatsApp sharing."""

from __future__ import annotations

import base64
import mimetypes
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SRC = ROOT / "index.html"
OUT = Path.home() / "Desktop" / "lifemaxxingLandingPage.html"

ASSET_RE = re.compile(
    r"""(?P<attr>src|href|poster)=["'](?P<path>assets/[^"']+?)"""
    r"""(?:\?[^"']*)?["']"""
)

JS_ASSET_RE = re.compile(r"""['"](?P<path>assets/[^'"]+?)['"]""")


def data_uri(path: Path) -> str:
    mime, _ = mimetypes.guess_type(path.name)
    if not mime:
        mime = "application/octet-stream"
    encoded = base64.b64encode(path.read_bytes()).decode("ascii")
    return f"data:{mime};base64,{encoded}"


def embed_assets(html: str) -> tuple[str, dict[str, str]]:
    seen: dict[str, str] = {}

    def uri_for(rel: str) -> str:
        if rel in seen:
            return seen[rel]
        file_path = ROOT / rel
        if not file_path.is_file():
            raise FileNotFoundError(f"Missing asset: {rel}")
        uri = data_uri(file_path)
        seen[rel] = uri
        print(f"embedded {rel} ({file_path.stat().st_size // 1024} KB)")
        return uri

    def replace_attr(match: re.Match[str]) -> str:
        rel = match.group("path")
        return f'{match.group("attr")}="{uri_for(rel)}"'

    def replace_js(match: re.Match[str]) -> str:
        rel = match.group("path")
        return f'"{uri_for(rel)}"'

    standalone = ASSET_RE.sub(replace_attr, html)
    standalone = JS_ASSET_RE.sub(replace_js, standalone)
    return standalone, seen


def main() -> None:
    html = SRC.read_text(encoding="utf-8")
    standalone, seen = embed_assets(html)
    OUT.write_text(standalone, encoding="utf-8")
    size_mb = OUT.stat().st_size / (1024 * 1024)
    print(f"\nWrote {OUT}")
    print(f"Size: {size_mb:.2f} MB ({len(seen)} assets embedded)")


if __name__ == "__main__":
    main()
