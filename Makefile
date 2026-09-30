.PHONY: data train seed api web test install demo

demo:
	@echo "Run scripts/demo.ps1 on Windows, or: make seed && make api & make web"

ifeq ($(OS),Windows_NT)
VENV_BIN=.venv/Scripts
PYTHON=$(VENV_BIN)/python.exe
else
VENV_BIN=.venv/bin
PYTHON=$(VENV_BIN)/python
endif

install:
	python3 -m venv .venv
	$(PYTHON) -m pip install --upgrade pip
	$(PYTHON) -m pip install -r apps/api/requirements.txt -r ml/requirements.txt
	cd apps/web && npm ci

data:
	$(PYTHON) data/generate_synthetic.py

train:
	$(PYTHON) ml/train.py

seed:
	$(PYTHON) apps/api/app/seed.py

seed-demo:
	$(VENV)/python apps/api/app/seed.py --mode demo

api:
	cd apps/api && ../../$(PYTHON) -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000

web:
	cd apps/web && npm run dev

test:
	$(PYTHON) -m pytest apps/api/tests -q
	cd apps/web && npm test -- --run
