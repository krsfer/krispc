import os

path = '/Users/chris/dev/src/py/krispcBase/p2c/templates/home.html'

with open(path, 'r') as f:
    lines = f.readlines()

new_lines = []
i = 0
while i < len(lines):
    line = lines[i]
    
    # Fix line 197-198 (196-197 in 0-indexed): split if/endif
    if i == 196 and '{% if current_month_name' in line and 'endif' in lines[i+1]:
        # Join lines 197 and 198
        joined = line.rstrip() + ' ' + lines[i+1].lstrip()
        new_lines.append(joined)
        i += 2
        continue
    
    # Fix line 201-202 (200-201 in 0-indexed): split trans tag
    if i == 200 and 'show-all-events' in line and 'trans "Show All"' in lines[i+1]:
        # Join lines 201 and 202
        joined = line.rstrip() + ' ' + lines[i+1].lstrip()
        new_lines.append(joined)
        i += 2
        continue
    
    new_lines.append(line)
    i += 1

with open(path, 'w') as f:
    f.writelines(new_lines)

print("Fixed home.html split tags (lines 197-198, 201-202)")
