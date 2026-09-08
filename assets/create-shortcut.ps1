$root = Split-Path -Parent $PSScriptRoot
$ws = New-Object -ComObject WScript.Shell
$link = $ws.CreateShortcut((Join-Path ([Environment]::GetFolderPath('Desktop')) 'RA Avaluació.lnk'))
$link.TargetPath = Join-Path $root '2-OBRIR-APLICACIO.bat'
$link.WorkingDirectory = $root
$link.IconLocation = (Join-Path $PSScriptRoot 'RA-Avaluacio.ico') + ',0'
$link.WindowStyle = 1
$link.Description = "Obre l'aplicacio RA Avaluacio en local"
$link.Save()
Write-Host "Acces directe creat a l'escriptori."
