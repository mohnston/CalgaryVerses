# publish_to_github.ps1 — helper to initialize and push this folder to GitHub
# Usage: run from project root in PowerShell: .\publish_to_github.ps1

param(
    [string]$RepoUrl
)

if (-not (Get-Command git -ErrorAction SilentlyContinue)) {
    Write-Error "Git is not available in PATH. Install Git and try again."
    exit 1
}

if (-not $RepoUrl) {
    $RepoUrl = Read-Host "Enter GitHub repository URL (HTTPS), e.g. https://github.com/you/CalgaryVerses.git"
}

if (-not $RepoUrl) { Write-Error "No repository URL provided."; exit 1 }

Write-Host "Initializing repo and pushing to $RepoUrl" -ForegroundColor Cyan

if (-not (Test-Path .git)) {
    git init
}

git add .
$commitMsg = Read-Host "Commit message (default: Initial site)"
if (-not $commitMsg) { $commitMsg = 'Initial site' }

try {
    git commit -m "$commitMsg" -q
} catch {
    Write-Host "No changes to commit or commit failed: $_" -ForegroundColor Yellow
}

# set main branch
try { git branch -M main } catch {}

# set remote
$existing = git remote get-url origin 2>$null
if ($existing) {
    Write-Host "Remote 'origin' already exists: $existing" -ForegroundColor Yellow
    $confirm = Read-Host "Replace remote 'origin' with $RepoUrl ? (y/N)"
    if ($confirm -match '^[yY]') {
        git remote remove origin
        git remote add origin $RepoUrl
    }
} else {
    git remote add origin $RepoUrl
}

Write-Host "Pushing to origin main..." -ForegroundColor Cyan
try {
    git push -u origin main
    Write-Host "Push complete. Visit your repository and enable Pages under Settings → Pages." -ForegroundColor Green
} catch {
    Write-Error "Push failed: $_"
}
