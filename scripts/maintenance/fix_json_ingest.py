import re

path = '/Users/chris/dev/src/py/krispcBase/p2c/templates/json_ingest.html'

with open(path, 'r') as f:
    content = f.read()

# Strategy: Find all {% trans ... %} and {% blocktranslate ... %} tags that span multiple lines
# and join them into single lines

# Pattern to match split trans tags
# This will match {% trans or {% blocktranslate that doesn't have %} on the same line
pattern = r'(\{%\s*(?:trans|blocktranslate)[^%]*)\n\s*([^{]*%\})'

def join_split_tags(match):
    """Join split template tags onto one line"""
    part1 = match.group(1)
    part2 = match.group(2)
    return part1 + ' ' + part2.strip()

# Apply the fix multiple times to handle nested cases
for _ in range(5):  # Run multiple passes to catch all splits
    old_content = content
    content = re.sub(pattern, join_split_tags, content)
    if content == old_content:
        break  # No more changes

with open(path, 'w') as f:
    f.write(content)

print("Fixed json_ingest.html split tags")
