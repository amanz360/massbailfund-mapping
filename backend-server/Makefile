.PHONY: test

LOG_DRIVER=syslog
ifeq ($(shell uname -s),Darwin)
	LOG_DRIVER=json-file
endif

# DOCKER TASKS
build-environment:
	docker build -f docker/Dockerfile-Environment -t massbailfund-dev:latest .
build:
	docker build \
	-f docker/Dockerfile-Deploy \
	-t massbailfund-deploy:latest \
	--build-arg ENV_IMAGE=massbailfund-dev:latest \
	--build-arg ENV_CONFIG=dev .
rebuild:
	docker build \
	--no-cache \
	-f docker/Dockerfile-Environment \
	-t massbailfund-dev:latest .
up:
	LOG_DRIVER=$(LOG_DRIVER) docker compose -f docker/compose-local.yml up -d
down:
	docker compose -f docker/compose-local.yml down
bdu: build-environment down up
restart:
	docker restart mbf-appserver
shell:
	docker exec --user "$(shell id -u):$(shell id -g)" -it mbf-appserver /bin/bash
shell-root:
	docker exec -u 0 -it mbf-appserver /bin/bash
test:
	docker exec -it mbf-appserver pytest $(TEST_PATH)
migrations:
	docker exec -it mbf-appserver ./manage.py makemigrations
migrate:
	docker exec -it mbf-appserver ./manage.py migrate
superuser:
	docker exec -it mbf-appserver ./manage.py createsuperuser
