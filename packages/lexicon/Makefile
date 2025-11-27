# Makefile for generating PNG and SVG from PlantUML files

# Variables
PUML_FILES = $(wildcard *.puml)
PNG_FILES = $(PUML_FILES:.puml=.png)
SVG_FILES = $(PUML_FILES:.puml=.svg)

# Default target
.PHONY: all
all: $(PNG_FILES) $(SVG_FILES)

# Rule to generate PNG from PUML
%.png: %.puml Makefile
	@echo "Generating $@ from $<"
	plantuml -tpng -pipe < $< > $@

# Rule to generate SVG from PUML
%.svg: %.puml Makefile
	@echo "Generating $@ from $<"
	plantuml -tsvg -pipe < $< > $@

.PHONY: clean
clean:
	@echo "Cleaning generated PNG and SVG files..."
	@rm -f $(PNG_FILES) $(SVG_FILES)

.PHONY: help
help:
	@echo "Available targets:"
	@echo "  all    - Generate all PNG and SVG files from PUML files"
	@echo "  clean  - Remove generated PNG and SVG files"
	@echo "  help   - Show this help message"

