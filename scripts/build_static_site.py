#!/usr/bin/env python3
"""Copy the relative-path holiday sample into the Sites static directory."""

from __future__ import annotations

import shutil
from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import unquote, urlsplit


ROOT = Path(__file__).resolve().parents[1]
SAMPLE = ROOT / "sample"
OUTPUT = ROOT / "dist"
SITE_FILES = ("index.html", "styles.css", "app.js")
DATA_FILES = ("jp-holidays.js", "jp-holidays.json")


class LocalAssetParser(HTMLParser):
    def __init__(self) -> None:
        super().__init__()
        self.references: list[str] = []

    def handle_starttag(self, tag: str, attrs: list[tuple[str, str | None]]) -> None:
        for name, value in attrs:
            if name in {"href", "src"} and value:
                self.references.append(value)


def verify_local_assets() -> None:
    parser = LocalAssetParser()
    parser.feed((OUTPUT / "index.html").read_text(encoding="utf-8"))
    for reference in parser.references:
        parsed = urlsplit(reference)
        if parsed.scheme or parsed.netloc or not parsed.path:
            continue
        relative_path = unquote(parsed.path).lstrip("/")
        target = (OUTPUT / relative_path).resolve()
        if target != OUTPUT.resolve() and OUTPUT.resolve() not in target.parents:
            raise ValueError(f"Asset reference escapes the static directory: {reference}")
        if not target.exists():
            raise FileNotFoundError(f"Static asset referenced by index.html is missing: {reference}")


def main() -> None:
    OUTPUT.mkdir(parents=True, exist_ok=True)

    for name in SITE_FILES:
        source = SAMPLE / name
        if not source.is_file():
            raise FileNotFoundError(f"Missing site source file: {source}")
        shutil.copy2(source, OUTPUT / name)

    for name in DATA_FILES:
        source = SAMPLE / "data" / name
        if not source.is_file():
            raise FileNotFoundError(f"Missing generated holiday data: {source}")
        destination = OUTPUT / "data" / name
        destination.parent.mkdir(parents=True, exist_ok=True)
        shutil.copy2(source, destination)

    verify_local_assets()
    print(f"Built static site in {OUTPUT}")


if __name__ == "__main__":
    main()
