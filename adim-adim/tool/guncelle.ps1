<#
.SYNOPSIS
  Adım Adım güncelleyicisi (Windows).
.DESCRIPTION
  Yeni paketi doğrular, hedef kurulum klasörüne kopyalar, kopyayı yeniden
  doğrular. Eski dosyaları SİLMEZ; uygulama sonraki açılışta temizler.
  Hiçbir süreç sonlandırılmaz, uygulama başlatılmaz.
.EXAMPLE
  .\guncelle.ps1 -Yeni C:\indirilen\adim-adim-2.0 -Hedef "C:\Program Files\AdimAdim"
#>
param(
  [Parameter(Mandatory = $true)][string]$Yeni,
  [Parameter(Mandatory = $true)][string]$Hedef
)
$ErrorActionPreference = 'Stop'
$SurumManifesti = 'surum.manifest.json'
$EskiManifesti = 'eski.manifest.json'

function Hata($mesaj) { [Console]::Error.WriteLine($mesaj); exit 1 }

function Yol-Guvenli([string]$yol) {
  if ([string]::IsNullOrEmpty($yol)) { return $false }
  if ($yol.Contains('\') -or $yol.StartsWith('/') -or $yol -match '^[A-Za-z]:' -or $yol.Contains(':')) { return $false }
  foreach ($p in $yol.Split('/')) {
    if ($p -eq '' -or $p -eq '.' -or $p -eq '..') { return $false }
  }
  return $true
}

# Klasörü manifestine göre doğrular; sorun varsa açıklama döner, yoksa $null.
function Klasoru-Dogrula([string]$klasor) {
  $mf = Join-Path $klasor $SurumManifesti
  if (-not (Test-Path -LiteralPath $mf -PathType Leaf)) { return "$SurumManifesti bulunamadı: $klasor" }
  try { $m = Get-Content -LiteralPath $mf -Raw -Encoding UTF8 | ConvertFrom-Json }
  catch { return "$SurumManifesti okunamadı: $_" }
  if (-not $m.surum -or $null -eq $m.dosyalar) { return "$SurumManifesti biçimi geçersiz" }
  foreach ($d in $m.dosyalar) {
    if (-not (Yol-Guvenli $d.yol)) { return "Güvensiz yol: $($d.yol)" }
    $tam = Join-Path $klasor ($d.yol -replace '/', '\')
    $oge = Get-Item -LiteralPath $tam -Force -ErrorAction SilentlyContinue
    if ($null -eq $oge -or $oge.PSIsContainer -or $oge.LinkType) { return "Eksik ya da normal dosya değil: $($d.yol)" }
    if ($oge.Length -ne [int64]$d.boyut) { return "Boyut uyuşmuyor: $($d.yol)" }
    $h = (Get-FileHash -LiteralPath $tam -Algorithm SHA256).Hash.ToLowerInvariant()
    if ($h -ne ([string]$d.sha256).ToLowerInvariant()) { return "SHA-256 uyuşmuyor: $($d.yol)" }
  }
  return $null
}

if (-not (Test-Path -LiteralPath $Yeni -PathType Container)) { Hata "Yeni paket klasörü yok: $Yeni" }
if (-not (Test-Path -LiteralPath $Hedef -PathType Container)) { Hata "Hedef kurulum klasörü yok: $Hedef" }
$Yeni = (Resolve-Path -LiteralPath $Yeni).ProviderPath
$Hedef = (Resolve-Path -LiteralPath $Hedef).ProviderPath

# 1) Yeni paketi kendi içinde doğrula; başarısızsa hiçbir şey değişmez.
$sorun = Klasoru-Dogrula $Yeni
if ($sorun) { Hata "Yeni paket doğrulanamadı, hiçbir şey değiştirilmedi. $sorun" }

# 2) Uygulama (yalnız hedef klasördeki adim_adim.exe) çalışıyorsa çık.
$hedefExe = Join-Path $Hedef 'adim_adim.exe'
$calisan = Get-Process -Name 'adim_adim' -ErrorAction SilentlyContinue |
  Where-Object { $_.Path -and ($_.Path -ieq $hedefExe) }
if ($calisan) {
  Write-Host 'Adım Adım çalışıyor. Lütfen uygulamayı kapatıp betiği yeniden çalıştırın. Hiçbir şey değiştirilmedi.'
  exit 2
}

$hedefManifest = Join-Path $Hedef $SurumManifesti
$eskiManifest = Join-Path $Hedef $EskiManifesti
$manifestTasindi = $false
try {
  # 3) Mevcut sürüm manifestini eski.manifest.json olarak taşı.
  if (Test-Path -LiteralPath $hedefManifest -PathType Leaf) {
    if (Test-Path -LiteralPath $eskiManifest) {
      Hata "$EskiManifesti zaten var (önceki temizlik bitmemiş). Uygulamayı bir kez açıp kapatın, sonra yeniden deneyin."
    }
    Move-Item -LiteralPath $hedefManifest -Destination $eskiManifest
    $manifestTasindi = $true
  }

  # 4) Yeni dosyaları kopyala; manifest en son.
  $m = Get-Content -LiteralPath (Join-Path $Yeni $SurumManifesti) -Raw -Encoding UTF8 | ConvertFrom-Json
  foreach ($d in $m.dosyalar) {
    $rel = $d.yol -replace '/', '\'
    $kaynak = Join-Path $Yeni $rel
    $hedefDosya = Join-Path $Hedef $rel
    New-Item -ItemType Directory -Force -Path (Split-Path -Parent $hedefDosya) | Out-Null
    Copy-Item -LiteralPath $kaynak -Destination $hedefDosya -Force
  }
  Copy-Item -LiteralPath (Join-Path $Yeni $SurumManifesti) -Destination $hedefManifest -Force

  # 5) Kopya sonrası hedefte yeniden doğrula.
  $sorun = Klasoru-Dogrula $Hedef
  if ($sorun) { throw "Kopya doğrulanamadı: $sorun" }
}
catch {
  $mesaj = $_.Exception.Message
  if ($manifestTasindi -and (Test-Path -LiteralPath $eskiManifest)) {
    Move-Item -LiteralPath $eskiManifest -Destination $hedefManifest -Force
  }
  Hata "Güncelleme başarısız, eski manifest geri alındı. Eski dosyalar silinmedi. $mesaj"
}

Write-Host 'Güncelleme tamamlandı. Uygulama bir sonraki açılışta eski dosyaları temizler.'
exit 0
