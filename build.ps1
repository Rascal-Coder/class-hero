param([string]$Creator = 'C:\ProgramData\cocos\editors\Creator\3.8.8\CocosCreator.exe')
$ErrorActionPreference = 'Stop'
$projectRoot = $PSScriptRoot
if (-not (Test-Path -LiteralPath $Creator)) { throw '请通过 -Creator 指定 Cocos Creator 3.8.8 可执行文件。' }
$buildProcess = Start-Process -FilePath $Creator -ArgumentList @('--project', ('"' + $projectRoot + '"'), '--build', ('"configPath=' + $projectRoot + '\build-config.json"')) -WindowStyle Hidden -Wait -PassThru
if ($buildProcess.ExitCode -ne 36 -and $buildProcess.ExitCode -ne 0) { throw "Cocos 构建失败，退出码 $($buildProcess.ExitCode)" }
Write-Output '构建完成。运行 npm run preview 后访问 http://localhost:7459'
