import json
from pprint import pprint

# read json file "/Users/chris/Library/Application Support/JetBrains/PyCharm2023.3/scratches/scratch_14.json" into
# a variable called data and print it
with open("/Users/chris/Library/Application Support/JetBrains/PyCharm2023.3/scratches/scratch_14.json") as f:
    data = json.load(f)

# for each key in data, print the value of key:name
extract = []
for key in data:
    name = data[key]["name"]
    location = data[key]["location"]
    coords = []
    # print(f"{name} is located at {location}")
    # append name, location and coords to extract
    extract.append({"name": name, "address": location, "coords": coords})

# print the contents of extract
# pprint(extract)
s = json.dumps(extract, indent=4, sort_keys=False, ensure_ascii=True)
print(s)
