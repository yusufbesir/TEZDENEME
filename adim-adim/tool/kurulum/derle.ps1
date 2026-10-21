<#
Ne: Adım Adım kurulum programını üretir (NSIS). Sahibi: Yusuf. Yazan: [İP:Adım Adım Windows sürümü#cihaz] Claude.
Değiştirme kuralı: .claude/rules/windows-uygulama-dagitimi.md. Çıktı yalnız -Cikti yoluna yazılır (D: sürücüsü kullan).
Kullanım:
  .\derle.ps1 -Kaynak ..\..\build\windows\x64\runner\Release -Surum 1.0.0.1 -Cikti D:\...\Adim-Adim-Kurulum-1.0.0.1.exe
Adımlar: paket klasörünü yürür -> uretilen\dosyalar-kur.nsh (File satırları), uretilen\surum-dosyalar.txt
(F|dosya, D|klasör; kaldırıcı yalnız bunları siler), uretilen\liste-sha.nsh (listenin SHA-256'sı) -> makensis.
#>
param(
  [Parameter(Mandatory = $true)][string]$Kaynak,
  [Parameter(Mandatory = $true)][string]$Surum,
  [Parameter(Mandatory = $true)][string]$Cikti,
  [string]$Makensis = "$env:LOCALAPPDATA\electron-builder\Cache\nsis-3.0.4.1\nsis-3.0.4.1-1mx3n\makensis.exe"
)
$ErrorActionPreference = 'Stop'
$here = Split-Path -Parent $MyInvocation.MyCommand.Path
$uretilen = Join-Path $here 'uretilen'
New-Item -ItemType Directory -Force $uretilen | Out-Null

$kok = (Resolve-Path $Kaynak).Path.TrimEnd('\')
if (-not (Test-Path (Join-Path $kok 'adim_adim.exe'))) { throw "adim_adim.exe yok: $kok" }
if ($Surum -notmatch '^\d+\.\d+\.\d+\.\d+$') { throw "Surum 4 parçalı olmalı (1.2.3.4): $Surum" }

# Bağ/junction içeren pakette derleme yapılmaz.
$tum = Get-ChildItem -LiteralPath $kok -Recurse -Force
if ($tum | Where-Object { $_.Attributes -band [IO.FileAttributes]::ReparsePoint }) { throw 'Pakette bağ/junction var.' }

$dosyalar = $tum | Where-Object { -not $_.PSIsContainer } | Sort-Object FullName
$klasorler = $tum | Where-Object { $_.PSIsContainer } | Sort-Object { $_.FullName.Length } -Descending

function Goreli($p) { $p.Substring($kok.Length + 1) }
function AsciiGuvenli($r) {
  # -cnotmatch: tr-TR kültüründe büyük/küçük duyarsız eşleşme "I" harfini kaçırır.
  if ($r -cnotmatch '^[A-Za-z0-9_.\- \\]+$' -or $r -match '\.\.') { throw "Güvenli olmayan yol adı: $r" }
}

$kur = New-Object System.Collections.Generic.List[string]
$liste = New-Object System.Collections.Generic.List[string]
$sonKlasor = $null
foreach ($f in $dosyalar) {
  $r = Goreli $f.FullName
  AsciiGuvenli $r
  $k = Split-Path $r -Parent
  if ($k -ne $sonKlasor) {
    $hedef = if ($k) { "`$INSTDIR\$k" } else { '$INSTDIR' }
    $kur.Add("SetOutPath `"$hedef`"")
    $sonKlasor = $k
  }
  $kur.Add("File `"$($f.FullName)`"")
  $liste.Add("F|$r")
}
foreach ($d in $klasorler) {
  $r = Goreli $d.FullName
  AsciiGuvenli $r
  $liste.Add("D|$r")
}
[IO.File]::WriteAllLines((Join-Path $uretilen 'dosyalar-kur.nsh'), $kur, (New-Object Text.UTF8Encoding($true)))
$listeYol = Join-Path $uretilen 'surum-dosyalar.txt'
[IO.File]::WriteAllText($listeYol, (($liste -join "`r`n") + "`r`n"), [Text.Encoding]::ASCII)
$sha = (Get-FileHash $listeYol -Algorithm SHA256).Hash.ToLower()
Set-Content -Path (Join-Path $uretilen 'liste-sha.nsh') -Value "!define LISTE_SHA256 `"$sha`"" -Encoding ASCII

if (-not (Test-Path $Makensis)) { throw "makensis bulunamadı: $Makensis" }
& $Makensis /V2 "/DSURUM=$Surum" "/DCIKTI=$Cikti" (Join-Path $here 'adim-adim.nsi')
if ($LASTEXITCODE -ne 0) { throw "makensis hata kodu $LASTEXITCODE" }
Write-Host "Kurulum programı: $Cikti"
Write-Host "SHA256: $((Get-FileHash $Cikti -Algorithm SHA256).Hash)"
