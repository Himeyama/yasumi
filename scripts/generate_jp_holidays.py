#!/usr/bin/env python3
"""Convert the Cabinet Office Japanese holiday CSV to JSON."""

from __future__ import annotations

import argparse
import csv
import json
from collections import Counter
from datetime import date, datetime, timedelta
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
DEFAULT_INPUT = ROOT / "data" / "source" / "syukujitsu.csv"
DEFAULT_OUTPUT = ROOT / "data" / "jp-holidays.json"
SAMPLE_DATA_DIRECTORY = ROOT / "sample" / "data"
SOURCE_URL = "https://www8.cao.go.jp/chosei/shukujitsu/syukujitsu.csv"
EXPECTED_HEADER = ("国民の祝日・休日月日", "国民の祝日・休日名称")
START_YEAR = 1955
END_YEAR = 2027


def classify_holiday(day: date, name: str, names_by_date: dict[date, str]) -> str:
    """Classify records using the official name and holiday-law pattern."""
    if "振替休日" in name:
        return "substitute_holiday"

    if name == "休日":
        previous_name = names_by_date.get(day - timedelta(days=1), "")
        following_name = names_by_date.get(day + timedelta(days=1), "")
        is_between_national_holidays = all(
            neighbor_name
            and neighbor_name != "休日"
            and "振替休日" not in neighbor_name
            for neighbor_name in (previous_name, following_name)
        )
        return "citizen_holiday" if is_between_national_holidays else "substitute_holiday"

    return "national_holiday"


def read_source(path: Path) -> list[dict[str, str]]:
    with path.open("r", encoding="cp932", newline="") as source_file:
        rows = list(csv.reader(source_file))

    if not rows or tuple(cell.strip() for cell in rows[0]) != EXPECTED_HEADER:
        raise ValueError(
            "Unexpected CSV header. Expected the Cabinet Office "
            "holiday/date and holiday/name columns."
        )

    parsed: list[tuple[date, str]] = []
    for line_number, row in enumerate(rows[1:], start=2):
        if not row or not any(cell.strip() for cell in row):
            continue
        if len(row) != 2:
            raise ValueError(f"CSV line {line_number} has {len(row)} columns; expected 2.")

        try:
            day = datetime.strptime(row[0].strip(), "%Y/%m/%d").date()
        except ValueError as error:
            raise ValueError(f"Invalid date on CSV line {line_number}: {row[0]!r}") from error

        name = row[1].strip()
        if not name:
            raise ValueError(f"Missing holiday name on CSV line {line_number}.")
        if not START_YEAR <= day.year <= END_YEAR:
            raise ValueError(f"Date outside the requested year range on line {line_number}: {day}")
        parsed.append((day, name))

    if not parsed:
        raise ValueError("The CSV contains no holiday rows.")

    dates = [day for day, _ in parsed]
    if dates != sorted(dates):
        raise ValueError("Holiday rows are not in ascending date order.")
    if len(dates) != len(set(dates)):
        raise ValueError("The CSV contains duplicate dates.")
    if dates[0].year != START_YEAR or dates[-1].year != END_YEAR:
        raise ValueError(
            f"Unexpected data range: {dates[0].year}–{dates[-1].year}; "
            f"expected {START_YEAR}–{END_YEAR}."
        )

    names_by_date = dict(parsed)
    return [
        {
            "date": day.isoformat(),
            "name": name,
            "type": classify_holiday(day, name, names_by_date),
        }
        for day, name in parsed
    ]


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--input", type=Path, default=DEFAULT_INPUT, help="Official CSV path")
    parser.add_argument("--output", type=Path, default=DEFAULT_OUTPUT, help="JSON output path")
    args = parser.parse_args()

    holidays = read_source(args.input)
    generated_at = datetime.now().astimezone().date().isoformat()
    input_path = args.input.resolve()
    try:
        source_file = input_path.relative_to(ROOT).as_posix()
    except ValueError:
        source_file = input_path.as_posix()
    payload = {
        "schemaVersion": 1,
        "country": "JP",
        "dateFormat": "YYYY-MM-DD",
        "typeDefinitions": {
            "national_holiday": "国民の祝日。臨時に定められた祝日を含む。",
            "substitute_holiday": "振替休日。CSV名の『振替休日』表記、または『休日』の日付から判定。",
            "citizen_holiday": "前後を国民の祝日に挟まれた休日。CSV名と前後の日付から判定。",
        },
        "dateRange": {
            "from": f"{START_YEAR}-01-01",
            "through": f"{END_YEAR}-12-31",
        },
        "source": {
            "name": "内閣府「国民の祝日」",
            "url": SOURCE_URL,
            "file": source_file,
            "encoding": "CP932",
            "generatedAt": generated_at,
        },
        "holidays": holidays,
    }

    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(
        json.dumps(payload, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )

    js_content = (
        "// Generated from the Cabinet Office holiday CSV. Do not edit by hand.\n"
        "window.JP_HOLIDAYS_DATA = "
        + json.dumps(payload, ensure_ascii=False, indent=2)
        + ";\n"
    )

    js_output = args.output.with_suffix(".js")
    js_output.write_text(js_content, encoding="utf-8")

    SAMPLE_DATA_DIRECTORY.mkdir(parents=True, exist_ok=True)
    sample_json_output = SAMPLE_DATA_DIRECTORY / "jp-holidays.json"
    sample_js_output = SAMPLE_DATA_DIRECTORY / "jp-holidays.js"
    sample_json_output.write_text(
        json.dumps(payload, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )
    sample_js_output.write_text(js_content, encoding="utf-8")

    counts = Counter(record["type"] for record in holidays)
    print(f"Wrote {len(holidays)} holidays to {args.output}")
    print(f"Wrote browser data to {js_output}")
    print(f"Wrote static-site data to {SAMPLE_DATA_DIRECTORY}")
    print("Types: " + ", ".join(f"{kind}={count}" for kind, count in sorted(counts.items())))


if __name__ == "__main__":
    main()
