
import os

path = '/Users/chris/dev/src/py/krispcBase/p2c/templates/home.html'

with open(path, 'r') as f:
    lines = f.readlines()

new_lines = []
i = 0
while i < len(lines):
    line = lines[i]
    # zero-indexed
    # Target 244-245 (file is 1-indexed, so 243-244 in list)
    if i == 243 and '{%' in line and 'trans "Day"' in lines[i+1]:
        # Join 243 and 244
        joined = line.rstrip() + ' ' + lines[i+1].lstrip()
        new_lines.append(joined)
        i += 2
        continue
    
    # Target 249-253 (248-252)
    if i == 248 and 'blocktranslate' in line:
        # Check if it spans multiple lines. The end is at 252 (line 253)
        # We want to join until line 253 inclusive?
        # Actually, let's just join specific count of lines if we are sure of position
        # Or match content.
        # Line 248 starts `{% blocktranslate`. Line 252 ends `{% endblocktranslate %}`
        # Let's verify context.
        chunk = lines[i:i+5] # 248, 249, 250, 251, 252
        if 'endblocktranslate' in chunk[-1]:
             joined = "".join([l.strip() + " " for l in chunk]).strip() + "\n"
             # Preserve indentation of first line
             indent = line[:line.find('{%')]
             new_lines.append(indent + joined)
             i += 5
             continue
    
    new_lines.append(line)
    i += 1

with open(path, 'w') as f:
    f.writelines(new_lines)

print("Fixed home.html")
