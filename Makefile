.PHONY: server
server: node_modules server/dist
	node index.js

.PHONY: node_modules
node_modules: node_modules-stamp

node_modules-stamp:
	npm install
	touch $@

# Code transforms
server/dist: server/src
	cp -R $</ $@

.PHONY: clean
clean:
	git clean -dff
