# AgentMom Windows Credential Manager bridge (owner: AgentMom, module core/secrets).
# Touches ONLY entries whose target starts with "agentmom:". Value travels as base64 on stdin/stdout, never on the command line.
# Exit codes: 0 ok, 2 not found, 3 invalid target, 1 other error.
param(
  [Parameter(Mandatory = $true)][ValidateSet('get', 'put', 'delete', 'exists', 'list')][string]$Op,
  [string]$Target = ''
)
$ErrorActionPreference = 'Stop'
if ($Op -ne 'list' -and -not $Target.StartsWith('agentmom:')) { [Console]::Error.WriteLine('target must start with agentmom:'); exit 3 }
if ($Op -ne 'list' -and $Target.Length -gt 200) { [Console]::Error.WriteLine('target too long'); exit 3 }

Add-Type -TypeDefinition @"
using System;
using System.Runtime.InteropServices;
public static class AgentMomCred {
  [StructLayout(LayoutKind.Sequential, CharSet = CharSet.Unicode)]
  struct CREDENTIAL {
    public uint Flags; public uint Type; public string TargetName; public string Comment;
    public System.Runtime.InteropServices.ComTypes.FILETIME LastWritten;
    public uint CredentialBlobSize; public IntPtr CredentialBlob; public uint Persist;
    public uint AttributeCount; public IntPtr Attributes; public string TargetAlias; public string UserName;
  }
  [DllImport("advapi32.dll", SetLastError = true, CharSet = CharSet.Unicode)] static extern bool CredWrite(ref CREDENTIAL c, uint flags);
  [DllImport("advapi32.dll", SetLastError = true, CharSet = CharSet.Unicode)] static extern bool CredRead(string target, uint type, uint flags, out IntPtr cred);
  [DllImport("advapi32.dll", SetLastError = true, CharSet = CharSet.Unicode)] static extern bool CredDelete(string target, uint type, uint flags);
  [DllImport("advapi32.dll", SetLastError = true, CharSet = CharSet.Unicode)] static extern bool CredEnumerate(string filter, uint flags, out uint count, out IntPtr creds);
  [DllImport("advapi32.dll")] static extern void CredFree(IntPtr buf);
  const int NOT_FOUND = 1168;
  public static void Put(string target, byte[] blob) {
    IntPtr mem = Marshal.AllocHGlobal(blob.Length);
    try {
      Marshal.Copy(blob, 0, mem, blob.Length);
      CREDENTIAL c = new CREDENTIAL();
      c.Type = 1; c.TargetName = target; c.UserName = "agentmom"; c.Persist = 2;
      c.CredentialBlobSize = (uint)blob.Length; c.CredentialBlob = mem;
      if (!CredWrite(ref c, 0)) throw new System.ComponentModel.Win32Exception(Marshal.GetLastWin32Error());
    } finally { Marshal.FreeHGlobal(mem); }
  }
  public static byte[] Get(string target) {
    IntPtr p;
    if (!CredRead(target, 1, 0, out p)) {
      int e = Marshal.GetLastWin32Error();
      if (e == NOT_FOUND) return null;
      throw new System.ComponentModel.Win32Exception(e);
    }
    try {
      CREDENTIAL c = (CREDENTIAL)Marshal.PtrToStructure(p, typeof(CREDENTIAL));
      byte[] blob = new byte[c.CredentialBlobSize];
      if (c.CredentialBlobSize > 0) Marshal.Copy(c.CredentialBlob, blob, 0, blob.Length);
      return blob;
    } finally { CredFree(p); }
  }
  public static bool Delete(string target) {
    if (CredDelete(target, 1, 0)) return true;
    int e = Marshal.GetLastWin32Error();
    if (e == NOT_FOUND) return false;
    throw new System.ComponentModel.Win32Exception(e);
  }
  public static string[] List() {
    uint count; IntPtr arr;
    if (!CredEnumerate("agentmom:*", 0, out count, out arr)) {
      int e = Marshal.GetLastWin32Error();
      if (e == NOT_FOUND) return new string[0];
      throw new System.ComponentModel.Win32Exception(e);
    }
    try {
      string[] names = new string[count];
      for (int i = 0; i < count; i++) {
        IntPtr item = Marshal.ReadIntPtr(arr, i * IntPtr.Size);
        CREDENTIAL c = (CREDENTIAL)Marshal.PtrToStructure(item, typeof(CREDENTIAL));
        names[i] = c.TargetName;
      }
      return names;
    } finally { CredFree(arr); }
  }
}
"@

try {
  switch ($Op) {
    'put' {
      $b64 = [Console]::In.ReadToEnd().Trim()
      $bytes = [Convert]::FromBase64String($b64)
      if ($bytes.Length -eq 0 -or $bytes.Length -gt 2560) { [Console]::Error.WriteLine('invalid value size'); exit 1 }
      [AgentMomCred]::Put($Target, $bytes)
    }
    'get' {
      $bytes = [AgentMomCred]::Get($Target)
      if ($null -eq $bytes) { exit 2 }
      [Console]::Out.Write([Convert]::ToBase64String($bytes))
    }
    'exists' { if ($null -eq [AgentMomCred]::Get($Target)) { exit 2 } }
    'delete' { if (-not [AgentMomCred]::Delete($Target)) { exit 2 } }
    'list' { [Console]::Out.Write(([AgentMomCred]::List() -join "`n")) }
  }
  exit 0
} catch {
  [Console]::Error.WriteLine('credential manager error: ' + $_.Exception.GetType().Name)
  exit 1
}
