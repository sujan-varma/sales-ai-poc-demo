"""Sales KPIs computed from the workbook (retailer master + actual/target value + credit sheets).

Joins:
  * "9. Target Sales Value" has the same rows in the same order as "4. Retailer_Master" -> joined by position
    (the master has a few duplicate retailer_ids for new "NR..." retailers, so an id join would double count).
  * "8. Actual Sales Value" and "5. Retailer Credit" have unique retailer_ids -> joined by id.
All money values are in rupees, unrounded.
"""

from __future__ import annotations

from typing import Any, Optional

import pandas as pd

from app.services.excel_data import Workbook

MASTER = "4. Retailer_Master"
TARGET = "9. Target Sales Value"
ACTUAL = "8. Actual Sales Value"
CREDIT = "5. Retailer Credit"
PRODUCTS = "2. Products"

SEP_MTD = "Sep-26 MTD (till 20th)"
SEP_FULL = "Sep-26"
MONTHS = ["Apr-26", "May-26", "Jun-26", "Jul-26", "Aug-26"]
AS_OF = "2026-09-20"

DIMENSIONS = {
    "asm": "ASM Name",
    "territory": "Territory",
    "sales_officer": "Sales officer name",
    "distributor_id": "Distributor ID",
}

CR_OUTSTANDING = "Outstanding as on 20th Sep (Due+ Overdue)"
CR_OVERDUE = "Outstanding as on 20th Sep (Overdue outside credit period)"
CR_LIMIT = "Credit limit value"
CR_RISK = "Risk category (High medium low no)"
CR_BOUNCES = "Cheque bounces in last 6 months"


def _num(s: pd.Series) -> pd.Series:
    return pd.to_numeric(s, errors="coerce")


def _sum(s: pd.Series) -> float:
    v = _num(s).sum(min_count=1)
    return 0.0 if pd.isna(v) else float(v)


def _pct(a: float, b: float) -> Optional[float]:
    return a / b * 100 if b else None


def _frame(wb: Workbook) -> pd.DataFrame:
    """One row per master retailer with the value/credit columns needed for KPIs."""
    master = wb.sheets[MASTER].df.reset_index(drop=True)
    target = wb.sheets[TARGET].df.reset_index(drop=True)
    actual = wb.sheets[ACTUAL].df.set_index("retailer_id")
    credit = wb.sheets[CREDIT].df.set_index("retailer_id")

    if len(master) != len(target) or not (master["retailer_id"].values == target["retailer_id"].values).all():
        raise ValueError(f"'{TARGET}' rows no longer line up with '{MASTER}'")

    base = master[["retailer_id", "retailer_name", *DIMENSIONS.values()]]
    ids = base["retailer_id"]

    tcols = [c for c in target.columns if " / " in c]
    t = target[tcols].apply(_num).add_prefix("t:")

    acols = [c for c in actual.columns if " / " in c]
    a = actual[acols].apply(_num).reindex(ids).reset_index(drop=True).add_prefix("a:")

    ccols = [CR_OUTSTANDING, CR_OVERDUE, CR_LIMIT, CR_BOUNCES]
    c = credit[ccols].apply(_num).reindex(ids).reset_index(drop=True).add_prefix("c:")

    extra = pd.DataFrame({
        "c:risk": credit[CR_RISK].reindex(ids).values,
        "has_actuals": ids.isin(actual.index).values,
    })
    return pd.concat([base, t, a, c, extra], axis=1)


def _sales_block(f: pd.DataFrame) -> dict[str, Any]:
    tgt = _sum(f.get(f"t:{SEP_FULL} / Total", pd.Series(dtype=float)))
    mtd_tgt = _sum(f.get(f"t:{SEP_MTD} / Total", pd.Series(dtype=float)))
    act = _sum(f.get(f"a:{SEP_MTD} / Total", pd.Series(dtype=float)))
    return {
        "retailers": int(len(f)),
        "sep_target_value": tgt,
        "sep_mtd_target_value": mtd_tgt,
        "sep_mtd_actual_value": act,
        "sep_achievement_pct": _pct(act, tgt),
        "sep_mtd_achievement_pct": _pct(act, mtd_tgt),
        "sep_gap_value": tgt - act,
    }


def _breakdown(f: pd.DataFrame, col: str) -> list[dict[str, Any]]:
    out = []
    for key, g in f.groupby(col, dropna=False, sort=True):
        out.append({"name": None if pd.isna(key) else key, **_sales_block(g)})
    return out


def compute_summary(wb: Workbook, filters: Optional[dict[str, str]] = None) -> dict[str, Any]:
    f = _frame(wb)
    scope = {k: v for k, v in (filters or {}).items() if v}
    for key, val in scope.items():
        col = DIMENSIONS[key]
        f = f[f[col].astype(str).str.strip().str.lower() == val.strip().lower()]

    products = wb.sheets[PRODUCTS].df
    # the sheet has a second, transposed price table below the SKU list; real SKU rows have a numeric price
    sku_cat = {
        r["sku_id"]: r["category"]
        for _, r in products.iterrows()
        if isinstance(r.get("sku_id"), str)
        and isinstance(r.get("category"), str)
        and isinstance(r.get("Retailer price"), (int, float))
    }

    monthly = []
    for m in MONTHS:
        a, t = _sum(f.get(f"a:{m} / Total", pd.Series(dtype=float))), _sum(f.get(f"t:{m} / Total", pd.Series(dtype=float)))
        monthly.append({"period": m, "actual_value": a, "target_value": t, "achievement_pct": _pct(a, t)})
    s = _sales_block(f)
    monthly.append({
        "period": SEP_MTD,
        "actual_value": s["sep_mtd_actual_value"],
        "target_value": s["sep_target_value"],
        "mtd_target_value": s["sep_mtd_target_value"],
        "achievement_pct": s["sep_achievement_pct"],
    })

    cats: dict[str, dict[str, float]] = {}
    for sku, cat in sku_cat.items():
        c = cats.setdefault(cat, {"sep_mtd_actual_value": 0.0, "sep_target_value": 0.0, "sep_mtd_target_value": 0.0})
        c["sep_mtd_actual_value"] += _sum(f.get(f"a:{SEP_MTD} / {sku}", pd.Series(dtype=float)))
        c["sep_target_value"] += _sum(f.get(f"t:{SEP_FULL} / {sku}", pd.Series(dtype=float)))
        c["sep_mtd_target_value"] += _sum(f.get(f"t:{SEP_MTD} / {sku}", pd.Series(dtype=float)))
    by_category = [
        {"category": k, **v, "sep_achievement_pct": _pct(v["sep_mtd_actual_value"], v["sep_target_value"])}
        for k, v in cats.items()
    ]

    yearly = _sum(f.get("t:Yearly target / Total", pd.Series(dtype=float)))
    h1 = _sum(f.get("t:H1 target / Total", pd.Series(dtype=float)))
    htd = _sum(f.get("a:Q1 Total (Apr to Jun) / Total", pd.Series(dtype=float))) + _sum(
        f.get("a:Q2 Total till 20th Sep / Total", pd.Series(dtype=float))
    )

    overdue = _num(f[f"c:{CR_OVERDUE}"])
    risk = f["c:risk"].dropna().value_counts().to_dict()

    return {
        "as_of": AS_OF,
        "scope": scope,
        "counts": {
            "retailers": int(len(f)),
            "retailers_with_actuals": int(f["has_actuals"].sum()),
            "distributors": int(f["Distributor ID"].nunique()),
            "asms": int(f["ASM Name"].nunique()),
            "territories": int(f["Territory"].nunique()),
            "sales_officers": int(f["Sales officer name"].nunique()),
        },
        "sales": s,
        "half_year": {
            "yearly_target_value": yearly,
            "h1_target_value": h1,
            "htd_actual_value": htd,
            "h1_achievement_pct": _pct(htd, h1),
        },
        "monthly": monthly,
        "by_category": by_category,
        "credit": {
            "outstanding_value": _sum(f[f"c:{CR_OUTSTANDING}"]),
            "overdue_value": _sum(f[f"c:{CR_OVERDUE}"]),
            "credit_limit_value": _sum(f[f"c:{CR_LIMIT}"]),
            "retailers_overdue": int((overdue > 0).sum()),
            "cheque_bounces_6m": int(_sum(f[f"c:{CR_BOUNCES}"])),
            "risk_categories": {str(k): int(v) for k, v in risk.items()},
        },
        "by_asm": _breakdown(f, "ASM Name"),
        "by_territory": _breakdown(f, "Territory"),
        "by_sales_officer": _breakdown(f, "Sales officer name"),
    }
