#!/usr/bin/env python3
# -*- coding: utf-8 -*-

"""
校验 resource-manifest 与 split 目录是否一致，避免地图资源更新后映射失效。
"""

from __future__ import annotations

import json
import sys
from pathlib import Path
from typing import Dict, List


ROOT = Path(__file__).resolve().parents[1]
MAP_DIR = ROOT / "public" / "map-data"
MANIFEST_PATH = MAP_DIR / "resource-manifest.json"
CITY_PATH = MAP_DIR / "city.geojson"
COUNTY_PATH = MAP_DIR / "county.geojson"


def load_json(path: Path) -> dict:
    return json.loads(path.read_text(encoding="utf-8"))


def extract_adcode(feature: dict) -> str:
    props = feature.get("properties", {})
    raw = str(props.get("adcode") or props.get("gb") or "").strip()
    digits = "".join(ch for ch in raw if ch.isdigit())
    return digits[-6:] if len(digits) >= 6 else digits


def relative_map_path_to_file(path: str) -> Path:
    normalized = str(path or "").strip()
    if not normalized.startswith("/map-data/"):
        raise ValueError(f"资源路径必须以 /map-data/ 开头：{normalized}")
    return MAP_DIR / normalized.replace("/map-data/", "", 1)


def collect_city_adcodes() -> List[str]:
    city_geojson = load_json(CITY_PATH)
    return sorted(extract_adcode(feature) for feature in city_geojson.get("features", []) if extract_adcode(feature))


def collect_county_adcodes() -> List[str]:
    county_geojson = load_json(COUNTY_PATH)
    return sorted(extract_adcode(feature) for feature in county_geojson.get("features", []) if extract_adcode(feature))


def walk_coordinates(coordinates):
    if not isinstance(coordinates, list):
        return
    if coordinates and isinstance(coordinates[0], (int, float)):
        yield coordinates
        return
    for item in coordinates:
        yield from walk_coordinates(item)


def get_feature_center(feature: dict):
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


def point_in_ring(point, ring):
    x, y = point
    inside = False
    if len(ring) < 3:
        return False
    for index in range(len(ring)):
        x1, y1 = ring[index]
        x2, y2 = ring[(index + 1) % len(ring)]
        intersects = ((y1 > y) != (y2 > y)) and (
            x < (x2 - x1) * (y - y1) / ((y2 - y1) or 1e-12) + x1
        )
        if intersects:
            inside = not inside
    return inside


def point_in_polygon(point, polygon):
    if not polygon:
        return False
    if not point_in_ring(point, polygon[0]):
        return False
    for hole in polygon[1:]:
        if point_in_ring(point, hole):
            return False
    return True


def point_in_feature(point, feature):
    geometry = feature.get("geometry", {})
    geometry_type = geometry.get("type")
    coordinates = geometry.get("coordinates", [])
    if geometry_type == "Polygon":
        return point_in_polygon(point, coordinates)
    if geometry_type == "MultiPolygon":
        return any(point_in_polygon(point, polygon) for polygon in coordinates)
    return False


def assign_county_to_city_adcode(county_feature: dict, city_features: List[dict]) -> str:
    center = get_feature_center(county_feature)
    if center:
        for city_feature in city_features:
            if point_in_feature(center, city_feature):
                return extract_adcode(city_feature)
    county_adcode = extract_adcode(county_feature)
    return f"{county_adcode[:4]}00" if len(county_adcode) >= 4 else ""


def validate_manifest_file_exists(manifest: dict, errors: List[str]) -> None:
    for level, mapping in manifest.items():
        if not isinstance(mapping, dict):
            errors.append(f"{level} 层级映射必须是对象")
            continue
        for key, resource in mapping.items():
            if not resource:
                errors.append(f"{level}.{key} 资源路径为空")
                continue
            try:
                target = relative_map_path_to_file(resource)
            except ValueError as error:
                errors.append(str(error))
                continue
            if not target.exists():
                errors.append(f"{level}.{key} 指向的文件不存在：{resource}")


def validate_manifest_coverage(manifest: dict, errors: List[str]) -> None:
    city_adcodes = collect_city_adcodes()
    county_adcodes = collect_county_adcodes()

    for adcode in city_adcodes:
        if adcode not in manifest.get("county", {}):
            errors.append(f"county 映射缺少城市 {adcode} 的区县分组文件")

    for adcode in county_adcodes:
        if adcode not in manifest.get("district", {}):
            errors.append(f"district 映射缺少区县 {adcode} 的单文件")


def validate_group_file_contents(manifest: dict, errors: List[str]) -> None:
    county_geojson = load_json(COUNTY_PATH)
    city_geojson = load_json(CITY_PATH)
    city_features = city_geojson.get("features", [])
    expected_group: Dict[str, List[str]] = {}
    for feature in county_geojson.get("features", []):
        county_adcode = extract_adcode(feature)
        city_adcode = assign_county_to_city_adcode(feature, city_features)
        expected_group.setdefault(city_adcode, []).append(county_adcode)

    for city_adcode, resource in manifest.get("county", {}).items():
        target = relative_map_path_to_file(resource)
        geojson = load_json(target)
        actual = sorted(extract_adcode(feature) for feature in geojson.get("features", []) if extract_adcode(feature))
        expected = sorted(expected_group.get(city_adcode, []))
        if actual != expected:
            errors.append(f"城市 {city_adcode} 的区县分组文件内容与原始 county.geojson 不一致")

    for county_adcode, resource in manifest.get("district", {}).items():
        target = relative_map_path_to_file(resource)
        geojson = load_json(target)
        actual = [extract_adcode(feature) for feature in geojson.get("features", []) if extract_adcode(feature)]
        if actual != [county_adcode]:
            errors.append(f"区县 {county_adcode} 的单文件内容不正确")


def main() -> int:
    if not MANIFEST_PATH.exists():
      print("resource-manifest.json 不存在", file=sys.stderr)
      return 1

    manifest = load_json(MANIFEST_PATH)
    errors: List[str] = []

    validate_manifest_file_exists(manifest, errors)
    validate_manifest_coverage(manifest, errors)
    validate_group_file_contents(manifest, errors)

    if errors:
        print("地图资源校验失败：", file=sys.stderr)
        for item in errors:
            print(f"- {item}", file=sys.stderr)
        return 1

    print("地图资源校验通过")
    print(f"manifest: {MANIFEST_PATH}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
