!macro customInit
  # Outside $INSTDIR so uninstallOldVersion cannot remove the marker early.
  Push $0
  Push $1
  CreateDirectory "$INSTDIR"
  System::Call 'kernel32::GetCurrentProcessId() i .r0'
  FileOpen $1 "$INSTDIR.zyon-installing" w
  FileWrite $1 "$0"
  FileClose $1
  Pop $1
  Pop $0
!macroend

!macro customInstall
  # Called after files, registry and shortcuts, immediately before StartApp.
  Delete "$INSTDIR.zyon-installing"
!macroend
