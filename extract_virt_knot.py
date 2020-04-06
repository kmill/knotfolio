import json

cr = -1
num = 1

data = []

new_data = {}
with open("greenj-filled.json") as fin:
    filled = json.load(fin)
    for entry in filled:
        new_data[entry['name']] = entry

with open("virtual-knots-6.txt") as fin:
    for line in fin:
        parts = line.split()
        sym = parts[0]
        gauss = parts[1] if len(parts) > 1 else ""

        crossings = len(gauss) // 6
        if crossings > cr:
            cr = crossings
            num = 1
        else:
            num += 1

        if crossings > 5:
            break

        name = str(cr) + "." + str(num)

        pd = []
        for _ in range(cr):
            pd.append([-1,-1,-1,-1])

        for i in range(2 * cr):
            idx = i * 3;
            over = gauss[idx] == 'O'
            c = int(gauss[idx+1])-1
            pos = gauss[idx+2] == '+'

            j = (i + 1) % (2 * cr);

            if over:
                pd[c][3] = i+1
                pd[c][1] = j+1
            elif pos:
                pd[c][0] = i+1
                pd[c][2] = j+1
            else:
                pd[c][2] = i+1
                pd[c][0] = j+1

        for i, entry in enumerate(pd):
            if entry[0]-entry[2] == 1 or entry[0]-entry[2] < -1:
                pd[i] = entry[2:] + entry[:2]

        if not pd:
            pd.append([1,1])

        entry=new_data.get(name, {})
        entry['name'] = name
        entry['pd'] = pd
        entry['crossing_number'] = cr
        if cr <= 4:
            entry['url'] = 'https://www.math.toronto.edu/drorbn/Students/GreenJ/' + name + '.html'

        data.append(entry)

with open("./src/greenj-filled.mjs", "w") as fout:
    fout.write("// generated by extract_virt_knot.py from Jeremy Green's database\n")
    fout.write("// then filled in by fill-in-poly-invts.mjs\n")
    fout.write("export const data = ")
    json.dump(data, fout)
    fout.write(";\n")

print("Done processing")
