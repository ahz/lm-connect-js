@ECHO OFF

IF EXIST "%root%output" (
	ECHO Removing "%root%output"
	rd /S /Q "%root%output"
)