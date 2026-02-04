import os

filepath = '/Users/chris/dev/src/py/krispcBase/p2c/templates/home.html'

with open(filepath, 'r') as f:
    lines = f.readlines()

new_lines = []
changed = False
for line in lines:
    if 'onclick="alert(\'{% trans' in line and not line.strip().endswith(')"'):
        # Force add the quote at the end of the alert call
        if line.strip().endswith("}')"):
             line = line.replace("}')", "}')\"")
             changed = True
        elif line.strip().endswith("}') "):
             line = line.replace("}') ", "}')\" ")
             changed = True
             
    new_lines.append(line)

if changed:
    with open(filepath, 'w') as f:
        f.writelines(new_lines)
    print("Fixed alert buttons in " + filepath)
else:
    print("No alert buttons needed fixing or pattern didn't match")
