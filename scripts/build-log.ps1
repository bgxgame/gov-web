$logDir = Join-Path $PSScriptRoot "..\\logs"
if (-not (Test-Path $logDir)) {
    New-Item -Path $logDir -ItemType Directory | Out-Null
}

$timestamp = Get-Date -Format "yyyyMMdd-HHmmss"
$logFile = Join-Path $logDir "frontend-build-$timestamp.log"

Write-Output "前端构建日志输出到: $logFile"
npm run build *>&1 | Tee-Object -FilePath $logFile
