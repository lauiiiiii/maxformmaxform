param(
  [switch]$dryRun,
  [double]$minMB = 5,
  [string]$root = (Split-Path -Parent $MyInvocation.MyCommand.Path)
)

# If invoked from repo root via clean.bat, $root becomes scripts; go up one level
if (Test-Path (Join-Path $root ".gitignore") -ErrorAction SilentlyContinue) {
  $repo = $root
} else {
  $repo = Split-Path -Parent $root
  if (-not (Test-Path (Join-Path $repo ".gitignore"))) { $repo = Get-Location }
}

Write-Host "Repo root:" $repo

$names = @(
  'node_modules','dist','build','coverage',
  '.next','.nuxt','.output','.turbo','.cache','.vite','.parcel-cache','.svelte-kit','.angular',
  'target','bin','obj'
)

$foundMain = Get-ChildItem $repo -Directory -Recurse -ErrorAction SilentlyContinue |
  Where-Object { $names -contains $_.Name }

# also clean any previously renamed leftovers like node_modules.to-delete-yyyymmddHHMMSS
$leftovers = Get-ChildItem $repo -Directory -Recurse -ErrorAction SilentlyContinue |
  Where-Object { $_.Name -like '*to-delete-*' }

# de-duplicate by FullName
$found = @{}
foreach ($d in ($foundMain + $leftovers)) { $found[$d.FullName] = $d }
$found = $found.Values | Sort-Object FullName

$countFound = ($found | Measure-Object).Count
if ($dryRun) { Write-Host "[DryRun] Listing regeneratable directories... ($countFound found)" } else { Write-Host "Deleting regeneratable directories... ($countFound found)" }

$summary = @()
foreach ($d in $found) {
  $size = 0
  try { $size = (Get-ChildItem $d.FullName -Recurse -File -ErrorAction SilentlyContinue | Measure-Object Length -Sum).Sum } catch {}
  $mb = [math]::Round(($size/1MB),2)
  $summary += [pscustomobject]@{ Path = $d.FullName; SizeMB = $mb }
  if (-not $dryRun) {
    $removed = $false
    try { Remove-Item $d.FullName -Recurse -Force -ErrorAction Stop; $removed = $true } catch {}
    if (-not $removed) {
      # fallback to cmd rmdir when files are locked or path is long
      try {
        cmd /c "rmdir /s /q `"$($d.FullName)`"" | Out-Null
      } catch {}
    }
  }
}

$summary | Sort-Object SizeMB -Descending | Format-Table -AutoSize

Write-Host "\nTop-level summary (files / MB):"
Get-ChildItem $repo -Directory | ForEach-Object {
  $count = (Get-ChildItem $_.FullName -Recurse -File -ErrorAction SilentlyContinue | Measure-Object).Count
  $size = (Get-ChildItem $_.FullName -Recurse -File -ErrorAction SilentlyContinue | Measure-Object Length -Sum).Sum/1MB
  '{0}`t{1}`t{2:N1} MB' -f $_.Name, $count, $size
}
Write-Host ("Root files: {0}" -f ((Get-ChildItem $repo -File | Measure-Object).Count))

Write-Host ("\nLargest files (>{0} MB, top 10):" -f $minMB)
Get-ChildItem $repo -Recurse -File -ErrorAction SilentlyContinue |
  Where-Object { $_.Length -gt ($minMB * 1MB) } |
  Sort-Object Length -Descending |
  Select-Object -First 10 |
  ForEach-Object { '{0}`t{1:N1} MB' -f $_.FullName, ($_.Length/1MB) }
