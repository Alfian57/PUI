package middleware

import (
	"net/http"
	"strings"
	"sync"
	"time"

	"github.com/gin-gonic/gin"
)

// tokenBucket holds available tokens and the last refill time.
type tokenBucket struct {
	tokens   float64
	lastSeen time.Time
}

// RateLimiter implements a per-client token-bucket rate limiter.
// Capacity = burst (initial tokens). Refill rate = limit tokens per window.
type RateLimiter struct {
	mu      sync.Mutex
	limit   float64
	burst   float64
	window  time.Duration
	buckets map[string]*tokenBucket
	stopCh  chan struct{}
}

// NewRateLimiter creates a RateLimiter and starts a background janitor that
// evicts buckets not seen for 2× the window period.
// burst controls the initial token count (and max burst size).
func NewRateLimiter(limit int, window time.Duration, burst int) *RateLimiter {
	if burst <= 0 || burst > limit {
		burst = limit
	}
	rl := &RateLimiter{
		limit:   float64(limit),
		burst:   float64(burst),
		window:  window,
		buckets: make(map[string]*tokenBucket),
		stopCh:  make(chan struct{}),
	}
	go rl.janitor(window * 2)
	return rl
}

func (l *RateLimiter) janitor(interval time.Duration) {
	t := time.NewTicker(interval)
	defer t.Stop()
	for {
		select {
		case <-t.C:
			l.evictStale()
		case <-l.stopCh:
			return
		}
	}
}

func (l *RateLimiter) evictStale() {
	l.mu.Lock()
	defer l.mu.Unlock()
	cutoff := time.Now().Add(-l.window * 2)
	for id, b := range l.buckets {
		if b.lastSeen.Before(cutoff) {
			delete(l.buckets, id)
		}
	}
}

// Allow consumes one token for clientID. Returns true if the request is allowed.
func (l *RateLimiter) Allow(clientID string) bool {
	l.mu.Lock()
	defer l.mu.Unlock()

	now := time.Now()
	b, ok := l.buckets[clientID]
	if !ok {
		l.buckets[clientID] = &tokenBucket{tokens: l.burst - 1, lastSeen: now}
		return true
	}

	// Refill tokens proportional to elapsed time; cap at burst.
	elapsed := now.Sub(b.lastSeen).Seconds()
	refill := elapsed * (l.limit / l.window.Seconds())
	b.tokens += refill
	if b.tokens > l.burst {
		b.tokens = l.burst
	}
	b.lastSeen = now

	if b.tokens < 1 {
		return false
	}
	b.tokens--
	return true
}

// Stop shuts down the background janitor.
func (l *RateLimiter) Stop() {
	close(l.stopCh)
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

		if !l.Allow(clientIP(c)) {
			c.JSON(http.StatusTooManyRequests, gin.H{"status": "error", "error": "rate limit exceeded"})
			c.Abort()
			return
		}
		c.Next()
	}
}

// clientIP returns the trusted client IP via gin's SetTrustedProxies-aware ClientIP.
// It deliberately does NOT read X-Forwarded-For directly to prevent bypass.
func clientIP(c *gin.Context) string {
	ip := strings.TrimSpace(c.ClientIP())
	if ip != "" {
		return ip
	}
	return strings.TrimSpace(c.Request.RemoteAddr)
}
