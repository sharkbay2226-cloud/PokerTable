@echo off
set ANTHROPIC_BASE_URL=http://127.0.0.1:11434/v1
set ANTHROPIC_API_KEY=ollama
claude --model gemma4:latest %*