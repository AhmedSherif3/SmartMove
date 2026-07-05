import argparse
import sys
from pathlib import Path

import pandas as pd

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

    # Drop rows with ANY null value in important columns, but
    # allow nulls in 'compound_name' as requested.
    null_check_columns = [c for c in df.columns if c != "compound_name"]
    df = df.dropna(subset=null_check_columns, how="any")
    rows_after_null_drop = len(df)
    rows_dropped_nulls = original_row_count - rows_after_null_drop

    # Ensure ID column exists after null-drop
    if id_column not in df.columns:
        raise KeyError(
            f"ID column '{id_column}' not found after cleaning columns. "
            f"Available columns: {list(df.columns)}"
        )

    # 1) Drop rows that have identical values in all non-ID columns
    #    (i.e., same whole row except for the ID), keeping the first.
    content_columns = [c for c in df.columns if c != id_column]
    rows_before_content_dedup = len(df)
    if content_columns:
        df = df.drop_duplicates(subset=content_columns, keep="first")
    rows_after_content_dedup = len(df)
    rows_dropped_content_dupes = rows_before_content_dedup - rows_after_content_dedup

    # 2) Drop duplicate IDs, keeping the first occurrence
    rows_before_id_dedup = len(df)
    df = df.drop_duplicates(subset=[id_column], keep="first")
    rows_after_dedup = len(df)
    rows_dropped_id_dupes = rows_before_id_dedup - rows_after_dedup

    # Write cleaned CSV
    df.to_csv(output_path, index=False, encoding="utf-8-sig")

    # Percentages relative to original data
    if original_row_count > 0:
        pct_retained = rows_after_dedup / original_row_count * 100
        pct_dropped_nulls = rows_dropped_nulls / original_row_count * 100
        pct_dropped_content_dupes = rows_dropped_content_dupes / original_row_count * 100
        pct_dropped_id_dupes = rows_dropped_id_dupes / original_row_count * 100
    else:
        pct_retained = pct_dropped_nulls = pct_dropped_content_dupes = pct_dropped_id_dupes = 0.0

    # Build a simplified statistics report
    summary_lines = [
        f"Input file: {input_path}",
        f"Output file: {output_path}",
        f"Original rows: {original_row_count}",
        f"Rows after cleaning: {rows_after_dedup}",
        f"Data retained: {pct_retained:.2f}% of original rows",
        f"Rows dropped due to nulls: {rows_dropped_nulls} ({pct_dropped_nulls:.2f}% of original)",
        f"Rows dropped due to duplicate content (same in all non-ID columns): {rows_dropped_content_dupes} ({pct_dropped_content_dupes:.4f}% of original)",
        f"Rows dropped due to duplicate '{id_column}': {rows_dropped_id_dupes} ({pct_dropped_id_dupes:.4f}% of original)",
        f"Original columns: {len(original_columns)}",
        f"Columns kept: {len(df.columns)} (all original columns are retained)",
    ]

    summary_text = "\n".join(summary_lines)

    # Print to terminal
    print("\n=== Cleaning Summary ===")
    print(summary_text)

    # Optionally write to a report file
    if report_path is not None:
        report_path.write_text(summary_text + "\n", encoding="utf-8")


def parse_args(argv=None):
    parser = argparse.ArgumentParser(
        description="Clean Egypt Transactions CSV: drop rows with nulls and duplicate IDs, keeping all columns."
    )
    parser.add_argument(
        "--input",
        "-i",
        type=Path,
        default=Path("EGY_FULL_DATASET_MASTER.csv"),
        help="Path to input Egypt CSV (default: EGY_FULL_DATASET_MASTER.csv)",
    )
    parser.add_argument(
        "--output",
        "-o",
        type=Path,
        default=Path("EGY_FULL_DATASET_MASTER_clean.csv"),
        help="Path for cleaned output CSV (default: EGY_FULL_DATASET_MASTER_clean.csv)",
    )
    parser.add_argument(
        "--report",
        "-r",
        type=Path,
        default=Path("EGY_cleaning_report.txt"),
        help="Path for a text report with cleaning statistics (default: EGY_cleaning_report.txt)",
    )
    parser.add_argument(
        "--id-column",
        "-c",
        default="id",
        help="Name of the ID column to enforce uniqueness on (default: id)",
    )
    return parser.parse_args(argv)


def main(argv=None):
    args = parse_args(argv)
    clean_transactions(args.input, args.output, args.id_column, args.report)


if __name__ == "__main__":
    main(sys.argv[1:])
