ifdef WATCH
	FLAGS := --watch
endif

.PHONY: server
server: node_modules server/dist
	node index.js $(FLAGS)

SCRAPERS := $(shell find server/src/scraper -type f | sed 's/server\/src\/scraper\///' | sed 's/\.js//')

$(SCRAPERS:%=test-%): test-%: server/dist
	@ node test-scraper.js $*

.PHONY: node_modules
node_modules: node_modules-stamp

node_modules-stamp:
	npm install
	touch $@

# Code transforms
server/dist: $(shell find server/src -type f -name '*.js')
	@ cp -R server/src/ $@
	@ touch $@

.PHONY: clean
clean:
	git clean -dff
