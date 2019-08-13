import xlrd
import json

data = []

def read_poly(s):
    """Puts the (Laurent) poly into the form [mindeg, c0, c1, ..., cn]"""
    if s == "1":
        return [0,1]
    assert(s[0] == "{" and s[-1] == "}")
    ps = [int(p) for p in s[1:-1].split(",")]
    return [ps[0]] + ps[2:]

def convert_jones(p):
    """Take a jones polynomial for a knot (which is in t) and make it be in x=t^2."""
    p2 = [p[0]*2] + [0]*(2*(len(p)-1)-1)
    for i,c in enumerate(p[1:]):
        p2[1+2*i] = c
    return p2

def normalize_alex(p):
    cs = p[1:]
    while cs and cs[0] == 0:
        cs = cs[1:]
    if cs and cs[0] < 0:
        return [0] + [-c for c in cs]
    else:
        return [0] + cs

print("Processing knotinfo")
with xlrd.open_workbook("knotinfo_data_complete.xls") as book:
    sheet = book.sheet_by_index(0)
    cols = {}
    for i, cell in enumerate(sheet.row(0)):
        cols[cell.value] = i

    for row_idx in range(2, sheet.nrows):
        def get(colname):
            return sheet.cell(row_idx, cols[colname])
        
        entry={}
        entry['name'] = get('name').value
        if get('pd_notation').value == "":
            entry['pd'] = [[1,1]]
        else:
            entry['pd'] = json.loads(get('pd_notation').value)
        entry['crossing_number'] = int(get('crossing_number').value)
        entry['genus'] = int(get('three_genus').value)
        entry['signature'] = int(get('signature').value)
        entry['alexander'] = normalize_alex(read_poly(get('alexander_polynomial_vector').value))
        entry['jones'] = convert_jones(read_poly(get('jones_polynomial_vector').value))
        entry['turaev_genus'] = json.loads(get('turaev_genus').value) # might be [lo, hi]
        entry['bridge_number'] = int(get('bridge_index').value)

        data.append(entry)

print("Processing linkinfo")
with open("linkinfo_mv_alexander.json") as fin:
    mv_alex = json.load(fin)
with xlrd.open_workbook("linkinfo_data_complete.xlsx") as book:
    sheet = book.sheet_by_index(0)
    cols = {}
    for i, cell in enumerate(sheet.row(0)):
        cols[cell.value] = i

    for row_idx in range(2, sheet.nrows):
        def get(colname):
            return sheet.cell(row_idx, cols[colname])
        
        entry={}
        entry['name'] = get('name').value
        if not entry['name']:
            break
        entry['pd'] = json.loads(get('pd_notation_vector').value.replace("{","[").replace("}","]"))
        entry['crossing_number'] = int(get('crossing_number').value)
        entry['signature'] = int(get('signature').value)
        entry['alexander'] = normalize_alex([0] + mv_alex[row_idx-2])
        entry['jones'] = read_poly(get('jones_polynomial_vector').value)

        data.append(entry)

with open("knotinfo.js", "w") as fout:
    fout.write("\"use strict\";\n")
    fout.write("var knotinfo_data = ")
    json.dump(data, fout)
    fout.write(";\n")

print("Done processing")
