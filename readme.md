# KnotFolio

This is a program for manipulating and identifying knots and links.  The primary input method for diagrams is a kind of paint program with a special paintbrush that helps with drawing crossings.  You can also drag-and-drop images into the program, say a picture of a pencil, chalk, or whiteboard drawing.

## Acknowledgments

Thanks to ICERM for hosting the [Perspectives on Dehn Surgery](https://icerm.brown.edu/topical_workshops/tw19-3-pods/) summer school, where Stefan Mihajlović asked whether there existed any programs for importing knot diagrams from papers, and where Ken Baker and Nathan Dunfield were helpful while I worked on the first prototype.

Some UI ideas came from [KLO](http://KLO-Software.net) and Josh Horowitz's [knot identification tool](http://joshuahhh.com/projects/kit/).

Knot identification uses the invaluable KnotInfo and LinkInfo databases:

* J. C. Cha and C. Livingston, KnotInfo: Table of Knot Invariants, http://www.indiana.edu/~knotinfo, August 18, 2019.

* J. C. Cha and C. Livingston, LinkInfo: Table of Knot Invariants, http://www.indiana.edu/~linkinfo, August 18, 2019.

The program was written with support of the Simons Foundation.

## Running code locally

The `knotinfo` module is very large, which causes the JavaScript bundler to eat an extremely large amount of memory.  This requires the use of an option for `node` to allow more memory when running `parcel`:
```
NODE_OPTIONS=--max_old_space_size=4096 parcel knotfolio.html
```

The command `npm test` runs some tests.

## License

The software is (c) 2019 Kyle Miller, and it is distributed under the GPL-2.0-or-later license.
