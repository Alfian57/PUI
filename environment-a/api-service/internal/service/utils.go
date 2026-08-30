package service

import (
	"crypto/rand"
	"crypto/sha256"
	"encoding/hex"
	"regexp"
	"strings"
)

// PostgreSQL accepts any 128-bit UUID value, including identifiers whose
// version or variant bits do not follow RFC 4122.
var uuidPattern = regexp.MustCompile(`^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$`)

func IsUUID(value string) bool {
	return uuidPattern.MatchString(strings.TrimSpace(value))
}

func NewSessionToken() (string, string, error) {
	bytesValue := make([]byte, 32)
	if _, err := rand.Read(bytesValue); err != nil {
		return "", "", err
	}

	token := hex.EncodeToString(bytesValue)
	return token, HashToken(token), nil
}

func HashToken(token string) string {
	sum := sha256.Sum256([]byte(token))
	return hex.EncodeToString(sum[:])
}

func SanitizeFilename(name string) string {
	name = strings.TrimSpace(name)
	if name == "" {
		return "download.bin"
	}

	replacer := strings.NewReplacer("\n", "_", "\r", "_", "\"", "", "\\", "_")
	return replacer.Replace(name)
}
