#!/usr/bin/env python3
# -*- coding: utf-8 -*-

"""
将省/市/区三级总图拆分为首页地图可直接使用的分片资源。

切分原则：
1. 优先依据原始 geojson 的几何归属关系分配区县 -> 城市
2. 仅在几何归属无法判定时，才退回行政区划 adcode 前缀兜底
3. 输出 manifest，供前端首页大屏优先命中分片资源
"""

from __future__ import annotations

import json
from pathlib import Path
from typing import Dict, Iterable, List, Optional, Tuple


ROOT = Path(__file__).resolve().parents[1]
MAP_DIR = ROOT / "public" / "map-data"
SPLIT_DIR = MAP_DIR / "split"
PROVINCE_DIR = SPLIT_DIR / "provinces"
CITY_GROUP_DIR = SPLIT_DIR / "city-groups"
CITY_DIR = SPLIT_DIR / "cities"
COUNTY_GROUP_DIR = SPLIT_DIR / "county-groups"
COUNTY_DIR = SPLIT_DIR / "counties"
MANIFEST_PATH = MAP_DIR / "resource-manifest.json"
INDEX_PATH = SPLIT_DIR / "index.json"
CHECKLIST_PATH = SPLIT_DIR / "city-county-checklist.md"


def load_geojson(path: Path) -> dict:
    return json.loads(path.read_text(encoding="utf-8"))


def save_json(path: Path, payload: dict) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8")


def save_geojson(path: Path, features: Iterable[dict]) -> None:
    save_json(
        path,
        {
            "type": "FeatureCollection",
            "features": list(features),
        },
    )


def clean_geojson_dir(path: Path) -> None:
    path.mkdir(parents=True, exist_ok=True)
    for child in path.glob("*.geojson"):
        child.unlink()


def extract_adcode(feature: dict) -> str:
    props = feature.get("properties", {})
    raw = str(props.get("adcode") or props.get("gb") or "").strip()
    digits = "".join(ch for ch in raw if ch.isdigit())
    return digits[-6:] if len(digits) >= 6 else digits


def extract_name(feature: dict) -> str:
    return str(feature.get("properties", {}).get("name") or "").strip()


def city_adcode_from_county_adcode(county_adcode: str) -> str:
    if len(county_adcode) < 4:
        return ""
    return f"{county_adcode[:4]}00"


def province_adcode_from_city_adcode(city_adcode: str) -> str:
    if len(city_adcode) < 2:
        return ""
    return f"{city_adcode[:2]}0000"


def walk_coordinates(coordinates):
    if not isinstance(coordinates, list):
        return
    if coordinates and isinstance(coordinates[0], (int, float)):
        yield coordinates
        return
    for item in coordinates:
        yield from walk_coordinates(item)


def get_feature_center(feature: dict) -> Optional[Tuple[float, float]]:
    props = feature.get("properties", {})
    cp = props.get("cp")
    if isinstance(cp, list) and len(cp) >= 2:
        try:
            return float(cp[0]), float(cp[1])
        except (TypeError, ValueError):
            pass

    min_x = float("inf")
    min_y = float("inf")
    max_x = float("-inf")
    max_y = float("-inf")

    for point in walk_coordinates(feature.get("geometry", {}).get("coordinates")):
        try:
            x = float(point[0])
            y = float(point[1])
        except (TypeError, ValueError, IndexError):
            continue
        min_x = min(min_x, x)
        min_y = min(min_y, y)
        max_x = max(max_x, x)
        max_y = max(max_y, y)

    if not all(value not in (float("inf"), float("-inf")) for value in [min_x, min_y, max_x, max_y]):
        return None
    return ((min_x + max_x) / 2, (min_y + max_y) / 2)


def point_in_ring(point: Tuple[float, float], ring: List[List[float]]) -> bool:
    x, y = point
    inside = False
    ring_length = len(ring)
    if ring_length < 3:
        return False

    for index in range(ring_length):
        x1, y1 = ring[index]
        x2, y2 = ring[(index + 1) % ring_length]
        intersects = ((y1 > y) != (y2 > y)) and (
            x < (x2 - x1) * (y - y1) / ((y2 - y1) or 1e-12) + x1
        )
        if intersects:
            inside = not inside
    return inside


def point_in_polygon(point: Tuple[float, float], polygon: List[List[List[float]]]) -> bool:
    if not polygon:
      return False
    outer = polygon[0]
    if not point_in_ring(point, outer):
        return False
    for hole in polygon[1:]:
        if point_in_ring(point, hole):
            return False
    return True


def point_in_feature(point: Tuple[float, float], feature: dict) -> bool:
    geometry = feature.get("geometry", {})
    geometry_type = geometry.get("type")
    coordinates = geometry.get("coordinates", [])

    if geometry_type == "Polygon":
        return point_in_polygon(point, coordinates)
    if geometry_type == "MultiPolygon":
        return any(point_in_polygon(point, polygon) for polygon in coordinates)
    return False


def split_province_features(province_geojson: dict) -> List[Tuple[str, str]]:
    result = []
    for feature in province_geojson.get("features", []):
        adcode = extract_adcode(feature)
        name = extract_name(feature)
        if not adcode:
            continue
        save_geojson(PROVINCE_DIR / f"{adcode}.geojson", [feature])
        result.append((adcode, name))
    return result


def split_city_features(city_geojson: dict) -> List[Tuple[str, str]]:
    result = []
    for feature in city_geojson.get("features", []):
        adcode = extract_adcode(feature)
        name = extract_name(feature)
        if not adcode:
            continue
        save_geojson(CITY_DIR / f"{adcode}.geojson", [feature])
        result.append((adcode, name))
    return result


def split_county_features(county_geojson: dict) -> List[Tuple[str, str]]:
    result = []
    for feature in county_geojson.get("features", []):
        adcode = extract_adcode(feature)
        name = extract_name(feature)
        if not adcode:
            continue
        save_geojson(COUNTY_DIR / f"{adcode}.geojson", [feature])
        result.append((adcode, name))
    return result


def group_city_features_by_province(city_geojson: dict) -> Dict[str, List[dict]]:
    grouped: Dict[str, List[dict]] = {}
    for feature in city_geojson.get("features", []):
        city_adcode = extract_adcode(feature)
        province_adcode = province_adcode_from_city_adcode(city_adcode)
        if not province_adcode:
            continue
        grouped.setdefault(province_adcode, []).append(feature)
    return grouped


def assign_county_to_city_feature(county_feature: dict, city_features: List[dict]) -> Optional[str]:
    center = get_feature_center(county_feature)
    if center:
        for city_feature in city_features:
            if point_in_feature(center, city_feature):
                return extract_adcode(city_feature)

    county_adcode = extract_adcode(county_feature)
    fallback_city_adcode = city_adcode_from_county_adcode(county_adcode)
    return fallback_city_adcode or None


def group_county_features_by_city(county_geojson: dict, city_geojson: dict) -> Tuple[Dict[str, List[dict]], List[dict]]:
    grouped: Dict[str, List[dict]] = {}
    unassigned = []
    city_features = city_geojson.get("features", [])

    for feature in county_geojson.get("features", []):
        city_adcode = assign_county_to_city_feature(feature, city_features)
        if not city_adcode:
            unassigned.append(
                {
                    "countyAdcode": extract_adcode(feature),
                    "countyName": extract_name(feature),
                }
            )
            continue
        grouped.setdefault(city_adcode, []).append(feature)

    return grouped, unassigned


def save_group_geojson(path: Path, grouped: Dict[str, List[dict]]) -> Dict[str, str]:
    mapping: Dict[str, str] = {}
    for adcode, features in sorted(grouped.items()):
        target = path / f"{adcode}.geojson"
        save_geojson(target, features)
        mapping[adcode] = f"/map-data/{target.relative_to(MAP_DIR).as_posix()}"
    return mapping


def build_manifest(
    province_features: List[Tuple[str, str]],
    city_group_mapping: Dict[str, str],
    county_group_mapping: Dict[str, str],
    county_features: List[Tuple[str, str]],
) -> dict:
    province_adcode, province_name = province_features[0] if province_features else ("610000", "陕西省")
    province_resource = f"/map-data/split/provinces/{province_adcode}.geojson"
    city_group_resource = city_group_mapping.get(province_adcode, "")

    district_mapping = {
        county_adcode: f"/map-data/split/counties/{county_adcode}.geojson"
        for county_adcode, _ in county_features
    }

    return {
        "province": {
            province_adcode: province_resource,
            province_name: province_resource,
            "default": province_resource,
        },
        "city": {
            province_adcode: city_group_resource,
            province_name: city_group_resource,
            "default": city_group_resource,
        },
        "county": county_group_mapping,
        "district": district_mapping,
    }


def write_index(
    province_features: List[Tuple[str, str]],
    city_features: List[Tuple[str, str]],
    city_group_mapping: Dict[str, str],
    county_group_mapping: Dict[str, str],
    county_features: List[Tuple[str, str]],
    unassigned_counties: List[dict],
) -> None:
    save_json(
        INDEX_PATH,
        {
            "provinceFiles": [
                {
                    "adcode": adcode,
                    "name": name,
                    "path": f"/map-data/split/provinces/{adcode}.geojson",
                }
                for adcode, name in province_features
            ],
            "cityGroupFiles": [
                {
                    "provinceAdcode": adcode,
                    "path": path,
                }
                for adcode, path in sorted(city_group_mapping.items())
            ],
            "cityFiles": [
                {
                    "adcode": adcode,
                    "name": name,
                    "path": f"/map-data/split/cities/{adcode}.geojson",
                }
                for adcode, name in city_features
            ],
            "countyGroupFiles": [
                {
                    "cityAdcode": adcode,
                    "path": path,
                }
                for adcode, path in sorted(county_group_mapping.items())
            ],
            "countyFiles": [
                {
                    "adcode": adcode,
                    "name": name,
                    "path": f"/map-data/split/counties/{adcode}.geojson",
                }
                for adcode, name in county_features
            ],
            "unassignedCounties": unassigned_counties,
        },
    )


def write_city_county_checklist(city_geojson: dict, grouped_counties: Dict[str, List[dict]]) -> None:
    city_name_map = {
        extract_adcode(feature): extract_name(feature)
        for feature in city_geojson.get("features", [])
        if extract_adcode(feature)
    }
    sections = [
        "# 城市到区县核对表",
        "",
        "> 此文件由 `npm run map:refresh` 自动生成，用于人工核对城市与区县归属关系。",
        "",
    ]

    for city_adcode in sorted(grouped_counties.keys()):
        city_name = city_name_map.get(city_adcode, city_adcode)
        county_names = sorted(extract_name(feature) for feature in grouped_counties[city_adcode])
        sections.append(f"## {city_name}（{city_adcode}）")
        sections.append(f"- 区县数量：{len(county_names)}")
        sections.append("- 区县清单：" + "、".join(county_names))
        sections.append("")

    CHECKLIST_PATH.write_text("\n".join(sections), encoding="utf-8")


def main() -> None:
    province_geojson = load_geojson(MAP_DIR / "province.geojson")
    city_geojson = load_geojson(MAP_DIR / "city.geojson")
    county_geojson = load_geojson(MAP_DIR / "county.geojson")

    for directory in [PROVINCE_DIR, CITY_GROUP_DIR, CITY_DIR, COUNTY_GROUP_DIR, COUNTY_DIR]:
        clean_geojson_dir(directory)

    province_features = split_province_features(province_geojson)
    city_features = split_city_features(city_geojson)
    county_features = split_county_features(county_geojson)

    city_group_mapping = save_group_geojson(CITY_GROUP_DIR, group_city_features_by_province(city_geojson))
    grouped_counties, unassigned_counties = group_county_features_by_city(county_geojson, city_geojson)
    county_group_mapping = save_group_geojson(COUNTY_GROUP_DIR, grouped_counties)

    manifest = build_manifest(province_features, city_group_mapping, county_group_mapping, county_features)
    save_json(MANIFEST_PATH, manifest)
    write_index(
        province_features,
        city_features,
        city_group_mapping,
        county_group_mapping,
        county_features,
        unassigned_counties,
    )
    write_city_county_checklist(city_geojson, grouped_counties)

    print("地图分片已生成")
    print(f"省级单文件数量: {len(province_features)}")
    print(f"市级分组文件数量: {len(city_group_mapping)}")
    print(f"市级单文件数量: {len(city_features)}")
    print(f"区县分组文件数量: {len(county_group_mapping)}")
    print(f"区县单文件数量: {len(county_features)}")
    print(f"未能按几何归属定位的区县数量: {len(unassigned_counties)}")
    print(f"输出目录: {SPLIT_DIR}")
    print(f"资源清单: {MANIFEST_PATH}")
    print(f"中文核对表: {CHECKLIST_PATH}")


if __name__ == "__main__":
    main()
