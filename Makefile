knot_names := $(shell cat knot-names.txt)
knot_data_targets := $(addsuffix .json,$(addprefix knot-data/,$(knot_names)))

.PHONY : knot-data

knot-data: $(knot_data_targets)

knot-data/%.json: src/greenj-filled.mjs
	node --experimental-modules src/fill-in-poly-invts-one.mjs $(patsubst knot-data/%.json,%,$@) 

# cat knot-names.txt| parallel --will-cite -N1 echo hi
