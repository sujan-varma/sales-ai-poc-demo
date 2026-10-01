"""Loads the master Excel workbook once, normalises every sheet into JSON-ready rows and keeps it in memory.

Header handling: most sheets have a title/notes row above the real header. The header row is the row (among
the first 10) with the most text cells. The wide sheets (actual/target qty & value) repeat the SKU headers
under period labels such as "Apr-26" or "Sep-26 MTD (till 20th)" on the row above; a repeated header is made
unique as "<period> / <header>" (e.g. "Apr-26 / IWC250g"). Unique headers are kept exactly as in Excel.

Values are kept as-is: no rounding, dates -> ISO strings, empty/NaN cells -> None.
Every row gets "_row_id" = its 1-based row number in Excel, so rows can be checked against the file.
"""

from __future__ import annotations

import datetime as dt
import logging
import math
import re
import threading
import time
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any, Optional

import numpy as np
import pandas as pd

log = logging.getLogger(__name__)

ROW_ID = "_row_id"
HEADER_SCAN_ROWS = 10


@dataclass
class Sheet:
    name: str
    slug: str
    header_row: int  # 1-based Excel row
    columns: list[str]
    rows: list[dict[str, Any]]
    by_id: dict[int, dict[str, Any]] = field(default_factory=dict)
    df: pd.DataFrame = field(default_factory=pd.DataFrame)


@dataclass
class Workbook:
    path: Path
    sheets: dict[str, Sheet]  # keyed by exact sheet name, in workbook order
    loaded_at: str
    seconds: float

    def find(self, key: str) -> Optional[Sheet]:
        if key in self.sheets:
            return self.sheets[key]
        k = key.strip().lower()
        for s in self.sheets.values():
            if s.name.strip().lower() == k or s.slug == slugify(key):
                return s
        return None

    @property
    def total_rows(self) -> int:
        return sum(len(s.rows) for s in self.sheets.values())


# ---------------------------------------------------------------- helpers

def slugify(name: str) -> str:
    return re.sub(r"[^a-z0-9]+", "-", str(name).lower()).strip("-")


def _is_empty(v: Any) -> bool:
    if v is None or (isinstance(v, str) and v == ""):  # blank cells arrive as "" with keep_default_na=False
        return True
    if isinstance(v, float) and math.isnan(v):
        return True
    return v is pd.NaT


def to_json_value(v: Any) -> Any:
    """Convert a raw cell to a JSON-safe value without changing it."""
    if _is_empty(v):
        return None
    if isinstance(v, (pd.Timestamp, dt.datetime, dt.date, dt.time)):
        return v.isoformat()
    if isinstance(v, np.generic):
        v = v.item()
    if isinstance(v, float) and math.isinf(v):
        return None
    return v


def _col_letter(i: int) -> str:
    s = ""
    i += 1
    while i:
        i, r = divmod(i - 1, 26)
        s = chr(65 + r) + s
    return s


def _detect_header(grid: list[list[Any]]) -> int:
    scan = grid[:HEADER_SCAN_ROWS]
    if not scan:
        return 0
    scores = [sum(isinstance(c, str) and c.strip() != "" for c in row) for row in scan]
    return scores.index(max(scores))


def _build_columns(grid: list[list[Any]], h: int, ncol: int) -> list[str]:
    header = [grid[h][j] if j < len(grid[h]) else None for j in range(ncol)]
    names = [str(c) if not _is_empty(c) else "" for c in header]

    # forward-filled group labels from the row above the header (period blocks in the wide sheets)
    groups: list[str] = [""] * ncol
    if h > 0:
        current = ""
        above = grid[h - 1]
        for j in range(ncol):
            v = above[j] if j < len(above) else None
            if not _is_empty(v):
                current = " ".join(str(v).split())
            groups[j] = current

    counts: dict[str, int] = {}
    for n in names:
        if n:
            counts[n] = counts.get(n, 0) + 1

    out: list[str] = []
    seen: set[str] = set()
    for j, n in enumerate(names):
        if not n:
            col = f"Column {_col_letter(j)}"
        elif counts[n] > 1 and groups[j]:
            col = f"{groups[j]} / {n}"
        else:
            col = n
        base, k = col, 2
        while col in seen or col == ROW_ID:
            col = f"{base} ({k})"
            k += 1
        seen.add(col)
        out.append(col)
    return out


def _parse_sheet(name: str, raw: pd.DataFrame) -> Sheet:
    grid = [[None if _is_empty(c) else c for c in row] for row in raw.astype(object).values.tolist()]
    excel_rows = [int(i) + 1 for i in raw.index]  # header=None -> index 0 is Excel row 1

    if not grid:
        return Sheet(name=name, slug=slugify(name), header_row=1, columns=[], rows=[])

    h = _detect_header(grid)
    # last column that has a header or any data
    ncol = 0
    for row in grid[h:]:
        for j in range(len(row) - 1, -1, -1):
            if not _is_empty(row[j]):
                ncol = max(ncol, j + 1)
                break
    columns = _build_columns(grid, h, ncol)

    rows: list[dict[str, Any]] = []
    for i in range(h + 1, len(grid)):
        cells = grid[i][:ncol]
        if all(_is_empty(c) for c in cells):
            continue
        rec: dict[str, Any] = {ROW_ID: excel_rows[i]}
        for col, v in zip(columns, cells):
            rec[col] = to_json_value(v)
        rows.append(rec)

    df = pd.DataFrame(rows, columns=[ROW_ID, *columns]) if rows else pd.DataFrame(columns=[ROW_ID, *columns])
    return Sheet(
        name=name,
        slug=slugify(name),
        header_row=excel_rows[h],
        columns=columns,
        rows=rows,
        by_id={r[ROW_ID]: r for r in rows},
        df=df,
    )


def load_workbook(path: Path) -> Workbook:
    if not path.exists():
        raise FileNotFoundError(f"Excel file not found: {path}")
    t = time.perf_counter()
    # keep_default_na=False: text such as "NA" / "N/A" stays text; only blank cells become null
    raw = pd.read_excel(path, sheet_name=None, header=None, engine="openpyxl", keep_default_na=False, na_values=[])
    sheets: dict[str, Sheet] = {}
    slugs: set[str] = set()
    for name, df in raw.items():
        s = _parse_sheet(name, df)
        base, k = s.slug or "sheet", 2
        while s.slug in slugs or not s.slug:
            s.slug = f"{base}-{k}"
            k += 1
        slugs.add(s.slug)
        sheets[name] = s
    secs = time.perf_counter() - t
    wb = Workbook(path=path, sheets=sheets, loaded_at=dt.datetime.now().astimezone().isoformat(), seconds=secs)
    log.info("Loaded %s: %d sheets, %d rows in %.1fs", path.name, len(sheets), wb.total_rows, secs)
    return wb


# ---------------------------------------------------------------- in-memory store

class ExcelStore:
    def __init__(self) -> None:
        self._wb: Optional[Workbook] = None
        self._lock = threading.Lock()

    def load(self, path: Path) -> Workbook:
        with self._lock:
            wb = load_workbook(path)
            self._wb = wb  # swap atomically; readers keep the old copy until done
            return wb

    @property
    def workbook(self) -> Workbook:
        if self._wb is None:
            raise RuntimeError("Excel data is not loaded yet")
        return self._wb

    @property
    def loaded(self) -> bool:
        return self._wb is not None


store = ExcelStore()


# ---------------------------------------------------------------- querying

def _cell_text(v: Any) -> str:
    return "" if v is None else str(v)


def query_rows(
    sheet: Sheet,
    search: Optional[str] = None,
    filters: Optional[dict[str, str]] = None,
    page: int = 1,
    limit: int = 50,
) -> tuple[list[dict[str, Any]], int]:
    """Case-insensitive substring search over all cells, exact (case-insensitive) column filters, then paging."""
    rows = sheet.rows
    if filters:
        wanted = {col: str(val).strip().lower() for col, val in filters.items()}
        rows = [r for r in rows if all(_cell_text(r.get(c)).strip().lower() == v for c, v in wanted.items())]
    if search:
        q = search.strip().lower()
        rows = [r for r in rows if any(q in _cell_text(v).lower() for k, v in r.items() if k != ROW_ID)]
    total = len(rows)
    start = (page - 1) * limit
    return rows[start : start + limit], total
