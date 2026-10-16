; Yalnız kullanıcı başına kurulum: "tüm kullanıcılar" seçeneği ve yönetici yükseltmesi kapalı.
; Kaldırıcı ve program dosyaları kullanıcının kendi profilinde kalır; HKLM kaydı oluşmaz.
!macro customInstallMode
  StrCpy $isForceCurrentInstall "1"
!macroend
