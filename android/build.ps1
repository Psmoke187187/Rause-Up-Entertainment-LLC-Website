param(
    [Parameter(Mandatory=$true)][string]$JavaHome,
    [Parameter(Mandatory=$true)][string]$GradleHome,
    [Parameter(Mandatory=$true)][string]$SdkRoot
)
$ErrorActionPreference = 'Stop'
$env:JAVA_HOME = (Resolve-Path -LiteralPath $JavaHome).Path
$env:ANDROID_HOME = (Resolve-Path -LiteralPath $SdkRoot).Path
$env:ANDROID_SDK_ROOT = $env:ANDROID_HOME
$env:GRADLE_USER_HOME = Join-Path $PSScriptRoot '.gradle-user-home'
$env:ANDROID_USER_HOME = Join-Path $PSScriptRoot '.android-user-home'
New-Item -ItemType Directory -Path $env:ANDROID_USER_HOME -Force | Out-Null
$gradleExecutable = Join-Path (Resolve-Path -LiteralPath $GradleHome).Path 'bin\gradle.bat'
if (-not (Test-Path -LiteralPath $gradleExecutable -PathType Leaf)) { throw 'Gradle 8.13 is required.' }
Push-Location $PSScriptRoot
try {
    & $gradleExecutable --no-daemon --stacktrace testDebugUnitTest lintDebug assembleDebug bundleRelease
    if ($LASTEXITCODE -ne 0) { throw 'Android build or verification failed.' }
} finally { Pop-Location }
