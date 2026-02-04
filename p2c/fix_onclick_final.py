import os

filepath = '/Users/chris/dev/src/py/krispcBase/p2c/templates/home.html'

with open(filepath, 'r') as f:
    lines = f.readlines()

new_lines = []
changed = False
for line in lines:
    if 'onclick="alert(' in line and 'trans "' in line:
        # Match pattern: onclick="alert('{% trans " ... " %}')
        # We want to make sure it ends with )"
        # And we want to clean up the space
        fixed = line.strip()
        if not fixed.endswith(')"'):
            # Find the position of alert
            if "}')" in fixed:
                fixed = fixed.replace("}')", "}')\"")
            elif "}) " in fixed:
                fixed = fixed.replace("}) ", "})\" ")
            elif fixed.endswith("})"):
                fixed = fixed + "\""
            
            # Clean up space
            fixed = fixed.replace('trans " ', 'trans "')
            
            # Reconstruct the indentation
            indent = line[:line.find('<')]
            line = indent + fixed + '\n'
            changed = True
    new_lines.append(line)

if changed:
    with open(filepath, 'w') as f:
        f.writelines(new_lines)
    print("Fixed alert buttons in " + filepath)
else:
    print("No alert buttons needed fixing")
