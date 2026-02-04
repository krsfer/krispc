#!/usr/bin/env python3
"""
Comprehensive fix for all split template tags in home.html.
This script manually fixes specific known problematic lines.
"""

path = '/Users/chris/dev/src/py/krispcBase/p2c/templates/home.html'

with open(path, 'r') as f:
    lines = f.readlines()

# Track which lines to skip (they've been merged)
skip_lines = set()
new_lines = []

for i, line in enumerate(lines):
    if i in skip_lines:
        continue
    
    # Line 244-245: Split trans "Day"
    if i == 243 and '{%' in line and i+1 < len(lines) and 'trans "Day"' in lines[i+1]:
        new_lines.append(line.rstrip() + ' ' + lines[i+1].lstrip())
        skip_lines.add(i+1)
        continue
    
    # Lines 249-253: Split blocktranslate
    if i == 248 and 'blocktranslate with message=' in line:
        # Collect all lines until endblocktranslate
        collected = [line.strip()]
        j = i + 1
        while j < len(lines) and 'endblocktranslate' not in lines[j]:
            collected.append(lines[j].strip())
            skip_lines.add(j)
            j += 1
        if j < len(lines):
            collected.append(lines[j].strip())
            skip_lines.add(j)
        # Join into one line with proper indentation
        indent = line[:len(line) - len(line.lstrip())]
        joined = ' '.join(collected)
        new_lines.append(indent + joined + '\n')
        continue
    
    new_lines.append(line)

with open(path, 'w') as f:
    f.writelines(new_lines)

print(f"Fixed home.html - merged {len(skip_lines)} lines")
