# Frontend
FROM node:latest

WORKDIR /

COPY . .

RUN make build-frontend

EXPOSE 8080

# Backend
FROM golang:1.11

WORKDIR /

COPY . .

EXPOSE 8080

RUN make build-backend

CMD ["./instaHashCrawl"]