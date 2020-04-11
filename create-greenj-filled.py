import json
import glob, os

knots = []

for filename in glob.glob("./knot-data/*.json"):
    with open(filename) as fin:
        entry = json.load(fin)
        knots.append(entry)

        if "url" in entry:
            entry["url"] = "GreenJ/" + entry['name'] + ".html"

        if "arrow" in entry:
            entry['arrow'] = entry['arrow'][:2]

knots.sort(key=lambda entry:[int(p) for p in entry['name'].split(".")])

with open("./src/greenj-filled.mjs", "w") as fout:
    fout.write("// virtual knot enumeration from Jeremy Green's database\n")
    fout.write("// invariants recalculated using virtual knotfolio (see Makefile)\n")
    fout.write("// then joined together using create-greenj-filled.py\n")
    fout.write("export const data = ")
    json.dump(knots, fout)
    fout.write("\n")
