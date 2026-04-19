package badgerdb

import (
	"fmt"
	"os"

	"github.com/dgraph-io/badger/v4"
)

func Open(path string) (*badger.DB, error) {
	if err := os.MkdirAll(path, 0o750); err != nil {
		return nil, fmt.Errorf("create badger dir: %w", err)
	}

	opts := badger.DefaultOptions(path)
	opts.Logger = nil

	db, err := badger.Open(opts)
	if err != nil {
		return nil, fmt.Errorf("open badger: %w", err)
	}

	return db, nil
}
