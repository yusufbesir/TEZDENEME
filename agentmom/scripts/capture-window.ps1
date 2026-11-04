# Captures ONLY one window's OWN content (by title) with PrintWindow: other windows that overlap it (remote desktop sessions, chats, ...) can never end up in the picture.
# Owner: Claude [IP:AgentMom Faz 11]. Usage: powershell -File capture-window.ps1 -Title "AgentMom" -Out file.png [-Width 1280 -Height 800]
param([Parameter(Mandatory)][string]$Title, [Parameter(Mandatory)][string]$Out, [int]$Width = 0, [int]$Height = 0)
Add-Type -AssemblyName System.Windows.Forms, System.Drawing
Add-Type @'
using System; using System.Runtime.InteropServices;
public class Win { [DllImport("user32.dll")] public static extern bool PrintWindow(IntPtr h, IntPtr hdc, uint flags);
 [DllImport("user32.dll")] public static extern bool ShowWindow(IntPtr h, int c); [DllImport("user32.dll")] public static extern bool MoveWindow(IntPtr h, int x, int y, int w, int hgt, bool r);
 [DllImport("dwmapi.dll")] public static extern int DwmGetWindowAttribute(IntPtr h, int a, out RECT r, int sz);
 [DllImport("user32.dll")] public static extern bool GetWindowRect(IntPtr h, out RECT r);
 [DllImport("user32.dll")] public static extern bool SetProcessDPIAware();
 public struct RECT { public int L, T, R, B; } }
'@
[void][Win]::SetProcessDPIAware()   # gerçek (fiziksel) piksel boyutları: ölçeklemeli ekranda pencere kırpılmasın
$p = Get-Process | Where-Object { $_.MainWindowTitle -like "*$Title*" -and $_.MainWindowHandle -ne 0 } | Select-Object -First 1
if (-not $p) { Write-Error "window not found"; exit 1 }
$h = $p.MainWindowHandle
[void][Win]::ShowWindow($h, 9)
if ($Width -gt 0) { [void][Win]::MoveWindow($h, 40, 20, $Width, $Height, $true) }
Start-Sleep -Milliseconds 900
$r = New-Object Win+RECT; [void][Win]::GetWindowRect($h, [ref]$r)
$w = $r.R - $r.L; $hh = $r.B - $r.T
$bmp = New-Object System.Drawing.Bitmap $w, $hh
$g = [System.Drawing.Graphics]::FromImage($bmp)
$hdc = $g.GetHdc()
$ok = [Win]::PrintWindow($h, $hdc, 2)   # 2 = PW_RENDERFULLCONTENT (Chromium/GPU pencereleri dahil)
$g.ReleaseHdc($hdc); $g.Dispose()
if (-not $ok) { Write-Error "PrintWindow failed"; exit 2 }
$bmp.Save($Out); "saved $Out ${w}x${hh}"
