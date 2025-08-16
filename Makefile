# Simple local dev helpers

.PHONY: serve dev

PORT ?= 8080
HOST ?= localhost

serve:
	@echo "Starting local server at http://$(HOST):$(PORT)"
	@python3 devserver.py $(PORT) $(HOST)

# Alias
dev: serve


