param(
    [int]$KeepDays = 7
)

$logDir = Join-Path $PSScriptRoot "..\\logs"
if (-not (Test-Path $logDir)) {
    Write-Output "日志目录不存在，无需清理: $logDir"
    exit 0
}

$deadline = (Get-Date).AddDays(-$KeepDays)
Get-ChildItem -Path $logDir -File | Where-Object { $_.LastWriteTime -lt $deadline } | Remove-Item -Force
Write-Output "已清理 $KeepDays 天前的前端日志文件。"
