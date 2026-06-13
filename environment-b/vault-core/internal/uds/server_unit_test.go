package uds

import (
	"errors"
	"net"
	"net/http"
	"testing"

	"github.com/alfiang/pui/environment-b/vault-core/internal/cas"
)

func TestStatusCodeFromError(t *testing.T) {
	t.Parallel()

	cases := []struct {
		err    error
		status int
	}{
		{cas.ErrInvalidHash, http.StatusBadRequest},
		{cas.ErrInvalidUpload, http.StatusBadRequest},
		{cas.ErrNotFound, http.StatusNotFound},
		{net.ErrClosed, http.StatusServiceUnavailable},
		{errors.New("unknown"), http.StatusInternalServerError},
	}

	for _, tc := range cases {
		got := statusCodeFromError(tc.err)
		if got != tc.status {
			t.Errorf("statusCodeFromError(%v) = %d, want %d", tc.err, got, tc.status)
		}
	}
}

func TestMakeAllowedPeerSet(t *testing.T) {
	t.Parallel()

	// nil / empty input → nil map (bypass auth)
	if makeAllowedPeerSet(nil) != nil {
		t.Fatal("expected nil for empty input")
	}
	if makeAllowedPeerSet([]uint32{}) != nil {
		t.Fatal("expected nil for empty slice")
	}

	// non-empty → set with correct entries
	set := makeAllowedPeerSet([]uint32{1000, 2000})
	if len(set) != 2 {
		t.Fatalf("expected 2 entries, got %d", len(set))
	}
	if _, ok := set[1000]; !ok {
		t.Fatal("expected 1000 in set")
	}
	if _, ok := set[2000]; !ok {
		t.Fatal("expected 2000 in set")
	}
	if _, ok := set[9999]; ok {
		t.Fatal("expected 9999 NOT in set")
	}
}
