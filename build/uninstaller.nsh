!macro customUnInstall
  MessageBox MB_YESNO|MB_ICONQUESTION "Delete all Poker Diary data (sessions, bankroll, tournaments, rooms)?" /SD IDNO IDNO skipDelete
  SetShellVarContext current
  RMDir /r "$APPDATA\poker-diary"
  skipDelete:
!macroend