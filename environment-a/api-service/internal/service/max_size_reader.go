package service

import (
	"errors"
	"io"
	"mime/multipart"

	"github.com/alfiang/pui/environment-a/api-service/internal/domain"
)

type MaxSizeReader struct {
	part      *multipart.Part
	maxBytes  int64
	bytesRead int64
}

func NewMaxSizeReader(part *multipart.Part, maxBytes int64) *MaxSizeReader {
	return &MaxSizeReader{part: part, maxBytes: maxBytes}
}

func (m *MaxSizeReader) Read(p []byte) (int, error) {
	remaining := m.maxBytes - m.bytesRead
	if remaining < 0 {
		return 0, domain.ErrUploadTooBig
	}

	if remaining == 0 {
		probe := make([]byte, 1)
		n, err := m.part.Read(probe)
		if n > 0 {
			return 0, domain.ErrUploadTooBig
		}
		if errors.Is(err, io.EOF) {
			return 0, io.EOF
		}
		if err != nil {
			return 0, err
		}

		return 0, io.EOF
	}

	if int64(len(p)) > remaining {
		p = p[:remaining]
	}

	n, err := m.part.Read(p)
	m.bytesRead += int64(n)
	return n, err
}
