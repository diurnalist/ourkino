.PHONY: server
server: node_modules server/dist
	node index.js

SCRAPERS := $(shell find server/src/scraper -type f | sed 's/server\/src\/scraper\///' | sed 's/\.js//')

$(SCRAPERS:%=test-%): test-%:
	@ node test-scraper.js $*

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
