import json
import glob, os

knots = []

for filename in glob.glob("./knot-data/*.json"):
    with open(filename) as fin:
        entry = json.load(fin)
        knots.append(entry)

types = {}

for knot in knots:
    key = (tuple(knot['alex']),
           tuple(tuple(j) for j in knot['jones']),
           tuple(tuple(j) for j in knot['arrow'])
    )
    types.setdefault(key, []).append(knot['name'])

print("%r types with %r knots" % (len(types), len(knots)))

for k,v in types.items():
    if len(v) > 1:
        print(v)
