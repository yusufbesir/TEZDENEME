<#
.SYNOPSIS
  Adım Adım güncelleyicisi (Windows).
.DESCRIPTION
  Yeni paketi doğrular, hedefin YANINDAKİ geçici bir klasöre kopyalar ve orada
  yeniden doğrular (TOCTOU'ya karşı). Sonra hedefteki dosyaları yedekleyip
  geçici klasörden hedefe taşır; son doğrulama da başarısızsa yedekten tam geri
  yükler. Eski dosyaları SİLMEZ; uygulama sonraki açılışta temizler.
  Hedefte sembolik bağlantı/junction varsa o yola yazmaz, güncellemeyi durdurur.
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

# Windows ayrılmış aygıt adları (CON, PRN, AUX, NUL, COM1-9, LPT1-9); uzantılı biçim de ayrılmıştır.
function Ayrilmis-Ad([string]$parca) {
  $govde = ($parca.Split('.')[0]).ToUpperInvariant()
  if ($govde -in @('CON', 'PRN', 'AUX', 'NUL')) { return $true }
  return ($govde -match '^(COM|LPT)[1-9]$')
}

function Yol-Guvenli([string]$yol) {
  if ([string]::IsNullOrEmpty($yol)) { return $false }
  if ($yol.Contains('\') -or $yol.StartsWith('/') -or $yol -match '^[A-Za-z]:' -or $yol.Contains(':')) { return $false }
  if ($yol.Contains([char]0)) { return $false }
  foreach ($p in $yol.Split('/')) {
    if ($p -eq '' -or $p -eq '.' -or $p -eq '..') { return $false }
    if ($p.EndsWith('.') -or $p.EndsWith(' ')) { return $false }
    if (Ayrilmis-Ad $p) { return $false }
  }
  return $true
}

# $kok altındaki göreli yolun HER parçasında (ara klasörler ve dosyanın kendisi)
# sembolik bağlantı ya da junction var mı? Varsa açıklama döner.
function Baglanti-Var([string]$kok, [string]$rel) {
  $yol = $kok
  foreach ($p in $rel.Split('\')) {
    $yol = Join-Path $yol $p
    $oge = Get-Item -LiteralPath $yol -Force -ErrorAction SilentlyContinue
    if ($null -eq $oge) { return $null }   # henüz yok; kalan parçalar da yok
    if ($oge.LinkType) { return "Bağlantı/junction: $yol ($($oge.LinkType))" }
  }
  return $null
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
    $rel = $d.yol -replace '/', '\'
    $b = Baglanti-Var $klasor $rel
    if ($b) { return $b }
    $tam = Join-Path $klasor $rel
    $oge = Get-Item -LiteralPath $tam -Force -ErrorAction SilentlyContinue
    if ($null -eq $oge -or $oge.PSIsContainer -or $oge.LinkType) { return "Eksik ya da normal dosya değil: $($d.yol)" }
    if ($oge.Length -ne [int64]$d.boyut) { return "Boyut uyuşmuyor: $($d.yol)" }
    $h = (Get-FileHash -LiteralPath $tam -Algorithm SHA256).Hash.ToLowerInvariant()
    if ($h -ne ([string]$d.sha256).ToLowerInvariant()) { return "SHA-256 uyuşmuyor: $($d.yol)" }
  }
  return $null
}

function Bos-Klasorleri-Kaldir([string]$kok, [string[]]$klasorler) {
  # En derinden yukarı; yalnız boş ve bağlantı olmayan klasörler, kök hariç.
  foreach ($k in ($klasorler | Sort-Object -Property Length -Descending -Unique)) {
    if ($k -ieq $kok) { continue }
    $oge = Get-Item -LiteralPath $k -Force -ErrorAction SilentlyContinue
    if ($null -eq $oge -or -not $oge.PSIsContainer -or $oge.LinkType) { continue }
    if (@(Get-ChildItem -LiteralPath $k -Force).Count -eq 0) { Remove-Item -LiteralPath $k -Force }
  }
}

if (-not (Test-Path -LiteralPath $Yeni -PathType Container)) { Hata "Yeni paket klasörü yok: $Yeni" }
if (-not (Test-Path -LiteralPath $Hedef -PathType Container)) { Hata "Hedef kurulum klasörü yok: $Hedef" }
$Yeni = (Resolve-Path -LiteralPath $Yeni).ProviderPath
$Hedef = (Resolve-Path -LiteralPath $Hedef).ProviderPath
if ((Get-Item -LiteralPath $Hedef -Force).LinkType) { Hata "Hedef klasörün kendisi bağlantı/junction: $Hedef" }

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
if ((Test-Path -LiteralPath $hedefManifest -PathType Leaf) -and (Test-Path -LiteralPath $eskiManifest)) {
  Hata "$EskiManifesti zaten var (önceki temizlik bitmemiş). Uygulamayı bir kez açıp kapatın, sonra yeniden deneyin."
}

# Geçici kopya ve yedek klasörleri hedefin YANINDA (aynı sürücü, aynı üst klasör)
# açılır; böylece Move-Item aynı bölümde atomik yeniden adlandırma olur.
$ust = Split-Path -Parent $Hedef
if ([string]::IsNullOrEmpty($ust)) { Hata "Hedef bir sürücü kökü olamaz: $Hedef" }
$etiket = [guid]::NewGuid().ToString('N').Substring(0, 8)
$gecici = Join-Path $ust ".adimadim-yeni-$etiket"
$yedek = Join-Path $ust ".adimadim-yedek-$etiket"
try {
  New-Item -ItemType Directory -Path $gecici | Out-Null
  New-Item -ItemType Directory -Path $yedek | Out-Null
}
catch {
  Remove-Item -LiteralPath $gecici -Recurse -Force -ErrorAction SilentlyContinue
  Hata "Hedefin yanında geçici klasör açılamadı ($ust), hiçbir şey değiştirilmedi. $($_.Exception.Message)"
}

# Geri alma kayıtları
$manifestTasindi = $false     # surum.manifest.json -> eski.manifest.json yapıldı
$yedeklenen = @()             # hedefte var olup üzerine yazılacak dosyaların göreli yolları
$yeniEklenen = @()            # hedefte daha önce olmayan, bu çalıştırmada yazılan göreli yollar
$acilanKlasorler = @()        # bu çalıştırmada hedefte oluşturulan klasörler (tam yol)
$kopyaBasladi = $false

try {
  $m = Get-Content -LiteralPath (Join-Path $Yeni $SurumManifesti) -Raw -Encoding UTF8 | ConvertFrom-Json

  # 3) Yeni paketi hedefin yanındaki geçici klasöre kopyala ve ORADA doğrula.
  #    Doğrulanan kopya ile hedefe taşınan kopya aynı dosyalardır (TOCTOU yok).
  foreach ($d in $m.dosyalar) {
    $rel = $d.yol -replace '/', '\'
    $kaynak = Join-Path $Yeni $rel
    $hd = Join-Path $gecici $rel
    New-Item -ItemType Directory -Force -Path (Split-Path -Parent $hd) | Out-Null
    Copy-Item -LiteralPath $kaynak -Destination $hd
  }
  Copy-Item -LiteralPath (Join-Path $Yeni $SurumManifesti) -Destination (Join-Path $gecici $SurumManifesti)
  $sorun = Klasoru-Dogrula $gecici
  if ($sorun) { throw "Geçici kopya doğrulanamadı: $sorun" }

  # 4) Hedefte yazılacak her yolda bağlantı/junction kontrolü; varsa HİÇ başlama.
  foreach ($d in $m.dosyalar) {
    $b = Baglanti-Var $Hedef ($d.yol -replace '/', '\')
    if ($b) { throw "Hedefte bağlantı var, kurulum klasörü dışına yazılabilirdi; durduruldu. $b" }
  }

  # 5) Mevcut manifesti eski.manifest.json yap.
  if (Test-Path -LiteralPath $hedefManifest -PathType Leaf) {
    Move-Item -LiteralPath $hedefManifest -Destination $eskiManifest
    $manifestTasindi = $true
  }

  # 6) Dosyaları hedefe taşı: önce var olanı yedekle, sonra geçiciden taşı.
  $kopyaBasladi = $true
  foreach ($d in $m.dosyalar) {
    $rel = $d.yol -replace '/', '\'
    $hedefDosya = Join-Path $Hedef $rel
    $klasor = Split-Path -Parent $hedefDosya
    # Taşıma anında bağlantı yeniden kontrolü (yarış penceresini daraltır).
    $b = Baglanti-Var $Hedef $rel
    if ($b) { throw "Hedefte bağlantı belirdi; durduruldu. $b" }
    if (-not (Test-Path -LiteralPath $klasor)) {
      # Oluşturulacak ara klasörleri kaydet (en üst var olmayandan itibaren).
      $k = $klasor
      while (-not (Test-Path -LiteralPath $k) -and $k.Length -gt $Hedef.Length) {
        $acilanKlasorler += $k
        $k = Split-Path -Parent $k
      }
      New-Item -ItemType Directory -Force -Path $klasor | Out-Null
    }
    if (Test-Path -LiteralPath $hedefDosya -PathType Leaf) {
      $yd = Join-Path $yedek $rel
      New-Item -ItemType Directory -Force -Path (Split-Path -Parent $yd) | Out-Null
      Copy-Item -LiteralPath $hedefDosya -Destination $yd
      $yedeklenen += $rel
    } else {
      $yeniEklenen += $rel
    }
    Move-Item -LiteralPath (Join-Path $gecici $rel) -Destination $hedefDosya -Force
  }
  Move-Item -LiteralPath (Join-Path $gecici $SurumManifesti) -Destination $hedefManifest -Force

  # 7) Hedefte son doğrulama.
  $sorun = Klasoru-Dogrula $Hedef
  if ($sorun) { throw "Hedef doğrulanamadı: $sorun" }
}
catch {
  $mesaj = $_.Exception.Message
  $geriAlmaHatalari = @()
  if ($kopyaBasladi) {
    # Üzerine yazılan dosyaları yedekten geri yükle.
    foreach ($rel in $yedeklenen) {
      try { Copy-Item -LiteralPath (Join-Path $yedek $rel) -Destination (Join-Path $Hedef $rel) -Force }
      catch { $geriAlmaHatalari += "geri yüklenemedi: $rel ($($_.Exception.Message))" }
    }
    # Bu çalıştırmada eklenen yeni dosyaları kaldır (yalnız normal dosya ise).
    foreach ($rel in $yeniEklenen) {
      $p = Join-Path $Hedef $rel
      $oge = Get-Item -LiteralPath $p -Force -ErrorAction SilentlyContinue
      if ($oge -and -not $oge.PSIsContainer -and -not $oge.LinkType) {
        try { Remove-Item -LiteralPath $p -Force } catch { $geriAlmaHatalari += "kaldırılamadı: $rel" }
      }
    }
    # Yeni manifest yazılmışsa kaldır; eski manifesti geri getir.
    if (Test-Path -LiteralPath $hedefManifest -PathType Leaf) {
      try { Remove-Item -LiteralPath $hedefManifest -Force } catch { $geriAlmaHatalari += "yeni manifest kaldırılamadı" }
    }
    Bos-Klasorleri-Kaldir $Hedef $acilanKlasorler
  }
  if ($manifestTasindi -and (Test-Path -LiteralPath $eskiManifest)) {
    try { Move-Item -LiteralPath $eskiManifest -Destination $hedefManifest -Force }
    catch { $geriAlmaHatalari += "eski manifest geri alınamadı" }
  }
  # Geçici klasörü her durumda kaldır; yedeği yalnız geri alma tam ise kaldır.
  Remove-Item -LiteralPath $gecici -Recurse -Force -ErrorAction SilentlyContinue
  if ($geriAlmaHatalari.Count -eq 0) {
    Remove-Item -LiteralPath $yedek -Recurse -Force -ErrorAction SilentlyContinue
    Hata "Güncelleme başarısız, hedef eski haline geri alındı. Eski dosyalar silinmedi. $mesaj"
  }
  Hata ("Güncelleme başarısız ve geri alma TAM DEĞİL. Yedek korundu: $yedek`n" + ($geriAlmaHatalari -join "`n") + "`n$mesaj")
}

# Başarılı: geçici ve yedek klasörler kaldırılır.
Remove-Item -LiteralPath $gecici -Recurse -Force -ErrorAction SilentlyContinue
Remove-Item -LiteralPath $yedek -Recurse -Force -ErrorAction SilentlyContinue
Write-Host 'Güncelleme tamamlandı. Uygulama bir sonraki açılışta eski dosyaları temizler.'
exit 0
