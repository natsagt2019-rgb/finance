# -*- coding: utf-8 -*-
"""Ерөнхий журналаас нэгтгэсэн мөнгөн гүйлгээ (_cashflow.json) → seed SQL."""
import json

CF = "C:/finance 2.0/scripts/_cashflow.json"
OUT = "C:/finance 2.0/scripts/cashflow-2025.sql"
YEAR = 2025

agg = json.load(open(CF, encoding="utf-8"))
vals = [f"  ({YEAR}, 'annual', '{code}', {amt})" for code, amt in sorted(agg.items())]

sql = (
    "-- " + "=" * 58 + "\n"
    "-- cash_flow_lines seed — Түмэн Тээх 2025 мөнгөн гүйлгээ\n"
    f"-- Ерөнхий журналаас мөнгөн гүйлгээний кодоор нэгтгэсэн ({len(agg)} мөр).\n"
    "-- " + "=" * 58 + "\n\n"
    "DELETE FROM cash_flow_lines WHERE year = " + str(YEAR) + " AND period = 'annual';\n\n"
    "INSERT INTO cash_flow_lines (year, period, cf_code, amount) VALUES\n"
    + ",\n".join(vals) + ";\n"
)
open(OUT, "w", encoding="utf-8").write(sql)
print("written", OUT, "|", len(agg), "мөр")
