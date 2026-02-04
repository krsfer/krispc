import re
import os

filepath = '/Users/chris/dev/src/py/krispcBase/p2c/templates/home.html'

with open(filepath, 'r') as f:
    lines = f.readlines()

new_lines = []
changed = False

# regex for split tag
tag_pattern = re.compile(r'\{%[\s\S]*?%\}')

def consolidate(text):
    if '{%' in text and '%}' in text:
        # Match any {% ... %} including newlines
        def replace(match):
            tag = match.group(0)
            if '\n' in tag:
                inner = tag[2:-2].strip()
                return '{% ' + ' '.join(inner.split()) + ' %}'
            return tag
        return re.sub(r'\{%[\s\S]*?%\}', replace, text)
    return text

# First, consolidate all tags in the whole file
with open(filepath, 'r') as f:
    content = f.read()

new_content = consolidate(content)

# Then fix the specific onclick issue
lines = new_content.splitlines(keepends=True)
final_lines = []
for line in lines:
    if 'onclick="alert(\'{% trans' in line and not line.strip().endswith(')"'):
        # If it ends with ') and a newline or space, fix it
        # Actually just find the end of the alert and add the "
        if "}')" in line and '")' not in line:
            line = line.replace("}')", "}')\"")
            # Also remove the weird space if present
            line = line.replace('trans " ', 'trans "')
        elif '})' in line and '}")' not in line:
             line = line.replace("})", "})\"")
             
    final_lines.append(line)

with open(filepath, 'w') as f:
    f.writelines(final_lines)

print("Fixed tags and onclick alerts in " + filepath)
