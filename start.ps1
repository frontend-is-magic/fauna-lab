$ErrorActionPreference = 'Stop'

$repoRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
$frontendDir = Join-Path $repoRoot 'frontend'
$backendDir = Join-Path $repoRoot 'backend'
$backendEnvDir = Join-Path $repoRoot '.conda/fauna-lab'
$backendUrl = 'http://localhost:8000/health'
$frontendUrl = 'http://localhost:5173'

function Require-Command {
    param(
        [string]$Name,
        [string]$Message
    )

    if (-not (Get-Command $Name -ErrorAction SilentlyContinue)) {
        throw $Message
    }
}

function Wait-ForBackend {
    param(
        [string]$Url,
        [int]$MaxAttempts = 30
    )

    for ($attempt = 1; $attempt -le $MaxAttempts; $attempt++) {
        try {
            $response = Invoke-WebRequest -Uri $Url -UseBasicParsing -TimeoutSec 2
            if ($response.StatusCode -eq 200) {
                return
            }
        } catch {
            Start-Sleep -Seconds 1
        }
    }

    throw "Backend did not become ready at $Url within $MaxAttempts seconds."
}

if (-not (Test-Path $frontendDir)) {
    throw "Frontend directory not found: $frontendDir"
}

if (-not (Test-Path $backendDir)) {
    throw "Backend directory not found: $backendDir"
}

Require-Command -Name 'pnpm' -Message 'pnpm is required to start the frontend.'

$condaCommand = Get-Command 'conda' -ErrorAction SilentlyContinue
if (-not $condaCommand) {
    Require-Command -Name 'python' -Message 'python is required to start the backend when conda is unavailable.'
}
if ($condaCommand -and (Test-Path $backendEnvDir)) {
    Write-Host "Using repo-local conda environment: $backendEnvDir"
    $backendCommand = "conda run --no-capture-output -p `"$backendEnvDir`" python -m uvicorn app.main:app --reload --app-dir `"$backendDir`""
} elseif ($condaCommand) {
    $condaEnvList = conda env list | Out-String
    if ($condaEnvList -match '(^|\s)fauna-lab(\s|$)') {
        Write-Host 'Using conda environment: fauna-lab'
        $backendCommand = "conda run --no-capture-output -n fauna-lab python -m uvicorn app.main:app --reload --app-dir `"$backendDir`""
    } else {
        Write-Host 'No usable conda env found; using the active Python environment.'
        $backendCommand = "Set-Location -LiteralPath `"$backendDir`"; python -m uvicorn app.main:app --reload"
    }
} else {
    Write-Host 'Conda not found; using the active Python environment.'
    $backendCommand = "Set-Location -LiteralPath `"$backendDir`"; python -m uvicorn app.main:app --reload"
}

Write-Host "Starting backend from $backendDir"
$backendProcess = Start-Process -FilePath 'powershell' -ArgumentList @(
    '-NoExit',
    '-Command',
    $backendCommand
) -PassThru

try {
    Wait-ForBackend -Url $backendUrl
    Write-Host "Backend ready: $backendUrl"
    Write-Host "Frontend URL: $frontendUrl"
    Set-Location -LiteralPath $frontendDir
    pnpm dev
} finally {
    if ($backendProcess -and -not $backendProcess.HasExited) {
        Write-Host "Stopping backend process $($backendProcess.Id)..."
        Stop-Process -Id $backendProcess.Id -Force -ErrorAction SilentlyContinue
    }
}
