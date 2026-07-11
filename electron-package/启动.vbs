Set WshShell = CreateObject("WScript.Shell")
Set fso = CreateObject("Scripting.FileSystemObject")

' Get the directory where this script is located
scriptDir = fso.GetParentFolderName(WScript.ScriptFullName)

' Start the server silently
WshShell.CurrentDirectory = scriptDir
WshShell.Run "cmd /c node server.js", 0, False

' Wait a moment for server to start
WScript.Sleep 1000

' Open browser
WshShell.Run "http://localhost:8765", 1, False

' Show tray notification
Set objShell = CreateObject("Shell.Application")
