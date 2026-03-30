param(
    [int]$KeepDays = 7,
    [int]$TotalSizeCapMb = 200
)

$logDir = Join-Path $PSScriptRoot "..\\logs"
if (-not (Test-Path $logDir)) {
    Write-Output "日志目录不存在，无需清理: $logDir"
    exit 0
}

$deadline = (Get-Date).AddDays(-$KeepDays)
Get-ChildItem -Path $logDir -File | Where-Object { $_.LastWriteTime -lt $deadline } | Remove-Item -Force

$totalSizeCapBytes = [long]$TotalSizeCapMb * 1MB
$files = Get-ChildItem -Path $logDir -File | Sort-Object LastWriteTime
$totalSize = ($files | Measure-Object -Property Length -Sum).Sum
if ($totalSize) {
    foreach ($file in $files) {
        if ($totalSize -le $totalSizeCapBytes) {
            break
        }
        $totalSize -= $file.Length
        Remove-Item -LiteralPath $file.FullName -Force -ErrorAction SilentlyContinue
    }
}

Write-Output ("前端日志清理完成，保留天数={0}，目录总量上限={1}MB。" -f $KeepDays, $TotalSizeCapMb)
