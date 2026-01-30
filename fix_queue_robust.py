import re
import os

path = 'plexus/templates/plexus/bouncer/queue.html'

if not os.path.exists(path):
    print(f"Error: {path} not found")
    exit(1)

with open(path, 'r') as f:
    content = f.read()

# Fix {% trans "..." %}
# This regex matches {% trans "..." %} spanning multiple lines.
# re.DOTALL makes . match newlines, but we use explicit \s so we don't need it for quoting?
# Actually simpler: match {% trans, then anything until %}, and clean it up.
def fix_trans(match):
    text = match.group(1).strip()
    return '{% trans "' + text + '" %}'

# Matches {% trans "TEXT" %} possibly with newlines everywhere
# We assume the string itself is "..."
# Pattern: {% +trans + "..." + %}
# We use re.DOTALL so \s matches everything including newlines
content = re.sub(
    r'\{%\s*trans\s*"([^"]+)"\s*%\}', 
    lambda m: f'{{% trans "{m.group(1)}" %}}', 
    content, 
    flags=re.DOTALL
)

# Fix {{ variable }}
def fix_var(match):
    var = match.group(1).strip()
    # Collapse multiple spaces/newlines to single space
    var = re.sub(r'\s+', '', var) 
    return '{{ ' + var + ' }}'

# Matches {{ ... }} with newlines
content = re.sub(
    r'\{\{\s*([^}]+?)\s*\}\}', 
    fix_var, 
    content, 
    flags=re.DOTALL
)

with open(path, 'w') as f:
    f.write(content)

print(f"Successfully updated tags in {path}")
