@REM ----------------------------------------------------------------------------
@REM Maven Wrapper Batch Script for Windows (targeting Maven 3.9.9)
@REM ----------------------------------------------------------------------------

@IF "%DEBUG%" == "" @ECHO OFF
setlocal enableextensions enabledelayedexpansion

IF EXIST "%USERPROFILE%\.mavenrc_pre.bat" call "%USERPROFILE%\.mavenrc_pre.bat"

SET "BASE_DIR=%~dp0"
IF "%BASE_DIR:~-1%"=="\" SET "BASE_DIR=%BASE_DIR:~0,-1%"

SET "WRAPPER_JAR=%BASE_DIR%\.mvn\wrapper\maven-wrapper.jar"
SET "WRAPPER_LAUNCHER=org.apache.maven.wrapper.MavenWrapperMain"

IF NOT DEFINED JAVA_HOME (
  FOR /F "tokens=*" %%i IN ('where java.exe 2^>nul') DO (
    SET "JAVA_EXE=%%i"
    GOTO :found_java
  )
  ECHO Error: JAVA_HOME is not set and java.exe could not be found in PATH.
  EXIT /B 1
) ELSE (
  SET "JAVA_EXE=%JAVA_HOME%\bin\java.exe"
)

:found_java
IF NOT EXIST "%JAVA_EXE%" (
  ECHO Error: %JAVA_EXE% does not exist.
  EXIT /B 1
)

IF EXIST "%WRAPPER_JAR%" (
  "%JAVA_EXE%" %MAVEN_OPTS% "-Dmaven.multiModuleProjectDirectory=%BASE_DIR%" -classpath "%WRAPPER_JAR%" %WRAPPER_LAUNCHER% %*
  EXIT /B %ERRORLEVEL%
)

ECHO Maven wrapper jar not found. Attempting fallback to system Maven...
FOR /F "tokens=*" %%M IN ('where mvn.cmd 2^>nul') DO (
  "%%M" %*
  EXIT /B %ERRORLEVEL%
)

ECHO Error: Neither %WRAPPER_JAR% nor system mvn.cmd is available.
EXIT /B 1
