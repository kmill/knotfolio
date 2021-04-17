.PHONY: copy_static js all serve

serve:
	cd build && python3 -m http.server

copy_static:
	cp static/* build/

js:
	npx rollup --config

all: copy_static js
