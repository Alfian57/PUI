package middleware

import (
	"net/http"
	"strings"
	"sync"
	"time"

	"github.com/gin-gonic/gin"
)

type rateBucket struct {
	Count   int
	ResetAt time.Time
}

type RateLimiter struct {
	mu      sync.Mutex
	limit   int
	window  time.Duration
	buckets map[string]rateBucket
}

func NewRateLimiter(limit int, window time.Duration) *RateLimiter {
	return &RateLimiter{
		limit:   limit,
		window:  window,
		buckets: make(map[string]rateBucket),
	}
}

func (l *RateLimiter) Middleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		if c.Request.Method == http.MethodOptions {
			c.Next()
			return
		}

		if strings.HasPrefix(c.Request.URL.Path, "/api/v1/health") {
			c.Next()
			return
		}

		clientID := requesterID(c)
		if !l.Allow(clientID) {
			c.JSON(http.StatusTooManyRequests, gin.H{"status": "error", "error": "rate limit exceeded"})
			c.Abort()
			return
		}

		c.Next()
	}
}

func (l *RateLimiter) Allow(clientID string) bool {
	l.mu.Lock()
	defer l.mu.Unlock()

	now := time.Now().UTC()
	bucket, ok := l.buckets[clientID]
	if !ok || now.After(bucket.ResetAt) {
		l.buckets[clientID] = rateBucket{Count: 1, ResetAt: now.Add(l.window)}
		return true
	}

	if bucket.Count >= l.limit {
		return false
	}

	bucket.Count++
	l.buckets[clientID] = bucket

	if len(l.buckets) > 2048 {
		for id, item := range l.buckets {
			if now.After(item.ResetAt) {
				delete(l.buckets, id)
			}
		}
	}

	return true
}

func requesterID(c *gin.Context) string {
	forwarded := strings.TrimSpace(c.GetHeader("X-Forwarded-For"))
	if forwarded != "" {
		parts := strings.Split(forwarded, ",")
		if len(parts) > 0 {
			return strings.TrimSpace(parts[0])
		}
	}

	host := c.ClientIP()
	if host == "" {
		return strings.TrimSpace(c.Request.RemoteAddr)
	}

	return strings.TrimSpace(host)
}
