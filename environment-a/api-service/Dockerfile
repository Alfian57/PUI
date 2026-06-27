FROM golang:1.25-alpine AS builder

WORKDIR /src

COPY go.mod go.sum ./
RUN go mod download

COPY . .

RUN CGO_ENABLED=0 GOOS=linux go build -o /bin/api-service ./cmd/api-service
RUN CGO_ENABLED=0 GOOS=linux go build -o /bin/migrate ./cmd/migrate

FROM alpine:3.20

RUN apk add --no-cache ca-certificates
RUN addgroup -g 20000 puiuds && adduser -D -u 10001 -G puiuds puiapi

WORKDIR /app

COPY --from=builder /bin/api-service /usr/local/bin/api-service
COPY --from=builder /bin/migrate /usr/local/bin/migrate
COPY --from=builder /src/db/migrations /app/db/migrations

USER 10001:20000

CMD ["api-service"]
