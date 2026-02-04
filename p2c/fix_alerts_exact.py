import os

filepath = '/Users/chris/dev/src/py/krispcBase/p2c/templates/home.html'

with open(filepath, 'r') as f:
    content = f.read()

# Exact match replacement
old_alert = "onclick=\"alert('{% trans \" Please upload a PDF or paste text first\" %}')\""
# Wait, the line in file might NOT have the closing "
bad_alert = "onclick=\"alert('{% trans \" Please upload a PDF or paste text first\" %}')\""
# Actually, the sed output showed:
# onclick="alert('{% trans " Please upload a PDF or paste text first" %}')"$
# So it has NO closing "

bad_line = '                    <button type="button" onclick="alert(\'{% trans " Please upload a PDF or paste text first" %}\')"'
good_line = '                    <button type="button" onclick="alert(\'{% trans "Please upload a PDF or paste text first" %}\')\"'

new_content = content.replace(bad_line, good_line)

if new_content != content:
    with open(filepath, 'w') as f:
        f.write(new_content)
    print("Successfully replaced the bad lines")
else:
    print("Could not find the bad lines for replacement")
