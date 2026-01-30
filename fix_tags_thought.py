import re
import os

path = 'plexus/templates/plexus/thought_edit.html'

if not os.path.exists(path):
    print(f"Error: {path} not found")
    exit(1)

with open(path, 'r') as f:
    content = f.read()

# Pattern to match {% trans ... %} where string is on next line
# Matches: {% trans \n "String" %} or similar variations
# Replaces with: {% trans "String" %}
pattern = r'{%\s*trans\s*\n\s*"([^"]+)"\s*%}'
content = re.sub(pattern, r'{% trans "\1" %}', content)

# Check for pattern with newline after string too: {% trans "String" \n %}
pattern2 = r'{%\s*trans\s*"([^"]+)"\s*\n\s*%}'
content = re.sub(pattern2, r'{% trans "\1" %}', content)

with open(path, 'w') as f:
    f.write(content)

print("Successfully updated tags locally.")
