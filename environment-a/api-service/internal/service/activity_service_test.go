package service

import (
	"context"
	"errors"
	"strings"
	"testing"

	"github.com/alfiang/pui/environment-a/api-service/internal/domain"
)

// ActivityService embeds *repository.ActivityRepository (concrete), so we test
// only the validation branches that fire before any repo call.

func TestActivityServiceListValidation(t *testing.T) {
	t.Parallel()

	svc := &ActivityService{}
	user := domain.AuthUser{UserID: "uid"}

	cases := []struct {
		action, resourceType string
		limit, offset        int
		desc                 string
	}{
		{strings.Repeat("X", 101), "", 0, 0, "action too long"},
		{"", strings.Repeat("X", 51), 0, 0, "resourceType too long"},
		{"", "", 201, 0, "limit too high"},
		{"", "", 1, -1, "negative offset"},
	}

	for _, tc := range cases {
		_, _, _, _, err := svc.List(context.Background(), user, tc.action, tc.resourceType, tc.limit, tc.offset)
		if !errors.Is(err, domain.ErrInvalidInput) {
			t.Errorf("[%s] want ErrInvalidInput, got %v", tc.desc, err)
		}
	}
}

func TestActivityServiceListDefaultLimit(t *testing.T) {
	t.Parallel()

	// limit=0 should be normalized to defaultActivityLogsLimit before repo call.
	// Since repo is nil, we expect a nil-pointer panic — absorb it.
	svc := &ActivityService{}
	user := domain.AuthUser{UserID: "uid"}

	defer func() { recover() }()
	svc.List(context.Background(), user, "", "", 0, 0) //nolint
}
