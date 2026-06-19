# Dependency-free static server for the LNP Formulation Studio PWA.
# Used automatically by start.cmd when Python is unavailable.
param([int]$Port = 8080)

$root = Split-Path -Parent $MyInvocation.MyCommand.Path
$prefix = "http://localhost:$Port/"

$mime = @{
  '.html' = 'text/html';                '.js' = 'text/javascript';
  '.mjs'  = 'text/javascript';          '.json' = 'application/json';
  '.webmanifest' = 'application/manifest+json'; '.css' = 'text/css';
  '.svg'  = 'image/svg+xml';            '.png' = 'image/png';
  '.ico'  = 'image/x-icon';             '.wasm' = 'application/wasm';
  '.map'  = 'application/json'
}

$allowedHosts = @('avantiresearch.com', 'www.avantiresearch.com', 'avantilipids.com', 'www.avantilipids.com')

function Get-LipidFromAvanti([string]$url) {
  try {
    $u = [System.Uri]$url
    if ($allowedHosts -notcontains $u.Host.ToLower()) {
      return @{ ok = $false; error = 'Only Avanti Research / Avanti Lipids product URLs are supported.' }
    }
    $r = Invoke-WebRequest -Uri $url -UseBasicParsing -TimeoutSec 20 -Headers @{ 'User-Agent' = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/124 Safari/537.36' }
    $html = $r.Content
    $name = $null
    $ld = [regex]::Match($html, '<script type="application/ld\+json"[^>]*>(.*?)</script>', 'Singleline')
    if ($ld.Success) { $j = $null; try { $j = $ld.Groups[1].Value | ConvertFrom-Json } catch {}; if ($j -and $j.name) { $name = $j.name } }
    if (-not $name) { $t = [regex]::Match($html, '<title[^>]*>(.*?)</title>', 'Singleline'); if ($t.Success) { $name = ($t.Groups[1].Value -split '\|')[0] } }
    if ($name) { $name = [System.Net.WebUtility]::HtmlDecode(($name -replace '\s+', ' ')).Trim() }
    $mw = $null
    $mwm = [regex]::Match($html, '(?is)Formula weight\s*</td>\s*<td[^>]*>\s*([0-9][0-9,\.]*)')
    if (-not $mwm.Success) { $mwm = [regex]::Match($html, '(?is)(Average mass|Molecular weight)\s*</td>\s*<td[^>]*>\s*([0-9][0-9,\.]*)') }
    if ($mwm.Success) { $mw = [double]($mwm.Groups[$mwm.Groups.Count - 1].Value -replace ',', '') }
    $code = $null
    $cm = [regex]::Match($url, '/product/(\d{4,7})'); if (-not $cm.Success) { $cm = [regex]::Match($u.AbsolutePath, '(\d{6})') }
    if ($cm.Success) { $code = $cm.Groups[1].Value }
    $abbr = $code
    if ($name) { $pm = [regex]::Match($name, '\(([A-Za-z0-9][A-Za-z0-9\-]{1,11})\)'); if ($pm.Success) { $abbr = $pm.Groups[1].Value } }
    $s = ($name).ToLower()
    $cls = 'helper'
    if ($s -match 'peg|polyethylene glycol') { $cls = 'peg' }
    elseif ($s -match 'cholesterol|sterol') { $cls = 'cholesterol' }
    elseif ($s -match 'mc3|dlin|-dma|ionizable') { $cls = 'ionizable' }
    elseif ($s -match 'trimethylammonium|dotap|dotma|ddab') { $cls = 'cationic' }
    elseif ($s -match 'rhod|nbd|bodipy|topfluor|dansyl|fluor') { $cls = 'fluorescent' }
    return @{ ok = $true; name = $name; abbr = $abbr; code = $code; mw = $mw; cls = $cls }
  } catch {
    return @{ ok = $false; error = 'Could not fetch the page.' }
  }
}

$listener = New-Object System.Net.HttpListener
$listener.Prefixes.Add($prefix)
try { $listener.Start() } catch {
  Write-Host "Could not bind $prefix : $($_.Exception.Message)" -ForegroundColor Red
  exit 1
}

Write-Host ("=" * 56)
Write-Host "  LNP / Liposome Formulation Studio (PowerShell server)"
Write-Host "  Open:  $prefix"
Write-Host "  Press Ctrl+C to stop."
Write-Host ("=" * 56)
Start-Process $prefix | Out-Null

while ($listener.IsListening) {
  try {
    $ctx = $listener.GetContext()
  } catch { break }
  $req = $ctx.Request
  $res = $ctx.Response
  try {
    # --- Avanti scrape proxy ---
    if ($req.Url.AbsolutePath -like '/api/fetch-lipid*') {
      $target = $req.QueryString['url']
      $result = if ($target) { Get-LipidFromAvanti $target } else { @{ ok = $false; error = 'Missing url parameter.' } }
      $json = ($result | ConvertTo-Json -Compress)
      $jb = [System.Text.Encoding]::UTF8.GetBytes($json)
      $res.ContentType = 'application/json; charset=utf-8'
      $res.Headers.Add('Access-Control-Allow-Origin', '*')
      $res.ContentLength64 = $jb.Length
      $res.OutputStream.Write($jb, 0, $jb.Length)
      $res.OutputStream.Close()
      continue
    }
    $rel = [System.Uri]::UnescapeDataString($req.Url.AbsolutePath.TrimStart('/'))
    if ([string]::IsNullOrWhiteSpace($rel)) { $rel = 'index.html' }
    $path = Join-Path $root $rel
    if ((Test-Path $path -PathType Container)) { $path = Join-Path $path 'index.html' }

    if (Test-Path $path -PathType Leaf) {
      $ext = [System.IO.Path]::GetExtension($path).ToLower()
      $ct = $mime[$ext]; if (-not $ct) { $ct = 'application/octet-stream' }
      $bytes = [System.IO.File]::ReadAllBytes($path)
      $res.ContentType = $ct
      $res.Headers.Add('Cache-Control', 'no-cache')
      $res.Headers.Add('Service-Worker-Allowed', '/')
      $res.ContentLength64 = $bytes.Length
      $res.OutputStream.Write($bytes, 0, $bytes.Length)
    } else {
      $res.StatusCode = 404
      $msg = [System.Text.Encoding]::UTF8.GetBytes('404 Not Found')
      $res.OutputStream.Write($msg, 0, $msg.Length)
    }
  } catch {
    try { $res.StatusCode = 500 } catch {}
  } finally {
    try { $res.OutputStream.Close() } catch {}
  }
}
