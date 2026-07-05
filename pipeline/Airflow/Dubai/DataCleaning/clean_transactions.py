import argparse
import sys
from pathlib import Path

import pandas as pd


UNWANTED_COLUMNS_EXPLICIT = {
    "property_sub_type_id",
    "property_sub_type_en",
    "trans_group_ar",
    "building_name_en",
    "building_name_ar",
    "project_number",
    "project_name_en",
    "master_project_en",
    "rooms_en",
    "rent_value",
    "meter_rent_price",
    "no_of_parties_role_3",
    # Explicit Arabic-name columns to drop
    "procedure_name_ar",
    "property_type_ar",
    "property_sub_type_ar",
    "rooms_ar",
    "reg_type_ar",
    "area_name_ar",
    "nearest_metro_ar",
    "nearest_metro_en",
    "nearest_mall_ar",
    "nearest_mall_en",
    "nearest_landmark_ar",
    "nearest_landmark_en",
    "project_name_ar",
    "master_project_ar",
    "property_usage_ar",
}

NA_VALUES = [
    "",
    " ",
    "NA",
    "N/A",
    "na",
    "n/a",
    "null",
    "NULL",
    "None",
    "none",
]


def clean_transactions(
    input_path: Path,
    output_path: Path,
    id_column: str,
    report_path: Path | None = None,
) -> None:
    if not input_path.exists():
        raise FileNotFoundError(f"Input file not found: {input_path}")

    # Read CSV and normalize null-like values
    df = pd.read_csv(
        input_path,
        encoding="utf-8-sig",
        na_values=NA_VALUES,
        keep_default_na=True,
    )

    original_row_count = len(df)
    original_columns = list(df.columns)

    # Convert pure-whitespace strings to NaN across the DataFrame
    df = df.replace(r"^\s*$", pd.NA, regex=True)

    # Drop explicitly unwanted columns first (so these do not cause row drops)
    cols_present_to_drop = [c for c in UNWANTED_COLUMNS_EXPLICIT if c in df.columns]
    if cols_present_to_drop:
        df = df.drop(columns=cols_present_to_drop)

    dropped_columns = cols_present_to_drop

    # Drop rows with ANY null value in remaining columns
    df = df.dropna(how="any")
    rows_after_null_drop = len(df)
    rows_dropped_nulls = original_row_count - rows_after_null_drop

    # Ensure ID column exists after column drops
    if id_column not in df.columns:
        raise KeyError(
            f"ID column '{id_column}' not found after cleaning columns. "
            f"Available columns: {list(df.columns)}"
        )

    # Drop duplicate IDs, keeping the first occurrence
    rows_before_dedup = len(df)
    df = df.drop_duplicates(subset=[id_column], keep="first")
    rows_after_dedup = len(df)
    rows_dropped_duplicates = rows_before_dedup - rows_after_dedup

    # Write cleaned CSV
    df.to_csv(output_path, index=False, encoding="utf-8-sig")

    # Percentages relative to original data
    if original_row_count > 0:
        pct_retained      = rows_after_dedup       / original_row_count * 100
        pct_dropped_nulls = rows_dropped_nulls     / original_row_count * 100
        pct_dropped_dupes = rows_dropped_duplicates / original_row_count * 100
    else:
        pct_retained = pct_dropped_nulls = pct_dropped_dupes = 0.0

    summary_text = (
        f"Cleaning Report: {input_path.name}\n"
        f"{'─' * 40}\n"
        f"Original rows          : {original_row_count:>10,}\n"
        f"Dropped columns        : {len(dropped_columns):>10,}  {dropped_columns}\n"
        f"Rows dropped (nulls)   : {rows_dropped_nulls:>10,}  ({pct_dropped_nulls:.1f}%)\n"
        f"Rows dropped (dupes)   : {rows_dropped_duplicates:>10,}  ({pct_dropped_dupes:.1f}%)\n"
        f"Rows retained          : {rows_after_dedup:>10,}  ({pct_retained:.1f}%)\n"
        f"Output                 : {output_path}\n"
    )

    # Optionally write to a report file
    if report_path is not None:
        report_path.parent.mkdir(parents=True, exist_ok=True)
        report_path.write_text(summary_text + "\n", encoding="utf-8")


def parse_args(argv=None):
    parser = argparse.ArgumentParser(description="Clean Transactions CSV: drop nulls, duplicates, and unwanted columns.")
    parser.add_argument(
        "--input",
        "-i",
        type=Path,
        default=Path("Transactions.csv"),
        help="Path to input Transactions CSV (default: Transactions.csv)",
    )
    parser.add_argument(
        "--output",
        "-o",
        type=Path,
        default=Path("Transactions_cleaned.csv"),
        help="Path for cleaned output CSV (default: Transactions_cleaned.csv)",
    )
    parser.add_argument(
        "--report",
        "-r",
        type=Path,
        default=Path("cleaning_report.txt"),
        help="Path for a text report with cleaning statistics (default: cleaning_report.txt)",
    )
    parser.add_argument(
        "--id-column",
        "-c",
        required=True,
        help="Name of the ID column to enforce uniqueness on (required)",
    )
    return parser.parse_args(argv)


def main(argv=None):
    args = parse_args(argv)
    clean_transactions(args.input, args.output, args.id_column, args.report)


if __name__ == "__main__":
    main(sys.argv[1:])
