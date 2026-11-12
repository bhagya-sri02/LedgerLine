$env:JAVA_HOME = "C:\Program Files\Java\jdk-22"
Set-Location -Path "backend"
cmd /c "mvnw.cmd package -DskipTests"

