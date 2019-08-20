# KnotFolio

## Acknowledgments

Thanks to ICERM for hosting the [https://icerm.brown.edu/topical_workshops/tw19-3-pods/](Perspectives on Dehn Surgery) summer school, where Stefan Mihajlović asked whether there existed any programs for importing knot diagrams from papers, and where Ken Baker and Nathan Dunfield were helpful while I worked on the first prototype.

Some UI ideas came from [http://KLO-Software.net](KLO) and Josh Horowitz's [http://joshuahhh.com/projects/kit/](knot identification tool).

Knot identification uses the invaluable KnotInfo and LinkInfo databases:

* J. C. Cha and C. Livingston, KnotInfo: Table of Knot Invariants, http://www.indiana.edu/~knotinfo, August 18, 2019.

* J. C. Cha and C. Livingston, LinkInfo: Table of Knot Invariants, http://www.indiana.edu/~linkinfo, August 18, 2019.

## Running code locally

The `knotinfo` module is very large, which causes the JavaScript bundler to eat an extremely large amount of memory.  This requires the use of an option for `node` to allow more memory when running `parcel`:
```
NODE_OPTIONS=--max_old_space_size=4096 parcel knotfolio.html
```

The command `npm test` runs some tests.
