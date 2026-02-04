#!/usr/bin/env python3
"""
Final comprehensive fix - reads current state and fixes ALL split template tags.
"""
import re

def fix_template_file(filepath):
    with open(filepath, 'r') as f:
        content = f.read()
    
    # Fix split trans/blocktranslate tags that span multiple lines
    # Pattern: {% trans or {% blocktranslate that doesn't close on same line
    # We need to be careful not to merge block tags incorrectly
    
    # First pass: Fix simple {% trans "..." %} splits
    pattern1 = r'(\{%\s*trans\s+["\'][^"\']*)\n\s*([^{]*["\'][^%]*%\})'
    content = re.sub(pattern1, lambda m: m.group(1) + ' ' + m.group(2).strip(), content)
    
    # Second pass: Fix {% trans ... %} where %} is on next line
    pattern2 = r'(\{%\s*trans[^%]+)\n\s*(%\})'
    content = re.sub(pattern2, lambda m: m.group(1) + ' ' + m.group(2).strip(), content)
    
    # Third pass: Fix {% if ... %} where %} is on next line
    pattern3 = r'(\{%\s*if[^%]+)\n\s*(%\})'
    content = re.sub(pattern3, lambda m: m.group(1) + ' ' + m.group(2).strip(), content)
    
    # Fourth pass: Fix {% endif %} where endif is on next line
    pattern4 = r'(\{%)\n\s*(endif\s*%\})'
    content = re.sub(pattern4, lambda m: m.group(1) + ' ' + m.group(2).strip(), content)
    
    # Fifth pass: Fix {% blocktranslate ... %} where %} is on next line (but NOT endblocktranslate)
    pattern5 = r'(\{%\s*blocktranslate[^%]+)\n\s*(%\})'
    content = re.sub(pattern5, lambda m: m.group(1) + ' ' + m.group(2).strip(), content)
    
    # Sixth pass: Fix {% endblocktranslate %} where endblocktranslate is on next line
    pattern6 = r'(\{%)\n\s*(endblocktranslate\s*%\})'
    content = re.sub(pattern6, lambda m: m.group(1) + ' ' + m.group(2).strip(), content)
    
    with open(filepath, 'w') as f:
        f.write(content)
    
    print(f"Fixed {filepath}")

# Fix both files
fix_template_file('/Users/chris/dev/src/py/krispcBase/p2c/templates/home.html')
fix_template_file('/Users/chris/dev/src/py/krispcBase/p2c/templates/json_ingest.html')
