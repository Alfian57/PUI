package service

import (
	"testing"
)

func TestIsUUID(t *testing.T) {
	t.Parallel()

	valid := []string{
		"11111111-1111-1111-8111-111111111111",
		"550e8400-e29b-41d4-a716-446655440000",
		"00000000-0000-1000-8000-000000000000",
	}
	for _, v := range valid {
		if !IsUUID(v) {
			t.Errorf("expected %q to be valid UUID", v)
		}
	}

	invalid := []string{
		"",
		"not-a-uuid",
		"11111111-1111-1111-1111-111111111111", // variant bits not 8-b
		"550e8400e29b41d4a716446655440000",      // no dashes
		"   ",
	}
	for _, v := range invalid {
		if IsUUID(v) {
			t.Errorf("expected %q to be invalid UUID", v)
		}
	}
}

func TestHashTokenDeterministic(t *testing.T) {
	t.Parallel()

	token := "some-raw-token-value"
	if HashToken(token) != HashToken(token) {
		t.Fatal("HashToken must be deterministic")
	}
}

func TestHashTokenDifferentInputs(t *testing.T) {
	t.Parallel()

	if HashToken("a") == HashToken("b") {
		t.Fatal("different inputs must produce different hashes")
	}
}

func TestSanitizeFilename(t *testing.T) {
	t.Parallel()

	cases := []struct {
		input string
		want  string
	}{
		{"report.pdf", "report.pdf"},
		{"  spaced.txt  ", "spaced.txt"},
		{"file\nname.txt", "file_name.txt"},
		{"file\r\nname.txt", "file__name.txt"},
		{`file"name.txt`, "filename.txt"},
		{`file\name.txt`, "file_name.txt"},
		{"", "download.bin"},
		{"   ", "download.bin"},
	}

	for _, tc := range cases {
		got := SanitizeFilename(tc.input)
		if got != tc.want {
			t.Errorf("SanitizeFilename(%q) = %q, want %q", tc.input, got, tc.want)
		}
	}
}
