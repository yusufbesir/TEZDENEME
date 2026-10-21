; Ne: Adım Adım Windows kurulum + kaldırma programı (NSIS 3, Unicode). Sahibi: Yusuf (yusufbesir).
; Yazan: [İP:Adım Adım Windows sürümü#cihaz] Claude. Değiştirme kuralı: .claude/rules/windows-uygulama-dagitimi.md
; Üretim: tool/kurulum/derle.ps1 (dosya listesini üretir, sonra makensis çalıştırır).
;
; Düzen: program %LOCALAPPDATA%\Programs\Adim-Adim (yönetici gerekmez), kısayollar Başlat menüsü,
; kayıt HKCU Uninstall (Uygulamalar listesinde görünür). Kullanıcı verisi %APPDATA%\tr.adimadim\adim_adim
; kaldırmada yalnız kullanıcı onaylarsa silinir.
; Silme kuralı: kaldırıcı yalnız surum-dosyalar.txt'deki (SHA-256'sı derleme sırasında gömülü) dosyaları siler;
; "RMDir /r" yok, klasörler yalnız boşsa kalkar; bağ/junction (reparse point) olan yola dokunulmaz.
; Güncelleme: yeni sürüm üstüne kurulur, doğrulanır; yeni sürümde artık olmayan ESKİ dosyalar eski listeden
; çıkarılıp silinir. Kurulum başarısızsa eski dosyalar silinmez.

Unicode true
!include "MUI2.nsh"
!include "LogicLib.nsh"
!include "FileFunc.nsh"
!include "TextFunc.nsh"
!insertmacro GetSize
!insertmacro TrimNewLines
!insertmacro un.TrimNewLines
!include "uretilen\liste-sha.nsh"   ; !define LISTE_SHA256 "<hex>" — derle.ps1 üretir

!ifndef SURUM
  !error "SURUM tanımlı değil (/DSURUM=1.2.3.4)"
!endif
!ifndef CIKTI
  !error "CIKTI tanımlı değil"
!endif

!define UYGULAMA "Adım Adım"
!define KLASOR_ADI "Adim-Adim"
!define ANAHTAR "Software\Microsoft\Windows\CurrentVersion\Uninstall\AdimAdim"
!define LISTE "surum-dosyalar.txt"

Name "${UYGULAMA}"
OutFile "${CIKTI}"
InstallDir "$LOCALAPPDATA\Programs\${KLASOR_ADI}"
InstallDirRegKey HKCU "${ANAHTAR}" "InstallLocation"
RequestExecutionLevel user
SetCompressor /SOLID lzma
BrandingText "${UYGULAMA} ${SURUM}"

VIProductVersion "${SURUM}"
VIAddVersionKey /LANG=1055 "ProductName" "${UYGULAMA}"
VIAddVersionKey /LANG=1055 "FileDescription" "${UYGULAMA} kurulum programı"
VIAddVersionKey /LANG=1055 "FileVersion" "${SURUM}"
VIAddVersionKey /LANG=1055 "CompanyName" "Yusuf"

!define MUI_ICON "..\..\windows\runner\resources\app_icon.ico"
!define MUI_UNICON "..\..\windows\runner\resources\app_icon.ico"
!define MUI_ABORTWARNING
!define MUI_FINISHPAGE_RUN "$INSTDIR\adim_adim.exe"
!define MUI_FINISHPAGE_RUN_TEXT "${UYGULAMA}'ı başlat"

!insertmacro MUI_PAGE_DIRECTORY
!insertmacro MUI_PAGE_INSTFILES
!insertmacro MUI_PAGE_FINISH
!insertmacro MUI_UNPAGE_CONFIRM
!insertmacro MUI_UNPAGE_INSTFILES
!insertmacro MUI_LANGUAGE "Turkish"

; ---- Güvenli göreli yol denetimi: yığındaki yolu alır, "1" (güvenli) ya da "0" bırakır ----
!macro YOL_GUVENLI_TANIM ON
Function ${ON}YolGuvenli
  Exch $R0
  Push $R1
  Push $R2
  Push $R3
  Push $R5
  StrLen $R1 $R0
  StrCpy $R5 "0"
  ${If} $R1 > 0
  ${AndIf} $R1 < 900
    StrCpy $R3 $R0 1
    ${If} $R3 != "\"
      StrCpy $R5 "1"
      StrCpy $R2 0
      ${While} $R2 < $R1
        StrCpy $R3 $R0 1 $R2
        ${If} $R3 == ":"
        ${OrIf} $R3 == "/"
        ${OrIf} $R3 == "*"
        ${OrIf} $R3 == "?"
        ${OrIf} $R3 == "<"
        ${OrIf} $R3 == ">"
        ${OrIf} $R3 == "|"
        ${OrIf} $R3 == '"'
          StrCpy $R5 "0"
        ${EndIf}
        StrCpy $R3 $R0 2 $R2
        ${If} $R3 == ".."
        ${OrIf} $R3 == "\\"
          StrCpy $R5 "0"
        ${EndIf}
        IntOp $R2 $R2 + 1
      ${EndWhile}
    ${EndIf}
  ${EndIf}
  StrCpy $R0 $R5
  Pop $R5
  Pop $R3
  Pop $R2
  Pop $R1
  Exch $R0
FunctionEnd
!macroend

; Yol (mutlak) reparse point mu (bağ/junction)? Yığına "1"/"0" bırakır.
!macro BAG_TANIM ON
Function ${ON}BagMi
  Exch $R0
  Push $R1
  System::Call 'kernel32::GetFileAttributesW(w R0) i .R1'
  ${If} $R1 == -1
    StrCpy $R0 "1"
  ${Else}
    IntOp $R1 $R1 & 0x400
    ${If} $R1 == 0
      StrCpy $R0 "0"
    ${Else}
      StrCpy $R0 "1"
    ${EndIf}
  ${EndIf}
  Pop $R1
  Exch $R0
FunctionEnd
!macroend

!insertmacro YOL_GUVENLI_TANIM ""
!insertmacro BAG_TANIM ""
!insertmacro YOL_GUVENLI_TANIM "un."
!insertmacro BAG_TANIM "un."


; Yığından (saman, iğne) alır; saman içinde iğne (büyük/küçük harf duyarsız) varsa "1" bırakır.
Function un.Icerir
  Exch $R0   ; iğne
  Exch
  Exch $R1   ; saman
  Push $R2
  Push $R3
  Push $R4
  Push $R5
  StrLen $R2 $R0
  StrLen $R3 $R1
  StrCpy $R4 0
  icerir_dongu:
    IntCmp $R4 $R3 icerir_yok 0 icerir_yok
    StrCpy $R5 $R1 $R2 $R4
    StrCmp $R5 $R0 icerir_var
    IntOp $R4 $R4 + 1
    Goto icerir_dongu
  icerir_var:
    StrCpy $R0 "1"
    Goto icerir_bitti
  icerir_yok:
    StrCpy $R0 "0"
  icerir_bitti:
  Pop $R5
  Pop $R4
  Pop $R3
  Pop $R2
  Pop $R1
  Exch $R0
FunctionEnd

; Kaldırma başarısız olursa nedeni sessiz kipte de görünsün diye kaldir-hata.log'a yazılır, sonra durulur.
!macro UN_HATA MESAJ
  FileOpen $9 "$INSTDIR\kaldir-hata.log" w
  FileWrite $9 "${MESAJ}"
  FileClose $9
  Abort "${MESAJ}"
!macroend

; ---- Kurulum ----
Section "Kur" SecKur
  ; Çalışan uygulama dosyaları kilitler; kullanıcıdan kapatmasını iste (süreç öldürülmez).
  kapat_kontrol:
  IfFileExists "$INSTDIR\adim_adim.exe" 0 kapat_tamam
  ClearErrors
  FileOpen $0 "$INSTDIR\adim_adim.exe" a
  IfErrors 0 kapat_acildi
    MessageBox MB_RETRYCANCEL|MB_ICONEXCLAMATION "${UYGULAMA} çalışıyor. Lütfen uygulamayı kapatıp Yeniden Dene'ye basın." IDRETRY kapat_kontrol
    Abort "Kurulum iptal edildi."
  kapat_acildi:
  FileClose $0
  kapat_tamam:

  ; Önceki sürümün dosya listesini sakla (güncellemede artık kullanılmayanları ayıklamak için).
  IfFileExists "$INSTDIR\${LISTE}" 0 +2
  CopyFiles /SILENT "$INSTDIR\${LISTE}" "$INSTDIR\eski-dosyalar.txt"

  SetOutPath "$INSTDIR"
  !include "uretilen\dosyalar-kur.nsh"
  File "/oname=${LISTE}" "uretilen\${LISTE}"

  ; Güncelleme temizliği: eski listede olup yeni listede olmayan dosyalar (yalnız yeni sürüm kurulduktan sonra).
  IfFileExists "$INSTDIR\eski-dosyalar.txt" 0 temizlik_yok
  FileOpen $1 "$INSTDIR\eski-dosyalar.txt" r
  eski_dongu:
    FileRead $1 $2
    IfErrors eski_bitti
    ${TrimNewLines} "$2" $2
    StrCpy $3 $2 2
    StrCmp $3 "F|" 0 eski_dongu
    StrCpy $4 $2 "" 2
    Push $4
    Call YolGuvenli
    Pop $5
    StrCmp $5 "1" 0 eski_dongu
    ; yeni listede var mı?
    StrCpy $6 "0"
    FileOpen $7 "$INSTDIR\${LISTE}" r
    yeni_dongu:
      FileRead $7 $8
      IfErrors yeni_bitti
      ${TrimNewLines} "$8" $8
      StrCmp $8 $2 0 yeni_dongu
      StrCpy $6 "1"
    yeni_bitti:
    FileClose $7
    StrCmp $6 "1" eski_dongu
    ; artık kullanılmıyor: yol ve bağ denetiminden geçerse sil
    Push "$INSTDIR\$4"
    Call BagMi
    Pop $5
    StrCmp $5 "0" 0 eski_dongu
    Delete "$INSTDIR\$4"
    Goto eski_dongu
  eski_bitti:
  FileClose $1
  Delete "$INSTDIR\eski-dosyalar.txt"
  temizlik_yok:

  WriteUninstaller "$INSTDIR\kaldir.exe"
  CreateDirectory "$SMPROGRAMS\${UYGULAMA}"
  CreateShortCut "$SMPROGRAMS\${UYGULAMA}\${UYGULAMA}.lnk" "$INSTDIR\adim_adim.exe"
  CreateShortCut "$SMPROGRAMS\${UYGULAMA}\${UYGULAMA} Kaldır.lnk" "$INSTDIR\kaldir.exe"

  WriteRegStr HKCU "${ANAHTAR}" "DisplayName" "${UYGULAMA}"
  WriteRegStr HKCU "${ANAHTAR}" "DisplayVersion" "${SURUM}"
  WriteRegStr HKCU "${ANAHTAR}" "Publisher" "Yusuf"
  WriteRegStr HKCU "${ANAHTAR}" "InstallLocation" "$INSTDIR"
  WriteRegStr HKCU "${ANAHTAR}" "DisplayIcon" "$INSTDIR\adim_adim.exe"
  WriteRegStr HKCU "${ANAHTAR}" "UninstallString" '"$INSTDIR\kaldir.exe"'
  WriteRegStr HKCU "${ANAHTAR}" "QuietUninstallString" '"$INSTDIR\kaldir.exe" /S'
  WriteRegDWORD HKCU "${ANAHTAR}" "NoModify" 1
  WriteRegDWORD HKCU "${ANAHTAR}" "NoRepair" 1
  ${GetSize} "$INSTDIR" "/S=0K" $0 $1 $2
  IntFmt $0 "0x%08X" $0
  WriteRegDWORD HKCU "${ANAHTAR}" "EstimatedSize" $0
SectionEnd

; ---- Kaldırma ----
Section "Uninstall"
  ; Kendi kurulum klasörümüz mü? Sürücü kökü ya da bağ ise hiçbir şey silinmez.
  StrLen $0 "$INSTDIR"
  ${If} $0 < 4
    !insertmacro UN_HATA "Kurulum klasörü doğrulanamadı; hiçbir şey silinmedi."
  ${EndIf}
  IfFileExists "$INSTDIR\adim_adim.exe" un_exe_var
    !insertmacro UN_HATA "Kurulum klasörü doğrulanamadı (adim_adim.exe yok); hiçbir şey silinmedi."
  un_exe_var:
  Push "$INSTDIR"
  Call un.BagMi
  Pop $0
  StrCmp $0 "0" un_bag_yok
    !insertmacro UN_HATA "Kurulum klasörü bir bağ/junction; hiçbir şey silinmedi."
  un_bag_yok:

  ; Çalışıyorsa kapatılmasını iste.
  uyg_kontrol:
  ClearErrors
  FileOpen $0 "$INSTDIR\adim_adim.exe" a
  IfErrors 0 uyg_acildi
    MessageBox MB_RETRYCANCEL|MB_ICONEXCLAMATION "${UYGULAMA} çalışıyor. Lütfen kapatıp Yeniden Dene'ye basın." IDRETRY uyg_kontrol
    !insertmacro UN_HATA "Kaldırma iptal edildi."
  uyg_acildi:
  FileClose $0

  ; Dosya listesinin bütünlüğü (SHA-256 derlemeye gömülü).
  IfFileExists "$INSTDIR\${LISTE}" un_liste_var
    !insertmacro UN_HATA "${LISTE} yok; güvenli silme yapılamaz, hiçbir şey silinmedi."
  un_liste_var:
  nsExec::ExecToStack '"$SYSDIR\certutil.exe" -hashfile "$INSTDIR\${LISTE}" SHA256'
  Pop $0
  Pop $1
  ${If} $0 != 0
    !insertmacro UN_HATA "Liste doğrulanamadı; hiçbir şey silinmedi."
  ${EndIf}
  Push $1
  Push "${LISTE_SHA256}"
  Call un.Icerir
  Pop $0
  ${If} $0 != "1"
    !insertmacro UN_HATA "Dosya listesinin özeti uyuşmuyor; hiçbir şey silinmedi."
  ${EndIf}

  ; Dosyalar: yalnız "F|" satırları, yol ve bağ denetiminden geçenler.
  FileOpen $1 "$INSTDIR\${LISTE}" r
  sil_dongu:
    FileRead $1 $2
    IfErrors sil_bitti
    ${un.TrimNewLines} "$2" $2
    StrCpy $3 $2 2
    StrCmp $3 "F|" 0 sil_dongu
    StrCpy $4 $2 "" 2
    Push $4
    Call un.YolGuvenli
    Pop $5
    StrCmp $5 "1" 0 sil_dongu
    Push "$INSTDIR\$4"
    Call un.BagMi
    Pop $5
    StrCmp $5 "0" 0 sil_dongu
    Delete "$INSTDIR\$4"
    Goto sil_dongu
  sil_bitti:
  FileClose $1

  ; Klasörler: listedekileri en derinden başlayarak, yalnız boşsa (özyinelemesiz).
  FileOpen $1 "$INSTDIR\${LISTE}" r
  klasor_dongu:
    FileRead $1 $2
    IfErrors klasor_bitti
    ${un.TrimNewLines} "$2" $2
    StrCpy $3 $2 2
    StrCmp $3 "D|" 0 klasor_dongu
    StrCpy $4 $2 "" 2
    Push $4
    Call un.YolGuvenli
    Pop $5
    StrCmp $5 "1" 0 klasor_dongu
    Push "$INSTDIR\$4"
    Call un.BagMi
    Pop $5
    StrCmp $5 "0" 0 klasor_dongu
    RMDir "$INSTDIR\$4"
    Goto klasor_dongu
  klasor_bitti:
  FileClose $1

  Delete "$INSTDIR\${LISTE}"
  Delete "$INSTDIR\eski-dosyalar.txt"
  Delete "$INSTDIR\kaldir-hata.log"
  Delete "$INSTDIR\kaldir-hata.log"
  Delete "$INSTDIR\kaldir.exe"
  RMDir "$INSTDIR"   ; yalnız boşsa; kullanıcının koyduğu dosya varsa kalır

  Delete "$SMPROGRAMS\${UYGULAMA}\${UYGULAMA}.lnk"
  Delete "$SMPROGRAMS\${UYGULAMA}\${UYGULAMA} Kaldır.lnk"
  RMDir "$SMPROGRAMS\${UYGULAMA}"
  DeleteRegKey HKCU "${ANAHTAR}"

  ; Kullanıcı verisi: yalnız onaylarsa. Varsayılan Hayır.
  IfFileExists "$APPDATA\tr.adimadim\adim_adim\*.*" 0 veri_yok
  IfSilent veri_yok
  MessageBox MB_YESNO|MB_ICONQUESTION|MB_DEFBUTTON2 "İlerleme ve ayarların da silinsin mi?$\r$\n(Hayır dersen verilerin kalır; sonra yeniden kurarsan kaldığın yerden devam edersin.)" IDYES 0 IDNO veri_yok
  Push "$APPDATA\tr.adimadim\adim_adim"
  Call un.BagMi
  Pop $0
  StrCmp $0 "0" 0 veri_yok
  RMDir /r "$APPDATA\tr.adimadim\adim_adim"
  RMDir "$APPDATA\tr.adimadim"
  veri_yok:
SectionEnd
