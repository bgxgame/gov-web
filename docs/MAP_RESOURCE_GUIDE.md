# 地图资源接入说明

## 1. 当前支持的资源模式
前端首页地图现在支持两种资源组织方式：

1. 通用兜底文件
- `public/map-data/province.geojson`
- `public/map-data/city.geojson`
- `public/map-data/county.geojson`

2. 分层精细文件
- 省级城市边界文件，例如：`public/map-data/陕西省_市.geojson`
- 市级区县边界文件，例如：`public/map-data/610100.geojson`
- 也支持同名 `.json` 文件

## 2. 推荐做法
### 2.1 有条件时优先使用 manifest
在 `public/map-data/` 下增加 `resource-manifest.json`，显式声明不同层级该加载哪个文件。

示例：

```json
{
  "city": {
    "陕西省": "/map-data/陕西省_市.geojson"
  },
  "county": {
    "610100": "/map-data/610100.geojson",
    "610900": "/map-data/610900.geojson"
  }
}
```

这样做的好处：
- 文件命名更灵活
- 后续替换资源不需要改前端代码
- 能优先加载更小的市县级文件，减少首页和下钻等待

### 2.2 不写 manifest 时的默认规则
当前前端默认直接使用三张总图，不再盲猜单城市或单区县文件：

- 省级：`province.geojson`
- 市级：`city.geojson`
- 区县级：`county.geojson`

这样更适合“只有三级总图”的项目现状，也能减少无效请求和错误噪声。

## 3. 当前系统行为
- 进入首页时，默认加载 `city.geojson`
- 从省下钻到市时，默认加载 `county.geojson`
- 如果存在 `resource-manifest.json`，会优先使用 manifest 指向的更细资源

## 4. 自动拆分工具
如果当前只有三张总图，但希望提前生成独立文件，可直接执行：

```bash
npm run map:split
```

脚本会自动生成：
- `public/map-data/split/provinces/<省adcode>.geojson`
- `public/map-data/split/city-groups/<省adcode>.geojson`
- `public/map-data/split/cities/<城市adcode>.geojson`
- `public/map-data/split/county-groups/<城市adcode>.geojson`
- `public/map-data/split/counties/<区县adcode>.geojson`
- `public/map-data/resource-manifest.json`

其中：
- `provinces` 目录提供单省边界文件
- `city-groups` 目录最适合首页省级总览直接使用
- `county-groups` 目录最适合当前首页地图下钻直接使用
- `counties` 目录适合后续继续做更细下钻或单区县专题页
- `cities` 目录保留为独立城市边界资产，便于后续扩展

## 5. 维护建议
- 建议统一使用 UTF-8 编码
- 建议优先采用行政区编码命名，如 `610100.geojson`
- 如果文件来源复杂，优先维护 `resource-manifest.json`
- 每次新增地图资源后，至少回归：
  - 首页加载
  - 省到市下钻
  - 市到县下钻
  - 项目详情弹窗
