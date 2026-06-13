package service

import (
	"errors"
	"testing"

	"github.com/alfiang/pui/environment-a/api-service/internal/domain"
)

func TestNormalizeReportRange(t *testing.T) {
	t.Parallel()

	cases := []struct {
		input   string
		wantKey string
		wantN   int
	}{
		{"", "30d", 30},
		{"30d", "30d", 30},
		{"7d", "7d", 7},
		{"90d", "90d", 90},
		{"30D", "30d", 30},
		{"  7d  ", "7d", 7},
	}
	for _, tc := range cases {
		key, n, err := normalizeReportRange(tc.input)
		if err != nil {
			t.Errorf("normalizeReportRange(%q) unexpected error: %v", tc.input, err)
		}
		if key != tc.wantKey || n != tc.wantN {
			t.Errorf("normalizeReportRange(%q) = (%q,%d), want (%q,%d)", tc.input, key, n, tc.wantKey, tc.wantN)
		}
	}

	if _, _, err := normalizeReportRange("999d"); !errors.Is(err, domain.ErrInvalidInput) {
		t.Errorf("expected ErrInvalidInput for invalid range, got %v", err)
	}
}

func TestNormalizeReportFormat(t *testing.T) {
	t.Parallel()

	if normalizeReportFormat("") != "pdf" {
		t.Fatal("empty input should default to pdf")
	}
	if normalizeReportFormat("CSV") != "csv" {
		t.Fatal("should lowercase")
	}
	if normalizeReportFormat("  pdf  ") != "pdf" {
		t.Fatal("should trim spaces")
	}
}

func TestIntString(t *testing.T) {
	t.Parallel()

	if intString(0) != "0" {
		t.Fatal("intString(0)")
	}
	if intString(1024) != "1024" {
		t.Fatal("intString(1024)")
	}
}

func TestPercentString(t *testing.T) {
	t.Parallel()

	if percentString(0) != "0.00%" {
		t.Fatalf("got %q", percentString(0))
	}
	if percentString(1) != "100.00%" {
		t.Fatalf("got %q", percentString(1))
	}
	if percentString(0.5) != "50.00%" {
		t.Fatalf("got %q", percentString(0.5))
	}
}

func TestByteString(t *testing.T) {
	t.Parallel()

	cases := []struct {
		input int64
		want  string
	}{
		{0, "0 B"},
		{512, "512 B"},
		{1024, "1.0 KB"},
		{1024 * 1024, "1.0 MB"},
		{1024 * 1024 * 1024, "1.0 GB"},
	}
	for _, tc := range cases {
		got := byteString(tc.input)
		if got != tc.want {
			t.Errorf("byteString(%d) = %q, want %q", tc.input, got, tc.want)
		}
	}
}

func TestTruncateReportText(t *testing.T) {
	t.Parallel()

	if truncateReportText("hello", 10) != "hello" {
		t.Fatal("should not truncate short string")
	}
	got := truncateReportText("hello world", 5)
	if got != "he..." {
		t.Fatalf("truncate: got %q", got)
	}
	if truncateReportText("abc", 2) != "ab" {
		t.Fatal("truncate at max<=3")
	}
}

func TestReportItemKind(t *testing.T) {
	t.Parallel()

	if reportItemKind("file") != "Berkas" {
		t.Fatal("file kind")
	}
	if reportItemKind("folder") != "Direktori" {
		t.Fatal("folder kind")
	}
	if reportItemKind("other") != "other" {
		t.Fatal("unknown kind should be returned as-is")
	}
}
