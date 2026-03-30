#!/usr/bin/env python3
# -*- coding: utf-8 -*-

"""
将省/市/区三级总图拆分为首页地图可直接使用的分片资源。

输出目录：
1. split/provinces/<省adcode>.geojson
   - 单省 feature
2. split/city-groups/<省adcode>.geojson
   - 某省下属全部市级 feature，适合首页省级总览
3. split/cities/<市adcode>.geojson
   - 单市 feature
4. split/county-groups/<市adcode>.geojson
   - 某市下属全部区县 feature，适合市级下钻
5. split/counties/<区县adcode>.geojson
   - 单区县 feature
6. resource-manifest.json
   - 前端按层级优先命中这些 split 资源
"""

from __future__ import annotations

import json
from pathlib import Path
from typing import Dict, Iterable, List, Tuple


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


def load_geojson(path: Path) -> dict:
    return json.loads(path.read_text(encoding="utf-8"))


def save_json(path: Path, payload: dict) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(
        json.dumps(payload, ensure_ascii=False, indent=2),
        encoding="utf-8",
    )


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


def group_city_features_by_province(city_geojson: dict) -> Dict[str, List[dict]]:
    grouped: Dict[str, List[dict]] = {}
    for feature in city_geojson.get("features", []):
        city_adcode = extract_adcode(feature)
        province_adcode = province_adcode_from_city_adcode(city_adcode)
        if not province_adcode:
            continue
        grouped.setdefault(province_adcode, []).append(feature)
    return grouped


def group_county_features_by_city(county_geojson: dict) -> Dict[str, List[dict]]:
    grouped: Dict[str, List[dict]] = {}
    for feature in county_geojson.get("features", []):
        county_adcode = extract_adcode(feature)
        city_adcode = city_adcode_from_county_adcode(county_adcode)
        if not city_adcode:
            continue
        grouped.setdefault(city_adcode, []).append(feature)
    return grouped


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


def save_group_geojson(path: Path, grouped: Dict[str, List[dict]]) -> Dict[str, str]:
    mapping: Dict[str, str] = {}
    for adcode, features in sorted(grouped.items()):
        target = path / f"{adcode}.geojson"
        save_geojson(target, features)
        mapping[adcode] = str(target.relative_to(MAP_DIR)).replace("\\", "/")
    return mapping


def build_manifest(
    province_features: List[Tuple[str, str]],
    city_group_mapping: Dict[str, str],
    county_group_mapping: Dict[str, str],
) -> dict:
    province_feature = province_features[0] if province_features else ("610000", "陕西省")
    province_adcode, province_name = province_feature

    province_resource = f"/map-data/{(PROVINCE_DIR / f'{province_adcode}.geojson').relative_to(MAP_DIR).as_posix()}"
    city_group_resource = city_group_mapping.get(province_adcode, "")

    return {
        "province": {
            province_adcode: province_resource,
            province_name: province_resource,
            "default": province_resource,
        },
        "city": {
            province_adcode: f"/map-data/{city_group_resource}" if city_group_resource else "",
            province_name: f"/map-data/{city_group_resource}" if city_group_resource else "",
            "default": f"/map-data/{city_group_resource}" if city_group_resource else "",
        },
        "county": {
            adcode: f"/map-data/{path}"
            for adcode, path in county_group_mapping.items()
        },
    }


def write_index(
    province_features: List[Tuple[str, str]],
    city_features: List[Tuple[str, str]],
    city_group_mapping: Dict[str, str],
    county_group_mapping: Dict[str, str],
    county_features: List[Tuple[str, str]],
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
                    "path": f"/map-data/{path}",
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
                    "path": f"/map-data/{path}",
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
        },
    )


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
    county_group_mapping = save_group_geojson(COUNTY_GROUP_DIR, group_county_features_by_city(county_geojson))

    manifest = build_manifest(province_features, city_group_mapping, county_group_mapping)
    save_json(MANIFEST_PATH, manifest)
    write_index(province_features, city_features, city_group_mapping, county_group_mapping, county_features)

    print("地图分片已生成")
    print(f"省级单文件数量: {len(province_features)}")
    print(f"市级分组文件数量: {len(city_group_mapping)}")
    print(f"市级单文件数量: {len(city_features)}")
    print(f"区县分组文件数量: {len(county_group_mapping)}")
    print(f"区县单文件数量: {len(county_features)}")
    print(f"输出目录: {SPLIT_DIR}")
    print(f"资源清单: {MANIFEST_PATH}")


if __name__ == "__main__":
    main()
