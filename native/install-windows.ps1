param([Parameter(Mandatory=$true)][string]$TorPath)
$ErrorActionPreference = 'Stop'
if (-not (Test-Path -LiteralPath $TorPath -PathType Leaf)) { throw 'tor.exe dosyası bulunamadı.' }
& py -3 -m pip install pyinstaller
if ($LASTEXITCODE -ne 0) { throw 'PyInstaller kurulamadı. Python 3 kurulumu ve ağ bağlantısını kontrol et.' }
& py -3 "$PSScriptRoot\install.py" --tor-path $TorPath
if ($LASTEXITCODE -ne 0) { throw 'VEIL yardımcı kurulumu tamamlanamadı.' }
