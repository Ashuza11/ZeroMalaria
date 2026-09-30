.PHONY: data train seed api web test install demo

demo:
	@echo "Run scripts/demo.ps1 on Windows, or: make seed && make api & make web"

VENV=.venv/Scripts

install:
	python -m venv .venv
	$(VENV)/python -m pip install --upgrade pip
	$(VENV)/python -m pip install -r apps/api/requirements.txt -r ml/requirements.txt
	cd apps/web && npm install

data:
	$(VENV)/python data/generate_synthetic.py

train:
	$(VENV)/python ml/train.py

seed:
	$(VENV)/python apps/api/app/seed.py

api:
	cd apps/api && ../.venv/Scripts/python -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000

web:
	cd apps/web && npm run dev

test:
	$(VENV)/python -m pytest apps/api/tests -q
	cd apps/web && npm test -- --run
