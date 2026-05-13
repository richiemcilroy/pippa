#!/usr/bin/env python3
"""Download and build a UK-only Open Food Facts local dataset.

This script keeps the first stage deliberately local:

1. Download the Open Food Facts product CSV dump.
2. Download the public AWS images/OCR key list.
3. Stream the product dump, keep UK rows with valid barcodes, and dedupe by
   normalized barcode.
4. Join AWS image/OCR availability metadata by barcode.
5. Write compact JSONL and CSV files that are suitable for a later local DB
   import.

It does not download every image binary by default. The AWS image dataset is an
asset bucket; the product/nutrition facts come from the product database dump.
"""

from __future__ import annotations

import argparse
import csv
import gzip
import hashlib
import io
import json
import os
import re
import sys
import tempfile
import time
import urllib.error
import urllib.request
from dataclasses import dataclass, field
from pathlib import Path
from typing import Iterable


PRODUCT_CSV_URL = "https://static.openfoodfacts.org/data/en.openfoodfacts.org.products.csv.gz"
AWS_DATA_KEYS_URL = "https://openfoodfacts-images.s3.eu-west-3.amazonaws.com/data/data_keys.gz"
AWS_BUCKET_URL = "https://openfoodfacts-images.s3.eu-west-3.amazonaws.com/"
DEFAULT_OUT_DIR = "data/openfoodfacts"
UK_COUNTRY_TAGS = frozenset(
    {
        "en:united-kingdom",
        "en:england",
        "en:scotland",
        "en:wales",
        "en:northern-ireland",
    }
)

NUMERIC_BARCODE_RE = re.compile(r"^\d{1,14}$")
IMAGE_FILE_RE = re.compile(r"\.(?:jpg|jpeg|png|webp)$", re.IGNORECASE)
RESIZED_400_RE = re.compile(r"\.400\.(?:jpg|jpeg|png|webp)$", re.IGNORECASE)
INVALID_IMAGE_PATH_RE = re.compile(r"/invalid/", re.IGNORECASE)

REQUIRED_CORE_NUTRITION_FIELDS = (
    "energy_kcal_100g",
    "proteins_100g",
    "fat_100g",
    "carbohydrates_100g",
)

GRAMS_PER_100G_FIELDS = (
    "fat_100g",
    "saturated_fat_100g",
    "carbohydrates_100g",
    "sugars_100g",
    "fiber_100g",
    "proteins_100g",
    "salt_100g",
    "sodium_100g",
)

BASE_FIELDS = [
    "barcode",
    "source_code",
    "url",
    "product_name",
    "generic_name",
    "brands",
    "brands_tags",
    "quantity",
    "serving_size",
    "serving_quantity",
    "product_quantity",
    "categories",
    "categories_tags",
    "labels",
    "labels_tags",
    "stores",
    "countries",
    "countries_tags",
    "ingredients_text",
    "allergens",
    "allergens_tags",
    "traces",
    "traces_tags",
    "nutriscore_grade",
    "nova_group",
    "ecoscore_grade",
    "main_category",
    "main_category_en",
    "image_url",
    "image_small_url",
    "last_modified_t",
    "last_modified_datetime",
    "last_image_t",
    "last_image_datetime",
]

NUTRITION_FIELD_MAP = {
    "energy_kj_100g": "energy-kj_100g",
    "energy_kcal_100g": "energy-kcal_100g",
    "fat_100g": "fat_100g",
    "saturated_fat_100g": "saturated-fat_100g",
    "carbohydrates_100g": "carbohydrates_100g",
    "sugars_100g": "sugars_100g",
    "fiber_100g": "fiber_100g",
    "proteins_100g": "proteins_100g",
    "salt_100g": "salt_100g",
    "sodium_100g": "sodium_100g",
}

ASSET_FIELDS = [
    "aws_image_count",
    "aws_image_400_count",
    "aws_ocr_json_count",
    "aws_first_image_400_key",
    "aws_first_ocr_json_key",
    "aws_first_image_400_url",
    "aws_first_ocr_json_url",
]

DERIVED_FIELDS = [
    "source_content_hash",
    "data_quality_score",
    "popularity_score",
]


@dataclass
class AssetStats:
    image_count: int = 0
    image_400_count: int = 0
    ocr_json_count: int = 0
    first_image_400_key: str = ""
    first_ocr_json_key: str = ""


@dataclass
class Summary:
    product_rows_seen: int = 0
    uk_rows_seen: int = 0
    invalid_barcode_rows: int = 0
    filtered_invalid_gtin_rows: int = 0
    filtered_missing_name_rows: int = 0
    filtered_missing_core_macro_rows: int = 0
    filtered_implausible_nutrition_rows: int = 0
    duplicate_barcode_rows: int = 0
    deduped_products: int = 0
    products_with_name: int = 0
    products_with_brand: int = 0
    products_with_energy_kcal_100g: int = 0
    products_with_core_macros_100g: int = 0
    products_with_selected_image_url: int = 0
    aws_keys_seen: int = 0
    aws_keys_matched_to_uk_products: int = 0
    products_with_aws_400_image: int = 0
    products_with_aws_ocr_json: int = 0
    downloaded_at_epoch: int = field(default_factory=lambda: int(time.time()))


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser()
    parser.add_argument("--out-dir", default=DEFAULT_OUT_DIR)
    parser.add_argument("--product-csv-url", default=PRODUCT_CSV_URL)
    parser.add_argument("--aws-data-keys-url", default=AWS_DATA_KEYS_URL)
    parser.add_argument("--force-download", action="store_true")
    parser.add_argument("--limit", type=int, default=0, help="Optional product-row limit for smoke tests.")
    parser.add_argument(
        "--country-tag",
        action="append",
        default=[],
        help="Country tag to include. Defaults to UK tags.",
    )
    return parser.parse_args()


def log(message: str) -> None:
    print(message, file=sys.stderr, flush=True)


def download_file(url: str, output: Path, force: bool) -> None:
    output.parent.mkdir(parents=True, exist_ok=True)
    if output.exists() and output.stat().st_size > 0 and not force:
        log(f"using existing {output} ({output.stat().st_size:,} bytes)")
        return

    request = urllib.request.Request(url, headers={"User-Agent": "pippa-openfoodfacts-local-ingest/1.0"})
    log(f"downloading {url}")
    try:
        with urllib.request.urlopen(request, timeout=60) as response:
            total = int(response.headers.get("Content-Length") or 0)
            fd, tmp_name = tempfile.mkstemp(prefix=f".{output.name}.", dir=output.parent)
            copied = 0
            last_report = time.time()
            try:
                with os.fdopen(fd, "wb") as tmp:
                    while True:
                        chunk = response.read(1024 * 1024)
                        if not chunk:
                            break
                        tmp.write(chunk)
                        copied += len(chunk)
                        now = time.time()
                        if now - last_report >= 10:
                            if total:
                                log(f"  {output.name}: {copied:,}/{total:,} bytes")
                            else:
                                log(f"  {output.name}: {copied:,} bytes")
                            last_report = now
                os.replace(tmp_name, output)
            except BaseException:
                Path(tmp_name).unlink(missing_ok=True)
                raise
    except urllib.error.URLError as error:
        raise RuntimeError(f"failed to download {url}: {error}") from error
    log(f"saved {output} ({output.stat().st_size:,} bytes)")


def normalize_barcode(value: str) -> str | None:
    digits = "".join(ch for ch in (value or "").strip() if ch.isdigit())
    if not digits or not NUMERIC_BARCODE_RE.match(digits):
        return None

    stripped = digits.lstrip("0")
    if not stripped:
        return None

    if len(stripped) <= 7:
        return stripped.zfill(8)
    if 9 <= len(stripped) <= 12:
        return stripped.zfill(13)
    if len(digits) in (8, 13, 14):
        return digits
    return None


def is_valid_gtin(value: str) -> bool:
    if re.fullmatch(r"\d{8}|\d{12}|\d{13}|\d{14}", value) is None:
        return False

    digits = [int(ch) for ch in value]
    check_digit = digits.pop()
    total = 0
    for index, digit in enumerate(reversed(digits), start=1):
        total += digit * (3 if index % 2 == 1 else 1)
    return (10 - (total % 10)) % 10 == check_digit


def split_tags(value: str) -> set[str]:
    return {part.strip() for part in (value or "").split(",") if part.strip()}


def row_is_uk(row: dict[str, str], country_tags: set[str]) -> bool:
    return bool(split_tags(row.get("countries_tags", "")) & country_tags)


def as_float(value: str) -> float | None:
    text = (value or "").strip().replace(",", ".")
    if not text:
        return None
    try:
        return float(text)
    except ValueError:
        return None


def clean_text(value: str) -> str:
    return (value or "").replace("\x00", "").strip()


def clean_url(value: str) -> str:
    url = clean_text(value)
    if INVALID_IMAGE_PATH_RE.search(url):
        return ""
    return url


def stable_hash(value: dict[str, object]) -> str:
    payload = json.dumps(value, ensure_ascii=False, sort_keys=True, separators=(",", ":"))
    return hashlib.sha256(payload.encode("utf-8")).hexdigest()


def normalized_tags(value: str) -> str:
    tags: list[str] = []
    for part in split_tags(value):
        text = part.lower().strip()
        if not text:
            continue
        if ":" not in text:
            text = f"en:{re.sub(r'[^a-z0-9]+', '-', text).strip('-')}"
        tags.append(text)
    return ",".join(dict.fromkeys(tags))


def has_required_name(product: dict[str, object]) -> bool:
    return bool(str(product.get("product_name") or "").strip())


def has_required_core_macros(product: dict[str, object]) -> bool:
    return all(product.get(field_name) is not None for field_name in REQUIRED_CORE_NUTRITION_FIELDS)


def has_plausible_nutrition(product: dict[str, object]) -> bool:
    energy_kcal = product.get("energy_kcal_100g")
    if not isinstance(energy_kcal, (int, float)) or energy_kcal < 0 or energy_kcal > 1000:
        return False

    energy_kj = product.get("energy_kj_100g")
    if isinstance(energy_kj, (int, float)) and (energy_kj < 0 or energy_kj > 5000):
        return False

    macro_total = 0.0
    for field_name in GRAMS_PER_100G_FIELDS:
        value = product.get(field_name)
        if value is None:
            continue
        if not isinstance(value, (int, float)) or value < 0 or value > 100:
            return False
        if field_name in ("proteins_100g", "fat_100g", "carbohydrates_100g"):
            macro_total += float(value)

    return macro_total <= 125


def quality_score(product: dict[str, object]) -> int:
    score = 0
    score += 30 if has_required_name(product) else 0
    score += 30 if has_required_core_macros(product) else 0
    score += 10 if product.get("brands") else 0
    score += 10 if product.get("serving_quantity") else 0
    score += 10 if product.get("ingredients_text") else 0
    score += 10 if product.get("image_url") or product.get("aws_first_image_400_url") else 0
    return min(score, 100)


def popularity_score(product: dict[str, object]) -> int:
    score = 0
    score += int(product.get("aws_image_count") or 0)
    score += int(product.get("aws_ocr_json_count") or 0)
    score += 5 if product.get("brands") else 0
    score += 5 if product.get("stores") else 0
    return score


def selected_fields(row: dict[str, str], barcode: str) -> dict[str, object]:
    out: dict[str, object] = {}
    for field_name in BASE_FIELDS:
        if field_name == "barcode":
            out[field_name] = barcode
        elif field_name == "source_code":
            out[field_name] = clean_text(row.get("code", ""))
        elif field_name in ("image_url", "image_small_url"):
            out[field_name] = clean_url(row.get(field_name, ""))
        else:
            out[field_name] = clean_text(row.get(field_name, ""))

    for output_name, source_name in NUTRITION_FIELD_MAP.items():
        out[output_name] = as_float(row.get(source_name, ""))

    if not out.get("allergens_tags") and out.get("allergens"):
        out["allergens_tags"] = normalized_tags(str(out["allergens"]))

    search_parts = [
        out.get("product_name"),
        out.get("generic_name"),
        out.get("brands"),
        out.get("categories"),
        out.get("ingredients_text"),
    ]
    out["search_text"] = " ".join(str(part) for part in search_parts if part)
    out["source_content_hash"] = stable_hash(out)
    return out


def nutrition_completeness(row: dict[str, object]) -> int:
    return sum(1 for field_name in NUTRITION_FIELD_MAP if row.get(field_name) is not None)


def dedupe_score(row: dict[str, object]) -> tuple[int, int, int, int, int, int]:
    return (
        1 if row.get("product_name") else 0,
        nutrition_completeness(row),
        1 if row.get("brands") else 0,
        1 if row.get("ingredients_text") else 0,
        1 if row.get("image_url") else 0,
        int(row.get("last_modified_t") or 0),
    )


def read_products(path: Path, country_tags: set[str], limit: int) -> tuple[dict[str, dict[str, object]], Summary]:
    summary = Summary()
    products: dict[str, dict[str, object]] = {}

    csv.field_size_limit(1024 * 1024 * 1024)
    log(f"reading products from {path}")
    with gzip.open(path, "rb") as gzip_file:
        text = io.TextIOWrapper(gzip_file, encoding="utf-8", errors="replace", newline="")
        reader = csv.DictReader(text, delimiter="\t")
        for row in reader:
            summary.product_rows_seen += 1
            if limit and summary.product_rows_seen > limit:
                break
            if summary.product_rows_seen % 500_000 == 0:
                log(
                    "  rows={:,} uk={:,} deduped={:,}".format(
                        summary.product_rows_seen,
                        summary.uk_rows_seen,
                        len(products),
                    )
                )

            if not row_is_uk(row, country_tags):
                continue

            summary.uk_rows_seen += 1
            barcode = normalize_barcode(row.get("code", ""))
            if barcode is None:
                summary.invalid_barcode_rows += 1
                continue
            if not is_valid_gtin(barcode):
                summary.filtered_invalid_gtin_rows += 1
                continue

            product = selected_fields(row, barcode)
            if not has_required_name(product):
                summary.filtered_missing_name_rows += 1
                continue
            if not has_required_core_macros(product):
                summary.filtered_missing_core_macro_rows += 1
                continue
            if not has_plausible_nutrition(product):
                summary.filtered_implausible_nutrition_rows += 1
                continue

            existing = products.get(barcode)
            if existing is None:
                products[barcode] = product
                continue

            summary.duplicate_barcode_rows += 1
            if dedupe_score(product) > dedupe_score(existing):
                products[barcode] = product

    return products, summary


def barcode_from_s3_key(key: str) -> str | None:
    parts = key.strip().split("/")
    if len(parts) < 3 or parts[0] != "data":
        return None

    barcode_parts: list[str] = []
    for part in parts[1:-1]:
        if not part.isdigit():
            return None
        barcode_parts.append(part)
    return normalize_barcode("".join(barcode_parts))


def collect_asset_stats(path: Path, barcodes: set[str], summary: Summary) -> dict[str, AssetStats]:
    stats: dict[str, AssetStats] = {}
    log(f"reading AWS asset keys from {path}")
    with gzip.open(path, "rt", encoding="utf-8", errors="replace") as f:
        for line in f:
            key = line.strip()
            if not key:
                continue
            summary.aws_keys_seen += 1
            if summary.aws_keys_seen % 2_000_000 == 0:
                log(
                    "  aws_keys={:,} matched={:,}".format(
                        summary.aws_keys_seen,
                        summary.aws_keys_matched_to_uk_products,
                    )
                )

            barcode = barcode_from_s3_key(key)
            if barcode is None or barcode not in barcodes:
                continue

            summary.aws_keys_matched_to_uk_products += 1
            asset = stats.setdefault(barcode, AssetStats())
            if key.endswith(".json.gz"):
                asset.ocr_json_count += 1
                if not asset.first_ocr_json_key:
                    asset.first_ocr_json_key = key
            elif IMAGE_FILE_RE.search(key):
                asset.image_count += 1
                if RESIZED_400_RE.search(key):
                    asset.image_400_count += 1
                    if not asset.first_image_400_key:
                        asset.first_image_400_key = key
    return stats


def with_asset_fields(product: dict[str, object], assets: AssetStats | None) -> dict[str, object]:
    row = dict(product)
    asset = assets or AssetStats()
    row.update(
        {
            "aws_image_count": asset.image_count,
            "aws_image_400_count": asset.image_400_count,
            "aws_ocr_json_count": asset.ocr_json_count,
            "aws_first_image_400_key": asset.first_image_400_key,
            "aws_first_ocr_json_key": asset.first_ocr_json_key,
            "aws_first_image_400_url": f"{AWS_BUCKET_URL}{asset.first_image_400_key}"
            if asset.first_image_400_key
            else "",
            "aws_first_ocr_json_url": f"{AWS_BUCKET_URL}{asset.first_ocr_json_key}" if asset.first_ocr_json_key else "",
        }
    )
    row["data_quality_score"] = quality_score(row)
    row["popularity_score"] = popularity_score(row)
    return row


def write_jsonl(path: Path, rows: Iterable[dict[str, object]]) -> int:
    path.parent.mkdir(parents=True, exist_ok=True)
    count = 0
    with path.open("w", encoding="utf-8") as f:
        for row in rows:
            f.write(json.dumps(row, ensure_ascii=False, sort_keys=True) + "\n")
            count += 1
    return count


def write_csv(path: Path, rows: list[dict[str, object]]) -> None:
    fields = BASE_FIELDS + list(NUTRITION_FIELD_MAP) + ["search_text"] + ASSET_FIELDS + DERIVED_FIELDS
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("w", encoding="utf-8", newline="") as f:
        writer = csv.DictWriter(f, fieldnames=fields, extrasaction="ignore")
        writer.writeheader()
        for row in rows:
            writer.writerow(row)


def write_barcode_file(path: Path, barcodes: Iterable[str]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("w", encoding="utf-8") as f:
        for barcode in barcodes:
            f.write(f"{barcode}\n")


def finalize_summary(summary: Summary, rows: list[dict[str, object]]) -> dict[str, object]:
    summary.deduped_products = len(rows)
    summary.products_with_name = sum(1 for row in rows if row.get("product_name"))
    summary.products_with_brand = sum(1 for row in rows if row.get("brands"))
    summary.products_with_energy_kcal_100g = sum(1 for row in rows if row.get("energy_kcal_100g") is not None)
    summary.products_with_core_macros_100g = sum(
        1
        for row in rows
        if all(row.get(name) is not None for name in ["energy_kcal_100g", "proteins_100g", "fat_100g", "carbohydrates_100g"])
    )
    summary.products_with_selected_image_url = sum(1 for row in rows if row.get("image_url"))
    summary.products_with_aws_400_image = sum(1 for row in rows if int(row.get("aws_image_400_count") or 0) > 0)
    summary.products_with_aws_ocr_json = sum(1 for row in rows if int(row.get("aws_ocr_json_count") or 0) > 0)
    return dict(summary.__dict__)


def main() -> int:
    args = parse_args()
    out_dir = Path(args.out_dir)
    raw_dir = out_dir / "raw"
    uk_dir = out_dir / "uk"
    country_tags = set(args.country_tag) if args.country_tag else set(UK_COUNTRY_TAGS)

    product_csv_path = raw_dir / "en.openfoodfacts.org.products.csv.gz"
    aws_keys_path = raw_dir / "data_keys.gz"

    download_file(args.product_csv_url, product_csv_path, args.force_download)
    download_file(args.aws_data_keys_url, aws_keys_path, args.force_download)

    products, summary = read_products(product_csv_path, country_tags, args.limit)
    assets = collect_asset_stats(aws_keys_path, set(products), summary)

    rows = [with_asset_fields(products[barcode], assets.get(barcode)) for barcode in sorted(products)]
    products_jsonl = uk_dir / "products.jsonl"
    products_csv = uk_dir / "products.csv"
    barcodes_txt = uk_dir / "barcodes.txt"
    summary_json = uk_dir / "summary.json"

    write_jsonl(products_jsonl, rows)
    write_csv(products_csv, rows)
    write_barcode_file(barcodes_txt, sorted(products))
    summary_payload = finalize_summary(summary, rows)
    summary_payload.update(
        {
            "product_csv_url": args.product_csv_url,
            "aws_data_keys_url": args.aws_data_keys_url,
            "country_tags": sorted(country_tags),
            "outputs": {
                "products_jsonl": str(products_jsonl),
                "products_csv": str(products_csv),
                "barcodes_txt": str(barcodes_txt),
                "summary_json": str(summary_json),
                "raw_product_csv_gz": str(product_csv_path),
                "raw_aws_data_keys_gz": str(aws_keys_path),
            },
        }
    )
    summary_json.write_text(json.dumps(summary_payload, indent=2, sort_keys=True) + "\n", encoding="utf-8")

    print(json.dumps(summary_payload, indent=2, sort_keys=True))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
