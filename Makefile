.PHONY: install dev test build db-local db-seed deploy

install:
	npm install

db-local:
	npm run db:local

db-seed:
	npm run db:seed:local

dev:
	npm run dev

test:
	npm test

build:
	npm run build

deploy:
	npm run deploy
