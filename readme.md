# KnotFolio

This is a program for manipulating and identifying knots and links.  The primary input method for diagrams is a kind of paint program with a special paintbrush that helps with drawing crossings.  You can also drag-and-drop images into the program, say a picture of a pencil, chalk, or whiteboard drawing.

![Pencil drawing to a modifiable diagram](https://raw.githubusercontent.com/kmill/knotfolio/master/example.jpg)

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
NODE_OPTIONS=--max_old_space_size=4096 parcel index.html
```
A "production" bundle can be created in the `dist` folder with
```
NODE_OPTIONS=--max_old_space_size=4096 parcel build index.html --public-url ./
```

The command `npm test` runs some tests.

## License

KnotFolio, Copyright (C) 2019  Kyle Miller

This program is free software; you can redistribute it and/or
modify it under the terms of the GNU General Public License
as published by the Free Software Foundation; either version 2
of the License, or (at your option) any later version.

This program is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
GNU General Public License for more details.

You should have received a copy of the GNU General Public License
along with this program; if not, write to the Free Software
Foundation, Inc., 51 Franklin Street, Fifth Floor, Boston, MA  02110-1301, USA.

