@echo off
echo Downloading report...
curl -s -o "%TEMP%\bot-report.html" http://sharkbqo.beget.tech/bot-report.html
start "" "%TEMP%\bot-report.html"
echo Done.
