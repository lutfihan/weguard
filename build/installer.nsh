; Windows açılışında başlatma kaydını kurulum yazar, kaldırıcı siler (uygulamanın nasıl başlatıldığından bağımsız).
!define WEGUARD_RUN_KEY "Software\Microsoft\Windows\CurrentVersion\Run"
!define WEGUARD_RUN_NAME "com.weguard.app"

!macro customInstall
  WriteRegStr HKCU "${WEGUARD_RUN_KEY}" "${WEGUARD_RUN_NAME}" '"$INSTDIR\${APP_EXECUTABLE_FILENAME}"'
!macroend

; Kaldırırken Wallpaper Engine'i eski haline döndürür: kutuyu çıkarır ve orijinal index.html'i yedekten
; geri yükler. Sürüm güncellemesinde (eski sürüm sessizce kaldırılıp yenisi kurulurken) bu adım atlanır;
; yeni sürüm açılınca kutuyu zaten kendisi ekler, açılış kaydını da yeni kurulum yeniden yazar.
!macro customUnInstall
  ${ifNot} ${isUpdated}
    ExecWait '"$INSTDIR\${APP_EXECUTABLE_FILENAME}" --uninstall-box'
  ${endIf}
  DeleteRegValue HKCU "${WEGUARD_RUN_KEY}" "${WEGUARD_RUN_NAME}"
!macroend
