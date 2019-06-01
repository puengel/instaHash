build-ui:
	@cd web && npm run build

build-server:
	@go build

run:
	@make build-ui
	@make build-server
	./instaHashCrawl

build-frontend:
	@make install-ui
	@make build-ui

build-backend:
	@make build-server

install-ui:
	@cd web && npm install

docker:
	@sudo docker build --tag=instahash .
	@sudo docker run -p 80:8080 -e VIRTUALHOST=test.localhost instahash