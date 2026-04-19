package storage

import (
	"fmt"
	"os"
	"path/filepath"
)

func EnsureLayout(udsPath, chunkRoot string) error {
	if err := os.MkdirAll(filepath.Dir(udsPath), 0o770); err != nil {
		return fmt.Errorf("create uds dir: %w", err)
	}

	if err := os.MkdirAll(chunkRoot, 0o750); err != nil {
		return fmt.Errorf("create chunk root: %w", err)
	}

	return nil
}
