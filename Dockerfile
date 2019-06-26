# Frontend
FROM node:latest as frontend-builder

WORKDIR /

COPY . .

RUN make build-frontend

# EXPOSE 8080

# Backend
FROM golang:1.11 as backend-builder

WORKDIR /

COPY . .

ENV GO111MODULE=on
RUN GOOS=linux GOARCH=amd64 CGO_ENABLED=0 go build -ldflags="-s -w"  -mod=vendor . 

# RUN make build-backend


# Run Container
FROM alpine:latest

COPY --from=frontend-builder /web/build /web/build
COPY --from=backend-builder ./instaHashCrawl .

EXPOSE 8080

ENTRYPOINT [ "/instaHashCrawl"]