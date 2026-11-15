"""Build the dashboard's daily CLD Flame counts from the NASA PSI source table."""

import argparse
import csv
import hashlib
import io
import json
from datetime import date, timedelta
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "datasets/acme/psi-21/PSI-21_Experimental table_CLD Flame.csv"
OUTPUT = ROOT / "Changeme_Nasa/server/data/psi-21.json"
SHA256 = "9fafbc5b3dddaf715ce8025ed9154ce297803f7b69a935f077ec26c8249e44c0"
HEADERS = [
    "Test Type", "Test Day", "Fuel MFC", "N2 MFC", "Fuel Bottle",
    "Fuel conc. Range", "Flames ignited", "Notes",
]


def read_days(raw):
    if hashlib.sha256(raw).hexdigest() != SHA256:
        raise ValueError("The input does not match the verified PSI-21 version 1 file")
    reader = csv.DictReader(io.StringIO(raw.decode("utf-8"), newline=""))
    if reader.fieldnames != HEADERS:
        raise ValueError("Unexpected PSI-21 columns")
    days = {}
    for row in reader:
        day_code = row["Test Day"]
        count = row["Flames ignited"]
        test_type = row["Test Type"].strip()
        if len(day_code) != 5 or not day_code.isdecimal() or not count.isdecimal() or not test_type:
            raise ValueError(f"Invalid test day, type or count at line {reader.line_num}")
        year = 2000 + int(day_code[:2])
        ordinal = int(day_code[2:])
        day = date(year, 1, 1) + timedelta(days=ordinal - 1)
        if day.year != year or day in days:
            raise ValueError(f"Invalid or duplicate test day: {day_code}")
        days[day] = {"date": day.isoformat(), "test_type": test_type, "flames_ignited": int(count)}
    return [days[day] for day in sorted(days)]


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--check", action="store_true", help="verify the bundled snapshot without rewriting it")
    args = parser.parse_args()
    dataset = {
        "investigation_id": "PSI-21",
        "source": {
            "url": "https://psi.nasa.gov/physci/repo/data/investigations/PSI-21",
            "filename": SOURCE.name, "file_version": 1, "sha256": SHA256,
        },
        "rows": read_days(SOURCE.read_bytes()),
    }
    contents = json.dumps(dataset, indent=2) + "\n"
    if args.check:
        if OUTPUT.read_text(encoding="utf-8") != contents:
            raise SystemExit("The bundled PSI-21 snapshot is stale")
    else:
        OUTPUT.parent.mkdir(parents=True, exist_ok=True)
        OUTPUT.write_text(contents, encoding="utf-8", newline="\n")
    print(f"PSI-21: {len(dataset['rows'])} test days verified")


if __name__ == "__main__":
    main()
