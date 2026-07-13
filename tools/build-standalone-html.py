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
    r"""(?P<attr>src|href)=["'](?P<path>assets/[^"']+?)"""
    r"""(?:\?[^"']*)?["']"""
)


def data_uri(path: Path) -> str:
    mime, _ = mimetypes.guess_type(path.name)
    if not mime:
        mime = "application/octet-stream"
    encoded = base64.b64encode(path.read_bytes()).decode("ascii")
    return f"data:{mime};base64,{encoded}"


def main() -> None:
    html = SRC.read_text(encoding="utf-8")
    seen: dict[str, str] = {}

    def replace(match: re.Match[str]) -> str:
        rel = match.group("path")
        if rel in seen:
            return f'{match.group("attr")}="{seen[rel]}"'

        file_path = ROOT / rel
        if not file_path.is_file():
            raise FileNotFoundError(f"Missing asset: {rel}")

        uri = data_uri(file_path)
        seen[rel] = uri
        print(f"embedded {rel} ({file_path.stat().st_size // 1024} KB)")
        return f'{match.group("attr")}="{uri}"'

    standalone = ASSET_RE.sub(replace, html)
    OUT.write_text(standalone, encoding="utf-8")
    size_mb = OUT.stat().st_size / (1024 * 1024)
    print(f"\nWrote {OUT}")
    print(f"Size: {size_mb:.2f} MB ({len(seen)} assets embedded)")


if __name__ == "__main__":
    main()
