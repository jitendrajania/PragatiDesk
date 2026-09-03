Set WshShell = CreateObject("WScript.Shell")
' Launch PragatiDesk backend and frontend in silent background mode
WshShell.CurrentDirectory = "d:\PragatiDesk"
WshShell.Run "cmd /c npm run dev", 0, False
