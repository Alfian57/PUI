FROM golang:1.25-alpine AS builder

WORKDIR /src

COPY go.mod go.sum ./
RUN go mod download

COPY . .

RUN CGO_ENABLED=0 GOOS=linux go build -o /bin/vault-core ./cmd/vault-core

FROM alpine:3.20

RUN apk add --no-cache ca-certificates su-exec
RUN addgroup -g 20000 puiuds && adduser -D -u 10002 -G puiuds puivault

WORKDIR /app

COPY --from=builder /bin/vault-core /usr/local/bin/vault-core

CMD ["vault-core"]
