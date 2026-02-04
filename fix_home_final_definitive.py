#!/usr/bin/env python3
"""
FINAL FIX - Manually fix the exact problematic lines in home.html
"""

path = '/Users/chris/dev/src/py/krispcBase/p2c/templates/home.html'

with open(path, 'r') as f:
    lines = f.readlines()

# Lines 244-245 (0-indexed: 243-244): Split trans "Day"
if len(lines) > 244 and '{%' in lines[243] and 'trans "Day"' in lines[244]:
    lines[243] = lines[243].rstrip() + ' ' + lines[244].lstrip()
    del lines[244]
    print("Fixed lines 244-245")

# Lines 249-253 (now 248-252 after previous delete): Split blocktranslate
# Find the line with "blocktranslate with message="
for i in range(len(lines)):
    if 'blocktranslate with message=warning.warning_message' in lines[i]:
        # Collect all lines until endblocktranslate
        collected = []
        j = i
        while j < len(lines) and 'endblocktranslate' not in lines[j]:
            collected.append(lines[j].strip())
            j += 1
        if j < len(lines):
            collected.append(lines[j].strip())
        
        # Join into one line
        indent = lines[i][:len(lines[i]) - len(lines[i].lstrip())]
        joined_line = indent + ' '.join(collected) + '\n'
        
        # Replace the lines
        lines[i:j+1] = [joined_line]
        print(f"Fixed blocktranslate at line {i+1}")
        break

with open(path, 'w') as f:
    f.writelines(lines)

print("Done!")
