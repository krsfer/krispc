import json

file_path = "/Users/chris/dev/src/py/_krispc/wat/static/data/contacts.json"
with open(file_path) as f:
    data = json.load(f)

# for each element in data, add an empty list [] called `tag`
for element in data:
    element["tag"] = []

print(json.dumps(data, indent=4, sort_keys=False, ensure_ascii=True))

# Write the updated contacts back to the contacts.json file
with open(file_path, 'w') as f:
    json.dump(data, f, indent=4)

exit()

with open("/Users/chris/Library/Application Support/JetBrains/PyCharm2023.3/scratches/scratch_14.json") as f:
    data = json.load(f)

# for each key in data, print the value of key:name
extract = []
for key in data:
    name = data[key]["name"]
    location = data[key]["location"]
    coords = []
    tags = []
    # print(f"{name} is located at {location}")
    # append name, location and coords to extract
    extract.append({"name": name, "address": location, "coords": coords, "tags": tags})

# print the contents of extract
# pprint(extract)
print(json.dumps(extract, indent=4, sort_keys=False, ensure_ascii=True))
