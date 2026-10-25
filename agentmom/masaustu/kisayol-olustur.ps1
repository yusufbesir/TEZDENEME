# AgentMom kisayollari (Baslat menusu + istege bagli Masaustu). Sahip: Claude [IP:AgentMom Faz 11].
# Yalniz YENI kisayol dosyasi (.lnk) yazar; var olan bir kisayolun uzerine yazmaz (varsa atlar), hicbir sey silmez. Yonetici izni gerekmez.
# Kullanim: powershell -File kisayol-olustur.ps1 [-Masaustu]
param([switch]$Masaustu)
$here = Split-Path -Parent $MyInvocation.MyCommand.Path
$vbs = Join-Path $here 'AgentMom.vbs'
$ico = Join-Path $here 'agentmom.ico'
if (-not (Test-Path $ico)) { $ico = Join-Path $here '..\src\desktop\assets\agentmom.ico' }
$ws = New-Object -ComObject WScript.Shell
$targets = @((Join-Path ([Environment]::GetFolderPath('Programs')) 'AgentMom.lnk'))
if ($Masaustu) { $targets += (Join-Path ([Environment]::GetFolderPath('Desktop')) 'AgentMom.lnk') }
foreach ($t in $targets) {
  if (Test-Path $t) { Write-Output "Zaten var, dokunulmadi: $t"; continue }
  $s = $ws.CreateShortcut($t)
  $s.TargetPath = (Join-Path $env:WINDIR 'System32\wscript.exe')
  $s.Arguments = '"' + $vbs + '"'
  $s.WorkingDirectory = $here
  $s.IconLocation = (Resolve-Path $ico).Path
  $s.Description = 'AgentMom - yerel yapay zeka orkestrasyon uygulamasi'
  $s.Save()
  Write-Output "Kisayol yazildi: $t"
}
