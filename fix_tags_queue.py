import re
import os

path = 'plexus/templates/plexus/bouncer/queue.html'

if not os.path.exists(path):
    print(f"Error: {path} not found")
    exit(1)

with open(path, 'r') as f:
    content = f.read()

# Pattern 1: {% trans \n "String" %}
pattern1 = r'{%\s*trans\s*\n\s*"([^"]+)"\s*%}'
content = re.sub(pattern1, r'{% trans "\1" %}', content)

# Pattern 2: {% trans "String" \n %}
pattern2 = r'{%\s*trans\s*"([^"]+)"\s*\n\s*%}'
content = re.sub(pattern2, r'{% trans "\1" %}', content)

# Pattern 3: {% trans \n "String" \n %} (both split)
pattern3 = r'{%\s*trans\s*\n\s*"([^"]+)"\s*\n\s*%}'
content = re.sub(pattern3, r'{% trans "\1" %}', content)

with open(path, 'w') as f:
    f.write(content)

print(f"Successfully updated tags in {path}")
