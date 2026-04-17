param(
    [switch]$Build,
    [string]$OutputFile = ""
)

$ErrorActionPreference = "Stop"

function New-Utf8NoBomEncoding {
    return New-Object System.Text.UTF8Encoding($false)
}

function Write-Utf8NoBomFile {
    param(
        [string]$Path,
        [string]$Content
    )

    $dir = Split-Path -Parent $Path
    if ($dir -and -not (Test-Path -LiteralPath $dir)) {
        New-Item -ItemType Directory -Path $dir | Out-Null
    }
    [System.IO.File]::WriteAllText($Path, $Content, (New-Utf8NoBomEncoding))
}

function Format-Bytes {
    param([long]$Bytes)

    if ($Bytes -ge 1MB) { return ("{0:N2} MB" -f ($Bytes / 1MB)) }
    if ($Bytes -ge 1KB) { return ("{0:N2} KB" -f ($Bytes / 1KB)) }
    return ("{0} B" -f $Bytes)
}

$projectRoot = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
$assetsDir = Join-Path $projectRoot "dist\\assets"
$logsDir = Join-Path $projectRoot "logs"

if ($Build) {
    & powershell -ExecutionPolicy Bypass -File (Join-Path $PSScriptRoot "run-with-env-log.ps1") -Mode build
    if ($LASTEXITCODE -ne 0) {
        exit $LASTEXITCODE
    }
}

if (-not (Test-Path -LiteralPath $assetsDir)) {
    throw "未发现 dist/assets，请先执行 npm run build，或直接使用 npm run build:stats 自动构建。"
}

$files = Get-ChildItem -Path $assetsDir -File | Sort-Object Length -Descending
$totalBytes = ($files | Measure-Object -Property Length -Sum).Sum
if (-not $totalBytes) {
    $totalBytes = 0
}

$jsFiles = $files | Where-Object { $_.Extension -eq ".js" }
$cssFiles = $files | Where-Object { $_.Extension -eq ".css" }
$topFiles = $files | Select-Object -First 10
$largestJs = $jsFiles | Select-Object -First 5
$generatedAt = Get-Date -Format "yyyy-MM-dd HH:mm:ss"

$reportLines = @(
    "# 前端构建体积报告",
    "",
    "- 生成时间：$generatedAt",
    "- 产物目录：dist/assets",
    "- 文件总数：$($files.Count)",
    "- 总体积：$(Format-Bytes $totalBytes)",
    "- JS 文件数：$($jsFiles.Count)",
    "- CSS 文件数：$($cssFiles.Count)",
    ""
)

$reportLines += "## 最大文件 Top 10"
foreach ($file in $topFiles) {
    $reportLines += "- $($file.Name)：$(Format-Bytes $file.Length)"
}
$reportLines += ""
$reportLines += "## 最大 JS 文件 Top 5"
foreach ($file in $largestJs) {
    $reportLines += "- $($file.Name)：$(Format-Bytes $file.Length)"
}
$reportLines += ""
$reportLines += "## 说明"
$reportLines += "- 如果主包或地图相关包明显增长，需要回看最近的地图资源、UI 组件引入和路由拆包策略。"
$reportLines += "- 该报告适合与前一次报告对比，观察体积回升是否异常。"

if (-not $OutputFile) {
    $OutputFile = Join-Path $logsDir "build-stats-latest.md"
}

Write-Utf8NoBomFile -Path $OutputFile -Content ($reportLines -join [Environment]::NewLine)
Write-Output ("构建体积报告已生成：{0}" -f $OutputFile)
