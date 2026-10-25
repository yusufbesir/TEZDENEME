# Jev not puanlama - Windows Görev Zamanlayıcı kaydı
#
# Ne yapar: "Jev not puanlama" adlı tek bir görevi, yalnız geçerli kullanıcı için, her gün 08:41'de
# çalışacak şekilde kaydeder. Görev scripts\jev_not_puanla.py'yi çalıştırır; o betik hafıza notlarını
# SALT OKUNUR tarar, Jev'e puanlatır ve rapor klasörüne bir rapor yazar. Not taşımaz/değiştirmez.
# Aynı ada tekrar çalıştırmak görevi günceller (idempotent). Yönetici hakkı gerekmez; SYSTEM kullanılmaz;
# ACL, ortam değişkeni ve başka görevlere dokunmaz.
#
# Kurulum: powershell -ExecutionPolicy Bypass -File scripts\jev-not-puanla-gorev.ps1
# Geri alma: powershell -ExecutionPolicy Bypass -File scripts\jev-not-puanla-gorev.ps1 -Kaldir
#
# Not: JEV_ARACLAR ortam değişkeni kullanıcı için tanımlı olmalıdır (D:\YusufII\HAFIZAM1\jev-araclar).

param(
    [string]$RepoKoku = 'D:\YusufII\Projeler\TEZDENEME',
    [switch]$Kaldir
)

$ErrorActionPreference = 'Stop'
$GorevAdi = 'Jev not puanlama'

if ($Kaldir) {
    if (Get-ScheduledTask -TaskName $GorevAdi -ErrorAction SilentlyContinue) {
        Unregister-ScheduledTask -TaskName $GorevAdi -Confirm:$false
        Write-Host "Görev kaldırıldı: $GorevAdi"
    } else {
        Write-Host "Görev zaten yok: $GorevAdi"
    }
    return
}

$betik = Join-Path $RepoKoku 'scripts\jev_not_puanla.py'
if (-not (Test-Path -LiteralPath $betik)) {
    throw "Betik bulunamadı: $betik (-RepoKoku değerini kontrol edin)"
}

$kasa  = 'D:\YusufII\HAFIZAM1\kasa\notlar'
$cikti = 'D:\YusufII\HAFIZAM1\kasa\notlar\jev-puan-raporlari'
$argumanlar = "`"$betik`" --kasa `"$kasa`" --cikti `"$cikti`""

$eylem = New-ScheduledTaskAction -Execute 'python' -Argument $argumanlar -WorkingDirectory $RepoKoku
$tetik = New-ScheduledTaskTrigger -Daily -At '08:41'
$kullanici = [System.Security.Principal.WindowsIdentity]::GetCurrent().Name
$ana = New-ScheduledTaskPrincipal -UserId $kullanici -LogonType Interactive -RunLevel Limited
$ayar = New-ScheduledTaskSettingsSet -StartWhenAvailable -ExecutionTimeLimit (New-TimeSpan -Hours 1)

Register-ScheduledTask -TaskName $GorevAdi -Action $eylem -Trigger $tetik -Principal $ana `
    -Settings $ayar -Description 'Hafıza notlarını Jev ile puanlar ve rapor yazar (salt okunur).' -Force | Out-Null
Write-Host "Görev kaydedildi: $GorevAdi (her gün 08:41, kullanıcı: $kullanici)"
