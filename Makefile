.PHONY: up down logs migrate seed seed-prototipo seed-volume test test-fe e2e parity lint schema-check shell staging-up staging-down staging-logs staging-migrate staging-seed

COMPOSE_STAGING := docker compose -f docker-compose.staging.yml --env-file .env.staging

up:
	docker compose up -d --build
	docker compose exec api uv run python manage.py migrate --noinput
	docker compose exec api uv run python manage.py seed

down:
	docker compose down

logs:
	docker compose logs -f --tail=100

staging-up:
	$(COMPOSE_STAGING) up -d --build
	$(COMPOSE_STAGING) run --rm api python manage.py migrate --noinput
	$(COMPOSE_STAGING) run --rm api python manage.py seed
	$(COMPOSE_STAGING) run --rm api python manage.py seed_prototipo

staging-down:
	$(COMPOSE_STAGING) down

staging-logs:
	$(COMPOSE_STAGING) logs -f --tail=100

staging-migrate:
	$(COMPOSE_STAGING) run --rm api python manage.py migrate --noinput

staging-seed:
	$(COMPOSE_STAGING) run --rm api python manage.py seed_prototipo


migrate:
	docker compose exec api uv run python manage.py makemigrations
	docker compose exec api uv run python manage.py migrate --noinput

seed:
	docker compose exec api uv run python manage.py seed

seed-prototipo:
	docker compose exec api uv run python manage.py seed_prototipo

seed-volume:
	docker compose exec api uv run python manage.py seed_volume

test:
	docker compose exec -e DJANGO_SETTINGS_MODULE=config.settings.test api uv run pytest -q

test-fe:
	cd frontend && pnpm --filter @nc/ui test && pnpm --filter web test && pnpm --filter campo test

e2e:
	cd frontend && pnpm exec playwright test

parity:
	cd frontend && pnpm exec playwright test --project=parity

lint:
	docker compose exec api uv run ruff check apps config
	cd frontend && pnpm exec eslint . || true

schema-check:
	docker compose exec api uv run python manage.py spectacular --file /tmp/openapi.json --validate
	docker compose exec api uv run python manage.py makemigrations --check --dry-run

shell:
	docker compose exec api uv run python manage.py shell
