#!/usr/bin/env python3
"""
FINAL ULTIMATE FIX - Handle ALL edge cases including heavily indented multi-line tags
"""
import re

path = '/Users/chris/dev/src/py/krispcBase/p2c/templates/home.html'

with open(path, 'r') as f:
    content = f.read()

# Apply fixes in order, MANY passes to catch everything
for iteration in range(10):
    old_content = content
    
    # Fix 1: {% trans "..." where closing is on next line (greedy match across lines)
    content = re.sub(r'(\{%\s*trans\s+["\'][^"\']*)\n\s*([^{]*["\'][^%]*%\})', 
                     lambda m: m.group(1) + ' ' + m.group(2).strip(), content, flags=re.MULTILINE)
    
    # Fix 2: {% trans ... where %} is on next line (any trans tag)
    content = re.sub(r'(\{%\s*trans[^%]+)\n\s*(%\})', 
                     lambda m: m.group(1) + ' ' + m.group(2).strip(), content, flags=re.MULTILINE)
    
    # Fix 3: {% if ... where %} is on next line
    content = re.sub(r'(\{%\s*if[^%]+)\n\s*(%\})', 
                     lambda m: m.group(1) + ' ' + m.group(2).strip(), content, flags=re.MULTILINE)
    
    # Fix 4: {% where endif is on next line
    content = re.sub(r'(\{%)\n\s*(endif\s*%\})', 
                     lambda m: m.group(1) + ' ' + m.group(2).strip(), content, flags=re.MULTILINE)
    
    # Fix 5: {% blocktranslate ... where %} is on next line (opening tag)
    content = re.sub(r'(\{%\s*blocktranslate[^%]+)\n\s*(%\})', 
                     lambda m: m.group(1) + ' ' + m.group(2).strip(), content, flags=re.MULTILINE)
    
    # Fix 6: ... {% endblocktranslate where %} is on next line
    content = re.sub(r'(\{%\s*endblocktranslate)\n\s*(%\})', 
                     lambda m: m.group(1) + ' ' + m.group(2).strip(), content, flags=re.MULTILINE)
    
    # Fix 7: ... where {% endblocktranslate is missing %}
    content = re.sub(r'(\{%\s*endblocktranslate)(\s*\n)', 
                     r'\1 %}\2', content, flags=re.MULTILINE)
    
    # Fix 8: Multi-line blocktranslate with parameters split across lines
    # Match {% blocktranslate with ... that continues on next lines until %}
    content = re.sub(r'(\{%\s*blocktranslate\s+with\s+[^\n]+)\n(\s+[^\n]+)\n(\s+[^\n]+%\})', 
                     lambda m: m.group(1) + ' ' + m.group(2).strip() + ' ' + m.group(3).strip(), 
                     content, flags=re.MULTILINE)
    
    # Fix 9: Multi-line blocktranslate with 4+ lines
    content = re.sub(r'(\{%\s*blocktranslate\s+with\s+[^\n]+)\n(\s+[^\n]+)\n(\s+[^\n]+)\n(\s+[^\n]+%\})', 
                     lambda m: m.group(1) + ' ' + m.group(2).strip() + ' ' + m.group(3).strip() + ' ' + m.group(4).strip(), 
                     content, flags=re.MULTILINE)
    
    # Fix 10: Content split after %} in blocktranslate
    content = re.sub(r'(%\}\{\{)\n\s*([^}]+\}\})', 
                     lambda m: m.group(1) + ' ' + m.group(2).strip(), content, flags=re.MULTILINE)
    
    # Fix 11: Closing part of blocktranslate split
    content = re.sub(r'(\}\})\n\s*(\{%\s*endblocktranslate)', 
                     lambda m: m.group(1) + ' ' + m.group(2).strip(), content, flags=re.MULTILINE)
    
    if content == old_content:
        print(f"Converged after {iteration + 1} iterations")
        break
else:
    print("Reached maximum iterations (10)")

with open(path, 'w') as f:
    f.write(content)

print("Fixed home.html - ALL split tags should be resolved")
