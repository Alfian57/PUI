package fastcdc

import (
	"context"
	"errors"
	"fmt"
	"io"
	"math/bits"
)

type Config struct {
	MinSize int
	AvgSize int
	MaxSize int
}

type Chunk struct {
	Index int
	Bytes []byte
	Size  int
}

func (c Config) Validate() error {
	if c.MinSize <= 0 || c.AvgSize <= 0 || c.MaxSize <= 0 {
		return fmt.Errorf("chunk sizes must be positive")
	}

	if c.MinSize > c.AvgSize || c.AvgSize > c.MaxSize {
		return fmt.Errorf("chunk sizes must satisfy min <= avg <= max")
	}

	return nil
}

func Split(ctx context.Context, r io.Reader, cfg Config, out chan<- Chunk) error {
	if err := cfg.Validate(); err != nil {
		return err
	}

	smallMask, largeMask := cutMasks(cfg.AvgSize)
	readBuf := make([]byte, 32*1024)
	chunkBuf := make([]byte, 0, cfg.MaxSize)

	var fingerprint uint64
	chunkIndex := 0

	emit := func() error {
		if len(chunkBuf) == 0 {
			return nil
		}

		emitted := make([]byte, len(chunkBuf))
		copy(emitted, chunkBuf)

		chunk := Chunk{
			Index: chunkIndex,
			Bytes: emitted,
			Size:  len(emitted),
		}

		select {
		case <-ctx.Done():
			return ctx.Err()
		case out <- chunk:
		}

		chunkIndex++
		fingerprint = 0
		chunkBuf = chunkBuf[:0]

		return nil
	}

	for {
		n, err := r.Read(readBuf)
		if n > 0 {
			for _, b := range readBuf[:n] {
				chunkBuf = append(chunkBuf, b)
				fingerprint = (fingerprint << 1) + gearTable[b]

				if shouldCut(len(chunkBuf), fingerprint, cfg, smallMask, largeMask) {
					if err := emit(); err != nil {
						return err
					}
				}
			}
		}

		if err != nil {
			if errors.Is(err, io.EOF) {
				break
			}

			return fmt.Errorf("read upload stream: %w", err)
		}

		select {
		case <-ctx.Done():
			return ctx.Err()
		default:
		}
	}

	if err := emit(); err != nil {
		return err
	}

	return nil
}

func shouldCut(size int, fingerprint uint64, cfg Config, smallMask uint64, largeMask uint64) bool {
	if size < cfg.MinSize {
		return false
	}

	if size >= cfg.MaxSize {
		return true
	}

	if size < cfg.AvgSize {
		return (fingerprint & largeMask) == 0
	}

	return (fingerprint & smallMask) == 0
}

func cutMasks(avgSize int) (smallMask uint64, largeMask uint64) {
	bitsAvg := bits.Len(uint(avgSize)) - 1
	if bitsAvg < 4 {
		bitsAvg = 4
	}

	largeBits := bitsAvg + 1

	smallMask = (uint64(1) << bitsAvg) - 1
	largeMask = (uint64(1) << largeBits) - 1

	return smallMask, largeMask
}

var gearTable = func() [256]uint64 {
	var table [256]uint64
	seed := uint64(0x9e3779b97f4a7c15)

	for i := range table {
		seed ^= seed >> 12
		seed ^= seed << 25
		seed ^= seed >> 27
		table[i] = seed * 0x2545F4914F6CDD1D
	}

	return table
}()
