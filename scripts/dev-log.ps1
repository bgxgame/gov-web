$logDir = Join-Path $PSScriptRoot "..\\logs"
if (-not (Test-Path $logDir)) {
    New-Item -Path $logDir -ItemType Directory | Out-Null
}

$timestamp = Get-Date -Format "yyyyMMdd-HHmmss"
$logFile = Join-Path $logDir "frontend-dev-$timestamp.log"

Write-Output "前端开发日志输出到: $logFile"
npm run dev *>&1 | Tee-Object -FilePath $logFile
