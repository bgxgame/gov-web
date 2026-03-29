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

function Resolve-PositiveInt {
    param(
        [string]$Value,
        [int]$DefaultValue
    )
    $parsed = 0
    if ([int]::TryParse(($Value | Out-String).Trim(), [ref]$parsed) -and $parsed -gt 0) {
        return $parsed
    }
    return $DefaultValue
}

function New-Utf8NoBomEncoding {
    return New-Object System.Text.UTF8Encoding($false)
}

function Get-LogFilePath {
    param(
        [string]$LogDir,
        [string]$LogPrefix,
        [string]$Timestamp,
        [int]$Sequence
    )
    return Join-Path $LogDir ("{0}-{1}-{2}.log" -f $LogPrefix, $Timestamp, $Sequence.ToString("00"))
}

function Open-LogWriter {
    param(
        [string]$LogDir,
        [string]$LogPrefix,
        [string]$Timestamp,
        [int]$Sequence,
        [long]$MaxFileBytes
    )

    $logFilePath = Get-LogFilePath -LogDir $LogDir -LogPrefix $LogPrefix -Timestamp $Timestamp -Sequence $Sequence
    $writer = New-Object System.IO.StreamWriter($logFilePath, $false, (New-Utf8NoBomEncoding))
    $writer.AutoFlush = $true
    return [PSCustomObject]@{
        Path = $logFilePath
        Writer = $writer
        Sequence = $Sequence
        MaxFileBytes = $MaxFileBytes
    }
}

function Rotate-LogWriter {
    param(
        [psobject]$State,
        [string]$LogDir,
        [string]$LogPrefix,
        [string]$Timestamp
    )

    if ($State -and $State.Writer) {
        $State.Writer.Flush()
        $State.Writer.Dispose()
    }
    return Open-LogWriter -LogDir $LogDir -LogPrefix $LogPrefix -Timestamp $Timestamp -Sequence ($State.Sequence + 1) -MaxFileBytes $State.MaxFileBytes
}

function Get-CurrentFileLength {
    param(
        [string]$Path
    )
    if (-not (Test-Path -LiteralPath $Path)) {
        return 0L
    }
    return (Get-Item -LiteralPath $Path).Length
}

function Write-LogLine {
    param(
        [ref]$StateRef,
        [string]$Line,
        [string]$LogDir,
        [string]$LogPrefix,
        [string]$Timestamp
    )

    $state = $StateRef.Value
    if (-not $state) {
        return
    }

    $text = [string]$Line
    $lineBytes = (New-Utf8NoBomEncoding).GetByteCount($text + [Environment]::NewLine)
    $currentLength = Get-CurrentFileLength -Path $state.Path
    if ($state.MaxFileBytes -gt 0 -and ($currentLength + $lineBytes) -gt $state.MaxFileBytes) {
        $state = Rotate-LogWriter -State $state -LogDir $LogDir -LogPrefix $LogPrefix -Timestamp $Timestamp
        $StateRef.Value = $state
    }

    $state.Writer.WriteLine($text)
}

function Cleanup-LogFiles {
    param(
        [string]$LogDir,
        [int]$KeepDays,
        [long]$TotalSizeCapBytes
    )

    if (-not (Test-Path -LiteralPath $LogDir)) {
        return
    }

    $deadline = (Get-Date).AddDays(-$KeepDays)
    Get-ChildItem -Path $LogDir -File -Filter "*.log" | Where-Object { $_.LastWriteTime -lt $deadline } | Remove-Item -Force -ErrorAction SilentlyContinue

    if ($TotalSizeCapBytes -le 0) {
        return
    }

    $files = Get-ChildItem -Path $LogDir -File -Filter "*.log" | Sort-Object LastWriteTime
    $totalSize = ($files | Measure-Object -Property Length -Sum).Sum
    if (-not $totalSize) {
        return
    }

    foreach ($file in $files) {
        if ($totalSize -le $TotalSizeCapBytes) {
            break
        }
        $totalSize -= $file.Length
        Remove-Item -LiteralPath $file.FullName -Force -ErrorAction SilentlyContinue
    }
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

function Invoke-NpxCommandWithRollingLog {
    param(
        [string[]]$Arguments,
        [string]$LogDir,
        [string]$LogPrefix,
        [string]$Timestamp,
        [long]$MaxFileBytes
    )

    $cmdLine = "npx " + ($Arguments -join " ")
    $state = Open-LogWriter -LogDir $LogDir -LogPrefix $LogPrefix -Timestamp $Timestamp -Sequence 1 -MaxFileBytes $MaxFileBytes
    Write-Output ("Frontend {0} log file: {1}" -f $Mode, $state.Path)

    try {
        & cmd.exe /d /c "$cmdLine 2>&1" | ForEach-Object {
            $line = [string]$_
            Write-Output $line
            Write-LogLine -StateRef ([ref]$state) -Line $line -LogDir $LogDir -LogPrefix $LogPrefix -Timestamp $Timestamp
        }
        return $LASTEXITCODE
    } finally {
        if ($state -and $state.Writer) {
            $state.Writer.Flush()
            $state.Writer.Dispose()
        }
    }
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
$logKeepDays = Resolve-PositiveInt -Value $envMap["VITE_APP_LOG_KEEP_DAYS"] -DefaultValue 7
$logMaxFileSizeMb = Resolve-PositiveInt -Value $envMap["VITE_APP_LOG_MAX_FILE_SIZE_MB"] -DefaultValue 20
$logTotalSizeCapMb = Resolve-PositiveInt -Value $envMap["VITE_APP_LOG_TOTAL_SIZE_MB"] -DefaultValue 200
$logMaxFileBytes = [long]$logMaxFileSizeMb * 1MB
$logTotalSizeCapBytes = [long]$logTotalSizeCapMb * 1MB
$timestamp = Get-Date -Format "yyyyMMdd-HHmmss"
$logPrefix = if ($Mode -eq "build") { "frontend-build" } else { "frontend-dev" }

if ($Mode -eq "build") {
    $args = @("vite", "build")
} else {
    $args = @("vite")
}

if ($logEnabled) {
    if (-not (Test-Path $logDir)) {
        New-Item -Path $logDir -ItemType Directory | Out-Null
    }
    Cleanup-LogFiles -LogDir $logDir -KeepDays $logKeepDays -TotalSizeCapBytes $logTotalSizeCapBytes
    $exitCode = Invoke-NpxCommandWithRollingLog -Arguments $args -LogDir $logDir -LogPrefix $logPrefix -Timestamp $timestamp -MaxFileBytes $logMaxFileBytes
    exit $exitCode
}

Write-Output "File logging disabled (VITE_APP_ENABLE_FILE_LOG=false); output goes to current terminal only."
$exitCode = Invoke-NpxCommand -Arguments $args
exit $exitCode
