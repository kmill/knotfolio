/* The knot table.  As tables are loaded, this array is populated with
 * knot data.  The key is the knot name (accd to KnotInfo/LinkInfo) */
const table = new Map;
self.knot_table = table;

/* a object containing objects that describe how to load this part of
 * the table and whether it's loaded. */
var table_loaders = {};

/* A list of files that have already been requested. */
var requested_files = [];

/* A list of callbacks waiting on things being loaded */
var waiting = [];

function mk_table_loader_key(db, components, crossing_number, property) {
  return "/" + db + "/" + components + "/" + crossing_number + "/" + property;
}

function get_table_loader_entry(db, components, crossing_number, property) {
  let key = mk_table_loader_key(db, components, crossing_number, property);
  let entry = table_loaders[key];
  if (!entry) {
    entry = table_loaders[key] = {
      file: null,
      loaded: false
    };
  }
  return entry;
}

self.provides_knot_data = function (file, db, components, crossing_numbers, properties) {
  /* Declare a file as being able to provide some knot data. */
  crossing_numbers.forEach(crossing_number => {
    components.forEach(comps => {
      properties.forEach(property => {
        let entry = get_table_loader_entry(db, comps, crossing_number, property);
        if (!entry.loaded && !entry.file) {
          entry.file = file;
        }
      });
    });
  });
};

self.loaded_knot_data = function (db, components, crossing_numbers, properties) {
  /* Record that some knot data has been loaded, to notify anyone who might be waiting for it. */
  crossing_numbers.forEach(crossing_number => {
    components.forEach(comps => {
      properties.forEach(property => {
        let entry = get_table_loader_entry(db, comps, crossing_number, property);
        entry.loaded = true;
      });
    });
  });
  console.log("Loaded knot data db=%s; crossings=%s; components=%s; properties=%s", db, crossing_numbers.join(','), components.join(','), properties.join(','));

  // Update keys for waiting things
  var to_notify = [];
  waiting.forEach(entry => {
    entry.keys = entry.keys.filter(key => !table_loaders[key].loaded);
    if (entry.keys.length === 0) {
      to_notify.push(entry.callback);
    }
  });
  waiting = waiting.filter(entry => entry.keys.length > 0);
  // Notify things waiting on no more keys
  to_notify.forEach(callback => callback());
};

self.add_knot_data = function (db, properties, data) {
  /* Add data to the knot table.  (Does not notify anyone about the loaded data.  Use `loaded_knot_data`). */

  for (let i = 0; i < data.length; i += 1 + properties.length) {
    let name = data[i];
    let entry = table.get(name);
    if (!entry) {
      entry = {name: name, db: db};
      table.set(name, entry);
    }
    properties.forEach((property, j) => {
      entry[property] = data[i + j + 1];
    });
  }
};

function needed_files(db, components, crossing_number, properties) {
  /* Get a list of filenames that still need to be loaded. The `incomplete` key
   refers to whether there are no data files that satisfy the request . */
  let files = [];
  let incomplete = false;
  let missing_entries = [];
  for (let c = 0; c <= crossing_number; c++) {
    properties.forEach(property => {
      let entry = get_table_loader_entry(db, components, c, property);
      if (entry.file) {
        if (!entry.loaded) {
          if (!files.includes(entry.file)) {
            files.push(entry.file);
          }
          missing_entries.push(mk_table_loader_key(db, components, c, property));
        }
      } else {
        incomplete = true;
      }
    });
  }
  return {
    files: files,
    incomplete: incomplete,
    missing_entries: missing_entries
  };
}
self.needed_files = needed_files;

function load_data(filename) {
  if (!requested_files.includes(filename)) {
    requested_files.push(filename);
    let tag = document.createElement("script");
    tag.src = filename;
    tag.type = "text/javascript";
    tag.async = true;
    document.getElementsByTagName('head')[0].appendChild(tag);
  }
}

export function get_knots(db, components, crossings, properties) {
  /* Get list of all knots/links with at most the given number of crossings */

  // First determine which files to load (if any)
  let needed = needed_files(db, components, crossings, properties);
  console.log(needed);

  function _get_knots(resolve) {
    let knots = [];
    table.forEach(knot => {
      if (knot.db === db && knot.components === components && knot.crossing_number <= crossings) {
        knots.push(knot);
      }
    });
    resolve({
      knots: knots,
      incomplete: needed.incomplete
    });
  }

  return new Promise((resolve, reject) => {
    if (needed.files.length > 0) {
      needed.files.forEach(filename => load_data(filename));
      waiting.push({
        callback: () => _get_knots(resolve),
        keys: needed.missing_entries
      });
    } else {
      _get_knots(resolve);
    }
  });
}

self.get_knots = get_knots;
