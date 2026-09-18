# Build a release package for the extension.
#
#   powershell -ExecutionPolicy Bypass -File tools\package.ps1
#   powershell -ExecutionPolicy Bypass -File tools\package.ps1 -Crx
#
# Output:
#   dist\webpage-to-markdown-<version>.zip   (upload this to Chrome Web Store)
#   dist\webpage-to-markdown-<version>.crx   (only with -Crx, for enterprise policy hosting)
#   dist\webpage-to-markdown.pem             (signing key, created once, KEEP IT SECRET)
#
# ASCII-only on purpose: PowerShell here-strings with CJK text can break under
# non-UTF8 console code pages.

[CmdletBinding()]
param(
    [switch]$Crx,
    [switch]$SkipTests,
    [string]$ChromePath = '',
    [string]$CrxBaseUrl = 'https://CHANGE-ME.example.com/chrome'
)

$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot
$dist = Join-Path $root 'dist'
$stage = Join-Path $dist '_stage'

# Files and folders that must NOT ship in the store package.
$excludeDirs = @('tools', 'dist', 'store', '.git', '.github', 'node_modules', '.kiro')
$excludeFiles = @('README.md', '.gitignore', 'package.json', 'package-lock.json')

function Fail($message) {
    Write-Host "ERROR: $message" -ForegroundColor Red
    exit 1
}

# Extension id = first 16 bytes of SHA256(public key), each nibble mapped 0-f -> a-p.
# CRX3 stores exactly those bytes as SignedData.crx_id inside the header, so the id
# can be read straight out of the packed file without parsing the private key.
function Get-CrxExtensionId([string]$crxPath) {
    $bytes = [System.IO.File]::ReadAllBytes($crxPath)
    if ($bytes.Length -lt 32) { return '' }
    if ([System.Text.Encoding]::ASCII.GetString($bytes, 0, 4) -ne 'Cr24') { return '' }
    $limit = [Math]::Min($bytes.Length - 20, 8192)
    for ($i = 12; $i -lt $limit; $i++) {
        # field 10000, wire type 2 -> varint tag 0x82 0xF1 0x04
        if ($bytes[$i] -ne 0x82 -or $bytes[$i + 1] -ne 0xF1 -or $bytes[$i + 2] -ne 0x04) { continue }
        $j = $i + 3
        while ($j -lt $bytes.Length -and ($bytes[$j] -band 0x80) -ne 0) { $j++ }
        $j++
        # SignedData.crx_id: field 1, wire type 2, length 16
        if ($bytes[$j] -ne 0x0A -or $bytes[$j + 1] -ne 0x10) { continue }
        $sb = New-Object System.Text.StringBuilder
        for ($k = 0; $k -lt 16; $k++) {
            $b = $bytes[$j + 2 + $k]
            [void]$sb.Append([char](97 + ($b -shr 4)))
            [void]$sb.Append([char](97 + ($b -band 0x0F)))
        }
        return $sb.ToString()
    }
    return ''
}

Write-Host '== 1/5 validate manifest'
$manifestPath = Join-Path $root 'manifest.json'
if (-not (Test-Path $manifestPath)) { Fail 'manifest.json not found' }
try {
    $manifest = Get-Content $manifestPath -Raw -Encoding UTF8 | ConvertFrom-Json
} catch {
    Fail "manifest.json is not valid JSON: $($_.Exception.Message)"
}
if ($manifest.manifest_version -ne 3) { Fail 'manifest_version must be 3' }
$version = $manifest.version
if (-not $version) { Fail 'manifest.version is missing' }
if ($version -notmatch '^\d+(\.\d+){0,3}$') { Fail "invalid version format: $version" }
Write-Host "   name=$($manifest.name) version=$version"

Write-Host '== 2/5 run selftest'
if ($SkipTests) {
    Write-Host '   skipped (-SkipTests)'
} else {
    $node = Get-Command node -ErrorAction SilentlyContinue
    if (-not $node) {
        Write-Host '   node not found, skipping selftest' -ForegroundColor Yellow
    } else {
        Push-Location $root
        & node 'tools/selftest.js' | Out-Null
        $code = $LASTEXITCODE
        Pop-Location
        if ($code -ne 0) { Fail 'tools/selftest.js failed, fix it before packaging' }
        Write-Host '   selftest passed'
    }
}

Write-Host '== 3/5 stage files'
if (Test-Path $stage) { Remove-Item $stage -Recurse -Force }
New-Item -ItemType Directory -Force -Path $stage | Out-Null

$copied = 0
Get-ChildItem -Path $root -Recurse -File | ForEach-Object {
    $rel = $_.FullName.Substring($root.Length + 1)
    $parts = $rel -split '[\\/]'
    if ($excludeDirs -contains $parts[0]) { return }
    if ($parts.Count -eq 1 -and ($excludeFiles -contains $parts[0])) { return }
    if ($_.Name -like '_tmp*') { return }
    $target = Join-Path $stage $rel
    $targetDir = Split-Path -Parent $target
    if (-not (Test-Path $targetDir)) { New-Item -ItemType Directory -Force -Path $targetDir | Out-Null }
    Copy-Item $_.FullName $target
    $script:copied++
    Write-Host ("   + {0}" -f $rel)
}
if ($copied -lt 5) { Fail 'staged too few files, something is wrong' }

# Every file referenced by the manifest must exist inside the staged package.
$refs = New-Object System.Collections.Generic.List[string]
$manifest.icons.PSObject.Properties | ForEach-Object { $refs.Add($_.Value) }
$manifest.action.default_icon.PSObject.Properties | ForEach-Object { $refs.Add($_.Value) }
$refs.Add($manifest.background.service_worker)
$refs.Add($manifest.options_page)
$refs.Add($manifest.action.default_popup)
if ($manifest.content_scripts) {
    foreach ($cs in $manifest.content_scripts) {
        $cs.js | ForEach-Object { $refs.Add($_) }
        $cs.css | ForEach-Object { $refs.Add($_) }
    }
}
foreach ($ref in ($refs | Select-Object -Unique)) {
    if (-not (Test-Path (Join-Path $stage $ref))) { Fail "manifest references a missing file: $ref" }
}

# Files injected at runtime are listed in src/lib/constants.js, not in the manifest,
# so the packager has to check them separately or they would silently go missing.
$constants = Get-Content (Join-Path $stage 'src/lib/constants.js') -Raw -Encoding UTF8
foreach ($m in [regex]::Matches($constants, "'(src/[^']+\.js)'")) {
    $ref = $m.Groups[1].Value
    if (-not (Test-Path (Join-Path $stage $ref))) { Fail "constants.js references a missing file: $ref" }
}
# With default_locale set, a missing _locales table makes Chrome refuse to load
# the extension outright, and every __MSG_x__ placeholder must resolve there.
if ($manifest.default_locale) {
    $defaultMessages = Join-Path $stage "_locales\$($manifest.default_locale)\messages.json"
    if (-not (Test-Path $defaultMessages)) {
        Fail "default_locale is '$($manifest.default_locale)' but $defaultMessages is missing"
    }
    $messages = Get-Content $defaultMessages -Raw -Encoding UTF8 | ConvertFrom-Json
    $manifestRaw = Get-Content $manifestPath -Raw -Encoding UTF8
    foreach ($m in ([regex]'__MSG_(\w+)__').Matches($manifestRaw)) {
        $key = $m.Groups[1].Value
        if (-not $messages.PSObject.Properties.Name.Contains($key)) {
            Fail "manifest uses __MSG_${key}__ but _locales/$($manifest.default_locale) does not define it"
        }
    }
    $localeCount = (Get-ChildItem -Path (Join-Path $stage '_locales') -Directory).Count
    Write-Host "   $localeCount locale(s) staged, all __MSG_ placeholders resolve"
}

Write-Host "   $copied files staged, all references present"

Write-Host '== 4/5 create zip'
$slug = 'webpage-to-markdown'
$zip = Join-Path $dist "$slug-$version.zip"
if (Test-Path $zip) { Remove-Item $zip -Force }

# Built by hand instead of Compress-Archive so that
#   - entry names always use forward slashes (portable zip)
#   - source files are opened with FileShare.ReadWrite, which avoids the
#     "file is used by another process" failure caused by AV / indexers
Add-Type -AssemblyName System.IO.Compression | Out-Null
Add-Type -AssemblyName System.IO.Compression.FileSystem | Out-Null

$zipStream = [System.IO.File]::Open($zip, [System.IO.FileMode]::Create)
try {
    $archive = New-Object System.IO.Compression.ZipArchive($zipStream, [System.IO.Compression.ZipArchiveMode]::Create)
    try {
        Get-ChildItem -Path $stage -Recurse -File | Sort-Object FullName | ForEach-Object {
            $entryName = $_.FullName.Substring($stage.Length + 1).Replace('\', '/')
            $entry = $archive.CreateEntry($entryName, [System.IO.Compression.CompressionLevel]::Optimal)
            $entryStream = $entry.Open()
            try {
                $fileStream = [System.IO.File]::Open($_.FullName, [System.IO.FileMode]::Open,
                    [System.IO.FileAccess]::Read, [System.IO.FileShare]::ReadWrite)
                try { $fileStream.CopyTo($entryStream) } finally { $fileStream.Dispose() }
            } finally {
                $entryStream.Dispose()
            }
        }
    } finally {
        $archive.Dispose()
    }
} finally {
    $zipStream.Dispose()
}

$zipInfo = Get-Item $zip
$entryCount = ([System.IO.Compression.ZipFile]::OpenRead($zip)).Entries.Count
Write-Host ("   {0}  ({1:N0} bytes, {2} entries)" -f $zipInfo.FullName, $zipInfo.Length, $entryCount)

Write-Host '== 5/5 optional crx'
if ($Crx) {
    if (-not $ChromePath) {
        $candidates = @(
            "$env:ProgramFiles\Google\Chrome\Application\chrome.exe",
            "${env:ProgramFiles(x86)}\Google\Chrome\Application\chrome.exe",
            "$env:LOCALAPPDATA\Google\Chrome\Application\chrome.exe"
        )
        $ChromePath = $candidates | Where-Object { Test-Path $_ } | Select-Object -First 1
    }
    if (-not $ChromePath) { Fail 'chrome.exe not found, pass -ChromePath "C:\path\to\chrome.exe"' }

    $pem = Join-Path $dist "$slug.pem"
    # A throwaway user-data-dir is required: without it the command is forwarded
    # to an already running Chrome instance and nothing gets packed.
    $tempProfile = Join-Path $env:TEMP ("w2m-pack-" + [Guid]::NewGuid().ToString('N'))
    $packArgs = @("--pack-extension=$stage", "--user-data-dir=$tempProfile", '--no-first-run')
    if (Test-Path $pem) {
        $packArgs += "--pack-extension-key=$pem"
        Write-Host '   reusing existing signing key (extension id stays the same)'
    } else {
        Write-Host '   no signing key yet, Chrome will create one'
    }
    & $ChromePath @packArgs | Out-Null
    for ($i = 0; $i -lt 30 -and -not (Test-Path (Join-Path $dist '_stage.crx')); $i++) {
        Start-Sleep -Milliseconds 500
    }
    Remove-Item $tempProfile -Recurse -Force -ErrorAction SilentlyContinue

    $producedCrx = Join-Path $dist '_stage.crx'
    $producedPem = Join-Path $dist '_stage.pem'
    if (-not (Test-Path $producedCrx)) { Fail 'chrome did not produce a crx file' }
    $crxTarget = Join-Path $dist "$slug-$version.crx"
    if (Test-Path $crxTarget) { Remove-Item $crxTarget -Force }
    Move-Item $producedCrx $crxTarget
    if ((Test-Path $producedPem) -and -not (Test-Path $pem)) { Move-Item $producedPem $pem }
    Write-Host ("   {0}" -f $crxTarget)
    Write-Host ("   signing key: {0}  (keep it, do not commit it)" -f $pem)
    $extId = Get-CrxExtensionId $crxTarget
    if ($extId) {
        Write-Host ("   extension id: {0}" -f $extId)

        # Update manifest for self-hosted enterprise deployment.
        $crxUrl = ($CrxBaseUrl.TrimEnd('/')) + '/' + (Split-Path -Leaf $crxTarget)
        $updateXml = Join-Path $dist 'update.xml'
        $xml = @"
<?xml version="1.0" encoding="UTF-8"?>
<gupdate xmlns="http://www.google.com/update2/response" protocol="2.0">
  <app appid="$extId">
    <updatecheck codebase="$crxUrl" version="$version" />
  </app>
</gupdate>
"@
        [System.IO.File]::WriteAllText($updateXml, $xml, (New-Object System.Text.UTF8Encoding($false)))
        Write-Host ("   {0}  (host it, then point the policy update_url at it)" -f $updateXml)
        Write-Host ("   crx must be served from: {0}" -f $crxUrl)
        Write-Host '   policy: ExtensionInstallForcelist =' ("{0};{1}" -f $extId, ($CrxBaseUrl.TrimEnd('/') + '/update.xml'))
    }
} else {
    Write-Host '   skipped (pass -Crx to also build a signed crx)'
}

Remove-Item $stage -Recurse -Force
Write-Host ''
Write-Host 'Done. Upload the zip at https://chrome.google.com/webstore/devconsole'
