' AgentMom masaustu baslaticisi (konsol penceresi acmaz). Sahip: Claude [IP:AgentMom Faz 11]; yalniz Claude degistirir, silme yalniz Yusuf'un karari (Geri Donusum Kutusu).
' Cift tikla: sunucuyu gizli baslatir, AgentMom penceresini acar, pencere kapaninca sunucuyu duzgun durdurur.
' Hata olursa <proje>\..\agentmom-state\desktop\AgentMom-hata.txt dosyasina bakin. Node yalniz bilinen MUTLAK yollardan kullanilir (calisma klasorundeki node.exe/node.bat calistirilmaz).
Option Explicit
Dim sh, fso, root, node, cmd, logDir, errFile, p, candidates
Set sh = CreateObject("WScript.Shell")
Set fso = CreateObject("Scripting.FileSystemObject")
root = sh.ExpandEnvironmentStrings("%AGENTMOM_HOME%")
If root = "%AGENTMOM_HOME%" Or Not fso.FolderExists(root) Then root = "D:\YusufII\Projeler\agentmom"
node = ""
candidates = Array("D:\n8n\nodejs\node.exe", "C:\Program Files\nodejs\node.exe")
For Each p In candidates
  If node = "" Then
    If fso.FileExists(p) Then node = p
  End If
Next
If node = "" Then
  MsgBox "Node.js bulunamadi (D:\n8n\nodejs veya C:\Program Files\nodejs). AgentMom baslatilamadi.", 16, "AgentMom"
  WScript.Quit 2
End If
logDir = fso.BuildPath(fso.GetParentFolderName(root), "agentmom-state\desktop")
If Not fso.FolderExists(logDir) Then
  If Not fso.FolderExists(fso.GetParentFolderName(logDir)) Then fso.CreateFolder fso.GetParentFolderName(logDir)
  fso.CreateFolder logDir
End If
errFile = fso.BuildPath(logDir, "AgentMom-hata.txt")
sh.CurrentDirectory = root
cmd = "cmd /c """"" & node & """ src\desktop\launcher.ts > """ & errFile & """ 2>&1"""
sh.Run cmd, 0, False
