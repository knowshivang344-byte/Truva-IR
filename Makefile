.PHONY: build dev migrate seed fixtures clean test logs

build:
	docker compose build

dev:
	docker compose up -d

stop:
	docker compose down

logs:
	docker compose logs -f

migrate:
	docker compose exec backend alembic upgrade head

# Helper to generate migrations:
# make makemigrations msg="initial"
makemigrations:
	docker compose exec backend alembic revision --autogenerate -m "$(msg)"
