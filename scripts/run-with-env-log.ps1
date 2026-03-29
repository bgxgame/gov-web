param(
    [ValidateSet("dev", "build")]
    [string]$Mode = "dev",
    [switch]$ForceLog
)

$ErrorActionPreference = "Stop"

function Read-EnvFile {
    param(
        [string]$Path
    )
    $envMap = @{}
    if (-not (Test-Path $Path)) {
        return $envMap
    }

    Get-Content -Path $Path -Encoding UTF8 | ForEach-Object {
        $line = $_.Trim()
        if (-not $line -or $line.StartsWith("#")) {
            return
        }
        $index = $line.IndexOf("=")
        if ($index -le 0) {
            return
        }
        $key = $line.Substring(0, $index).Trim()
        $value = $line.Substring($index + 1).Trim()
        if (($value.StartsWith("'") -and $value.EndsWith("'")) -or ($value.StartsWith('"') -and $value.EndsWith('"'))) {
            $value = $value.Substring(1, $value.Length - 2)
        }
        if ($key) {
            $envMap[$key] = $value
        }
    }
    return $envMap
}

function To-Bool {
    param(
        [string]$Value
    )
    if (-not $Value) {
        return $false
    }
    return @("1", "true", "yes", "on") -contains $Value.Trim().ToLowerInvariant()
}

function Resolve-LogDir {
    param(
        [string]$ProjectRoot,
        [string]$ConfiguredDir
    )
    if (-not $ConfiguredDir) {
        return Join-Path $ProjectRoot "logs"
    }
    if ([System.IO.Path]::IsPathRooted($ConfiguredDir)) {
        return $ConfiguredDir
    }
    return Join-Path $ProjectRoot $ConfiguredDir
}

function Invoke-NpxCommand {
    param(
        [string[]]$Arguments,
        [string]$LogFilePath = ""
    )

    $cmdLine = "npx " + ($Arguments -join " ")
    if ($LogFilePath) {
        & cmd.exe /d /c "$cmdLine 2>&1" | Tee-Object -FilePath $LogFilePath
        return $LASTEXITCODE
    }
    & cmd.exe /d /c $cmdLine
    return $LASTEXITCODE
}

$projectRoot = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
$envPath = Join-Path $projectRoot ".env"
$envMap = Read-EnvFile -Path $envPath

$logEnabledValue = $envMap["VITE_APP_ENABLE_FILE_LOG"]
if ($null -eq $logEnabledValue -or [string]::IsNullOrWhiteSpace($logEnabledValue)) {
    $logEnabledValue = "true"
}
$logEnabled = $ForceLog -or (To-Bool -Value $logEnabledValue)
$logDir = Resolve-LogDir -ProjectRoot $projectRoot -ConfiguredDir $envMap["VITE_APP_LOG_DIR"]
$timestamp = Get-Date -Format "yyyyMMdd-HHmmss"
$logPrefix = if ($Mode -eq "build") { "frontend-build" } else { "frontend-dev" }
$logFile = Join-Path $logDir "$logPrefix-$timestamp.log"

if ($Mode -eq "build") {
    $args = @("vite", "build")
} else {
    $args = @("vite")
}

if ($logEnabled) {
    if (-not (Test-Path $logDir)) {
        New-Item -Path $logDir -ItemType Directory | Out-Null
    }
    Write-Output "Frontend ${Mode} log file: $logFile"
    $exitCode = Invoke-NpxCommand -Arguments $args -LogFilePath $logFile
    exit $exitCode
}

Write-Output "File logging disabled (VITE_APP_ENABLE_FILE_LOG=false); output goes to current terminal only."
$exitCode = Invoke-NpxCommand -Arguments $args
exit $exitCode
