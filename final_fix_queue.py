import re
import os

path = 'plexus/templates/plexus/bouncer/queue.html'

if not os.path.exists(path):
    print(f"Error: {path} not found")
    exit(1)

with open(path, 'r') as f:
    content = f.read()

# Fix {% trans "..." %} split across lines
# Matches {% [spaces] trans [spaces] [newline] "String" [spaces] [newline] %}
# We replace with {% trans "String" %}
# We use re.sub with a function to handle the quoted string

def fix_trans_tag(match):
    # match.group(1) is the string content
    s = match.group(1)
    return f'{{% trans "{s}" %}}'

# Regex explanation:
# \{%\s*trans\s*     Matches start of tag and trans keyword
# [\s\n]*            Matches optional whitespace/newlines before quote
# "([^"]+)"          Matches logical string (assuming no escaped quotes for now)
# [\s\n]*            Matches optional whitespace/newlines after quote
# %\}                Matches end of tag
content = re.sub(
    r'\{%\s*trans\s*[\s\n]*"([^"]+)"[\s\n]*%\}', 
    fix_trans_tag, 
    content
)

# Fix {{ variable }} split across lines
# {{ [spaces] variable [spaces] [newline] }}
def fix_variable_tag(match):
    # content inside {{ ... }}
    inner = match.group(1)
    # Remove all newlines and extra spaces
    inner = re.sub(r'\s+', '', inner)
    return f'{{{{ {inner} }}}}'

content = re.sub(
    r'\{\{\s*([^}]+?)\s*\}\}', 
    fix_variable_tag, 
    content
)

with open(path, 'w') as f:
    f.write(content)

print(f"Fixed tags in {path}")
