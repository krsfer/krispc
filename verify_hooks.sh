#!/bin/bash

echo "Testing SessionStart hook..."
echo '{}' | python3 .gemini/hooks/on_session_start.py
echo -e "\n"

echo "Testing BeforeTool hook..."
echo '{"tool_name": "read_file", "tool_input": {"file_path": "README.md"}}' | python3 .gemini/hooks/log_tool.py
echo -e "\n"

echo "Current log content:"
cat .gemini/hooks.log
