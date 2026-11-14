"""Compare the chart API payload with the synchronized DuckDB reference."""

import argparse
import json
from pathlib import Path
from urllib.parse import urlencode
from urllib.request import urlopen

import duckdb
import numpy as np


def check(base_url, database, experiment_id, channel, start, end):
    query = urlencode({"experiment_id": experiment_id, "from_s": start, "to_s": end})
    with urlopen(f"{base_url.rstrip('/')}/api/series?{query}", timeout=15) as response:
        payload = json.load(response)
    if payload["truncated"] or payload["time_reference"] != "first_calibrated_record":
        raise ValueError("Unexpected series coverage or time reference")
    if payload["time_unit"] != "s" or payload["experiment_id"] != experiment_id:
        raise ValueError("Unexpected time unit or experiment")
    rows = payload["rows"]
    with duckdb.connect(str(database), read_only=True) as db:
        expected = db.execute(
            f"SELECT epoch_ms, time_s, {channel} FROM measurements "
            "WHERE experiment_id = ? AND time_s BETWEEN ? AND ? ORDER BY epoch_ms",
            [experiment_id, start, end],
        ).fetchall()
        units = db.execute(
            "SELECT DISTINCT u.unit FROM saffire_channel_units u JOIN experiment_catalog c "
            "ON u.investigation_id = c.investigation_id AND u.test = c.source_test_id "
            "WHERE c.experiment_id = ? AND u.channel = ?", [experiment_id, channel],
        ).fetchall()
    if not expected:
        raise ValueError("Choose a window with reference measurements")
    if [(item["unit"],) for item in payload["units"] if item["channel"] == channel] != units:
        raise ValueError("Unexpected channel unit")
    np.testing.assert_array_equal([int(row["epoch_ms"]) for row in rows], [r[0] for r in expected])
    np.testing.assert_allclose([row["time_s"] for row in rows], [r[1] for r in expected], rtol=0, atol=1e-9)
    actual_values = [row[channel] for row in rows]
    expected_values = [r[2] for r in expected]
    np.testing.assert_array_equal([v is None for v in actual_values], [v is None for v in expected_values])
    np.testing.assert_allclose(np.asarray(actual_values, dtype=float), np.asarray(expected_values, dtype=float),
                               rtol=1e-12, atol=1e-12, equal_nan=True)
    print(f"{experiment_id} {channel}: {len(rows)} points, {sum(v is None for v in actual_values)} nulls")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--base-url", required=True)
    parser.add_argument("--database", type=Path, default=Path("datasets/nasa_synchronized.duckdb"))
    parser.add_argument("--experiment", default="PSI-100:S1:r2")
    parser.add_argument("--channel", choices=("o2", "co2"), default="o2")
    parser.add_argument("--start", type=float, default=0)
    parser.add_argument("--end", type=float, default=60)
    args = parser.parse_args()
    check(args.base_url, args.database, args.experiment, args.channel, args.start, args.end)
