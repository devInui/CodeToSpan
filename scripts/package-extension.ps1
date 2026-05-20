Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

$ProjectRoot = Resolve-Path (Join-Path $PSScriptRoot "..")
$ManifestPath = Join-Path $ProjectRoot "manifest.json"
$Manifest = Get-Content -LiteralPath $ManifestPath -Raw | ConvertFrom-Json
$Version = $Manifest.version

$DistDir = Join-Path $ProjectRoot "dist"
$ZipPath = Join-Path $DistDir "codetospan-v$Version.zip"
$StageDir = Join-Path ([System.IO.Path]::GetTempPath()) "codetospan-package-$([System.Guid]::NewGuid().ToString('N'))"

$Files = @(
  "manifest.json",
  "background.js",
  "popup.html",
  "popup.css",
  "popup.js",
  "options.html",
  "options.css",
  "options.js",
  "code-dog.png",
  "code-dog-large.png"
)

$Directories = @(
  "_locales",
  "src"
)

function Copy-PackageFile {
  param([string]$RelativePath)

  $Source = Join-Path $ProjectRoot $RelativePath
  if (-not (Test-Path -LiteralPath $Source -PathType Leaf)) {
    throw "Required package file is missing: $RelativePath"
  }

  $Destination = Join-Path $StageDir $RelativePath
  $DestinationDir = Split-Path -Parent $Destination
  New-Item -ItemType Directory -Path $DestinationDir -Force | Out-Null
  Copy-Item -LiteralPath $Source -Destination $Destination -Force
}

function Copy-PackageDirectory {
  param([string]$RelativePath)

  $Source = Join-Path $ProjectRoot $RelativePath
  if (-not (Test-Path -LiteralPath $Source -PathType Container)) {
    throw "Required package directory is missing: $RelativePath"
  }

  $Destination = Join-Path $StageDir $RelativePath
  New-Item -ItemType Directory -Path $Destination -Force | Out-Null
  Copy-Item -Path (Join-Path $Source "*") -Destination $Destination -Recurse -Force
}

try {
  New-Item -ItemType Directory -Path $DistDir -Force | Out-Null
  New-Item -ItemType Directory -Path $StageDir -Force | Out-Null

  foreach ($File in $Files) {
    Copy-PackageFile $File
  }

  foreach ($Directory in $Directories) {
    Copy-PackageDirectory $Directory
  }

  if (Test-Path -LiteralPath $ZipPath) {
    Remove-Item -LiteralPath $ZipPath -Force
  }

  Compress-Archive -Path (Join-Path $StageDir "*") -DestinationPath $ZipPath -Force

  Write-Host "Created package: $ZipPath"
} finally {
  if (Test-Path -LiteralPath $StageDir) {
    Remove-Item -LiteralPath $StageDir -Recurse -Force
  }
}
