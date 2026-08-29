package config

import "os"

const applicationName = "HashBox PUI"

type defaultValues struct {
	AppName               string
	AppEnv                string
	UDSPath               string
	SecurityEventsUDSPath string
	BadgerPath            string
	ChunkRoot             string
	UDSOwnerUID           int
	UDSOwnerGID           int
	UDSAllowedUIDs        []uint32
	FastCDCMinChunkSize   int
	FastCDCAvgChunkSize   int
	FastCDCMaxChunkSize   int
	StrictDownloadVerify  bool
	StrictVerifyMaxBytes  int64
}

func defaults() defaultValues {
	return defaultValues{
		AppName:               applicationName,
		AppEnv:                "environment-b",
		UDSPath:               "../../data/uds/vault-core.sock",
		SecurityEventsUDSPath: "../../data/uds/security-events.sock",
		BadgerPath:            "../../data/vault/badger",
		ChunkRoot:             "../../data/vault/chunks",
		UDSOwnerUID:           os.Getuid(),
		UDSOwnerGID:           os.Getgid(),
		UDSAllowedUIDs:        []uint32{uint32(os.Getuid())},
		FastCDCMinChunkSize:   65536,
		FastCDCAvgChunkSize:   262144,
		FastCDCMaxChunkSize:   1048576,
		StrictDownloadVerify:  true,
		StrictVerifyMaxBytes:  64 * 1024 * 1024,
	}
}
