#!/usr/bin/env python3
"""
Печатает SQL: UPDATE landuse_areas SET landuse, risk по scripts/landuse_mapping.json.
Неизвестный raw -> landuse 'Отсутствует', risk 'низкий'.
"""
from __future__ import annotations

import json
import sys
from pathlib import Path


def esc_literal(s: str) -> str:
    return s.replace("'", "''")


def main() -> None:
    root = Path(__file__).resolve().parent
    path = Path(sys.argv[1]) if len(sys.argv) > 1 else root / "landuse_mapping.json"
    data = json.loads(path.read_text(encoding="utf-8"))
    if not isinstance(data, dict):
        raise SystemExit("landuse_mapping.json: ожидается объект { osm_key: [label, risk], ... }")

    lines_l: list[str] = []
    lines_r: list[str] = []
    for raw_key, pair in sorted(data.items()):
        if not isinstance(pair, (list, tuple)) or len(pair) != 2:
            raise SystemExit(f"Неверное значение для ключа {raw_key!r}: ожидается [label, risk]")
        lbl, rsk = pair[0], pair[1]
        rk = esc_literal(str(raw_key))
        lines_l.append(f"    WHEN raw = '{rk}' THEN '{esc_literal(str(lbl))}'")
        lines_r.append(f"    WHEN raw = '{rk}' THEN '{esc_literal(str(rsk))}'")

    sql = (
        "UPDATE landuse_areas\n"
        "SET\n"
        "  landuse = CASE\n"
        + "\n".join(lines_l)
        + "\n    ELSE 'Отсутствует'\n"
        "  END,\n"
        "  risk = CASE\n"
        + "\n".join(lines_r)
        + "\n    ELSE 'низкий'\n"
        "  END;\n"
    )
    sys.stdout.write(sql)


if __name__ == "__main__":
    main()
