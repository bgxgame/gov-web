#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
根据当前地图分片结果生成前端复用的省市区树。

为什么需要这个脚本：
1. 避免项目表单继续使用手填省市区，减少录入错误。
2. 让前端下拉选项直接复用地图切分结果，保持地图展示与表单输入一致。
3. 后续地图资源刷新后，只要重新执行脚本即可同步更新前端静态数据。
"""

from __future__ import annotations

import json
from pathlib import Path


ROOT = Path(__file__).resolve().parent.parent
SPLIT_INDEX_PATH = ROOT / "public" / "map-data" / "split" / "index.json"
OUTPUT_PATH = ROOT / "src" / "constants" / "region-tree.js"


def load_json(path: Path):
    with path.open("r", encoding="utf-8") as file:
        return json.load(file)


def resolve_public_path(site_path: str):
    normalized = str(site_path or "").strip().lstrip("/")
    return ROOT / "public" / Path(normalized.replace("/", "/"))


def to_adcode(value):
    text = str(value or "").strip()
    digits = "".join(ch for ch in text if ch.isdigit())
    if len(digits) >= 6:
        return digits[-6:]
    return ""


def build_tree():
    split_index = load_json(SPLIT_INDEX_PATH)

    province_files = split_index.get("provinceFiles", [])
    city_files = split_index.get("cityFiles", [])

    if not province_files:
        raise RuntimeError("未找到省级地图分片，无法生成省市区树")

    province = province_files[0]
    county_group_map = {
        str(item["cityAdcode"]): item["path"].lstrip("/")
        for item in split_index.get("countyGroupFiles", [])
    }

    cities = []
    for city in city_files:
        city_adcode = str(city["adcode"])
        county_path = county_group_map.get(city_adcode)
        districts = []

        if county_path:
            county_geojson = load_json(resolve_public_path(county_path))
            for feature in county_geojson.get("features", []):
                properties = feature.get("properties", {})
                district_name = str(properties.get("name") or "").strip()
                district_adcode = to_adcode(properties.get("gb"))
                if not district_name:
                    continue
                districts.append(
                    {
                        "label": district_name,
                        "value": district_name,
                        "adcode": district_adcode or None,
                    }
                )

        cities.append(
            {
                "label": city["name"],
                "value": city["name"],
                "adcode": city_adcode,
                "districts": districts,
            }
        )

    return [
        {
            "label": province["name"],
            "value": province["name"],
            "adcode": str(province["adcode"]),
            "cities": cities,
        }
    ]


def to_js_literal(data):
    return json.dumps(data, ensure_ascii=False, indent=2)


def write_output(region_tree):
    OUTPUT_PATH.parent.mkdir(parents=True, exist_ok=True)
    content = (
        "/**\n"
        " * 省市区静态树。\n"
        " *\n"
        " * 生成来源：`public/map-data/split` 分片结果。\n"
        " * 刷新命令：`npm run region:sync`\n"
        " * 请勿手工修改，地图资源更新后请重新生成。\n"
        " */\n"
        f"export const REGION_TREE = {to_js_literal(region_tree)}\n"
    )
    OUTPUT_PATH.write_text(content, encoding="utf-8", newline="\n")


if __name__ == "__main__":
    tree = build_tree()
    write_output(tree)
    province_count = len(tree)
    city_count = sum(len(item.get("cities", [])) for item in tree)
    district_count = sum(len(city.get("districts", [])) for item in tree for city in item.get("cities", []))
    print(f"已生成前端省市区树：省 {province_count} 个，市 {city_count} 个，区县 {district_count} 个")
