package httptransport

import (
	"errors"
	"fmt"
	"io"
	"log"
	"net/http"
	"strings"

	"github.com/alfiang/pui/environment-a/api-service/internal/domain"
	"github.com/alfiang/pui/environment-a/api-service/internal/service"
	"github.com/alfiang/pui/environment-a/api-service/internal/transport/http/dto"
	"github.com/gin-gonic/gin"
)

// handleListFiles godoc
// @Summary List berkas
// @Description Menampilkan berkas pada Berkas Saya atau di dalam direktori saat directory_id diisi
// @Tags berkas
// @Security BearerAuth
// @Produce json
// @Param directory_id query string false "UUID direktori; kosongkan untuk Berkas Saya"
// @Param include_deleted query bool false "Sertakan berkas yang sudah soft delete"
// @Param sort query string false "Urutan: newest, oldest, name-asc, name-desc, type, starred"
// @Param created_from query string false "Batas waktu awal RFC3339"
// @Param created_to query string false "Batas waktu akhir RFC3339"
// @Param limit query int false "Ukuran halaman (1-200, default 40)"
// @Param offset query int false "Offset (default 0)"
// @Success 200 {object} dto.FileListResponse
// @Failure 400 {object} dto.ErrorResponse
// @Failure 401 {object} dto.ErrorResponse
// @Failure 404 {object} dto.ErrorResponse
// @Failure 500 {object} dto.ErrorResponse
// @Router /files [get]
func (a *API) handleListFiles(c *gin.Context) {
	user, ok := a.authUser(c)
	if !ok {
		return
	}

	directoryID := strings.TrimSpace(c.Query("directory_id"))
	includeDeleted := parseBoolQuery(c.Query("include_deleted"))
	limit, offset, err := parsePaginationQuery(c)
	if err != nil {
		writeError(c, http.StatusBadRequest, err)
		return
	}

	createdFrom, err := parseOptionalTime(c.Query("created_from"))
	if err != nil {
		writeError(c, http.StatusBadRequest, err)
		return
	}
	createdTo, err := parseOptionalTime(c.Query("created_to"))
	if err != nil {
		writeError(c, http.StatusBadRequest, err)
		return
	}

	files, total, stats, normalizedLimit, normalizedOffset, err := a.fileService.ListByDirectoryPage(c.Request.Context(), user, domain.FileListFilter{
		DirectoryID:    directoryID,
		IncludeDeleted: includeDeleted,
		Sort:           strings.TrimSpace(c.Query("sort")),
		CreatedFrom:    createdFrom,
		CreatedTo:      createdTo,
		Limit:          limit,
		Offset:         offset,
	})
	if err != nil {
		writeError(c, statusFromError(err), err)
		return
	}

	c.JSON(http.StatusOK, dto.FileListResponse{
		Status:       "ok",
		DirectoryID:  directoryID,
		Total:        total,
		Limit:        normalizedLimit,
		Offset:       normalizedOffset,
		TotalBytes:   stats.TotalBytes,
		TotalChunks:  stats.TotalChunks,
		ReusedChunks: stats.ReusedChunks,
		Files:        toFileDTOs(files),
	})
}

// handleSearchFiles godoc
// @Summary Cari berkas
// @Description Mencari metadata berkas milik pengguna dengan filter dan pagination opsional
// @Tags berkas
// @Security BearerAuth
// @Produce json
// @Param q query string true "Kata kunci pencarian, minimal 2 karakter"
// @Param directory_id query string false "UUID direktori"
// @Param include_deleted query bool false "Sertakan berkas yang sudah soft delete"
// @Param limit query int false "Ukuran halaman (1-200, default 20)"
// @Param offset query int false "Offset (default 0)"
// @Success 200 {object} dto.FileSearchResponse
// @Failure 400 {object} dto.ErrorResponse
// @Failure 401 {object} dto.ErrorResponse
// @Failure 404 {object} dto.ErrorResponse
// @Failure 500 {object} dto.ErrorResponse
// @Router /files/search [get]
func (a *API) handleSearchFiles(c *gin.Context) {
	user, ok := a.authUser(c)
	if !ok {
		return
	}

	query := strings.TrimSpace(c.Query("q"))
	directoryID := strings.TrimSpace(c.Query("directory_id"))
	includeDeleted := parseBoolQuery(c.Query("include_deleted"))

	limit, err := parseIntQuery(c.Query("limit"), 0)
	if err != nil {
		writeError(c, http.StatusBadRequest, fmt.Errorf("limit harus berupa angka"))
		return
	}

	offset, err := parseIntQuery(c.Query("offset"), 0)
	if err != nil {
		writeError(c, http.StatusBadRequest, fmt.Errorf("offset harus berupa angka"))
		return
	}

	files, total, normalizedLimit, normalizedOffset, err := a.fileService.Search(
		c.Request.Context(),
		user,
		query,
		directoryID,
		includeDeleted,
		limit,
		offset,
	)
	if err != nil {
		writeError(c, statusFromError(err), err)
		return
	}

	c.JSON(http.StatusOK, dto.FileSearchResponse{
		Status:         "ok",
		Query:          query,
		DirectoryID:    directoryID,
		IncludeDeleted: includeDeleted,
		Total:          total,
		Limit:          normalizedLimit,
		Offset:         normalizedOffset,
		Files:          toFileDTOs(files),
	})
}

// handleUploadFile godoc
// @Summary Unggah berkas
// @Description Mengirim stream multipart berkas ke Vault Core dan menyimpan metadata aplikasi
// @Tags berkas
// @Security BearerAuth
// @Accept multipart/form-data
// @Produce json
// @Param directory_id formData string false "UUID direktori; kosongkan untuk unggah ke Berkas Saya"
// @Param file formData file true "Payload berkas"
// @Success 201 {object} dto.UploadResponse
// @Failure 400 {object} dto.ErrorResponse
// @Failure 401 {object} dto.ErrorResponse
// @Failure 404 {object} dto.ErrorResponse
// @Failure 409 {object} dto.ErrorResponse
// @Failure 413 {object} dto.ErrorResponse
// @Failure 500 {object} dto.ErrorResponse
// @Failure 502 {object} dto.ErrorResponse
// @Router /files [post]
func (a *API) handleUploadFile(c *gin.Context) {
	user, ok := a.authUser(c)
	if !ok {
		return
	}

	c.Request.Body = http.MaxBytesReader(c.Writer, c.Request.Body, a.cfg.MaxUploadSizeBytes+(1<<20))
	reader, err := c.Request.MultipartReader()
	if err != nil {
		writeError(c, http.StatusBadRequest, fmt.Errorf("multipart payload tidak valid"))
		return
	}

	directoryID := ""

	for {
		part, err := reader.NextPart()
		if errors.Is(err, io.EOF) {
			break
		}
		if err != nil {
			writeError(c, http.StatusBadRequest, fmt.Errorf("gagal membaca multipart part: %w", err))
			return
		}

		if part.FormName() == "directory_id" {
			rawValue, readErr := io.ReadAll(io.LimitReader(part, 256))
			_ = part.Close()
			if readErr != nil {
				writeError(c, http.StatusBadRequest, fmt.Errorf("gagal membaca directory_id"))
				return
			}

			directoryID = strings.TrimSpace(string(rawValue))
			if directoryID != "" && !service.IsUUID(directoryID) {
				writeError(c, http.StatusBadRequest, fmt.Errorf("directory_id tidak valid"))
				return
			}

			continue
		}

		if part.FormName() != "file" {
			_ = part.Close()
			continue
		}

		fileName := strings.TrimSpace(part.FileName())
		mimeType := strings.TrimSpace(part.Header.Get("Content-Type"))

		uploadReader := service.NewMaxSizeReader(part, a.cfg.MaxUploadSizeBytes)
		outcome, uploadErr := a.fileService.Upload(c.Request.Context(), user, directoryID, fileName, mimeType, uploadReader)
		_ = part.Close()
		if uploadErr != nil {
			if errors.Is(uploadErr, domain.ErrUploadTooBig) {
				writeError(c, http.StatusRequestEntityTooLarge, fmt.Errorf("ukuran berkas melampaui batas maksimal"))
				return
			}

			status := statusFromError(uploadErr)
			if status == http.StatusInternalServerError {
				status = http.StatusBadGateway
			}
			writeError(c, status, uploadErr)
			return
		}

		c.JSON(http.StatusCreated, dto.UploadResponse{
			Status:             "ok",
			File:               toFileDTO(outcome.File),
			UploadCommitResult: toUploadCommitResultDTO(outcome.UploadCommitResult),
		})
		return
	}

	writeError(c, http.StatusBadRequest, fmt.Errorf("field berkas wajib diisi"))
}

// handleFileDetail godoc
// @Summary Detail berkas
// @Description Menampilkan metadata berkas berdasarkan ID, termasuk berkas yang sudah soft delete
// @Tags berkas
// @Security BearerAuth
// @Produce json
// @Param id path string true "UUID berkas"
// @Success 200 {object} dto.FileDetailResponse
// @Failure 400 {object} dto.ErrorResponse
// @Failure 401 {object} dto.ErrorResponse
// @Failure 404 {object} dto.ErrorResponse
// @Failure 500 {object} dto.ErrorResponse
// @Router /files/{id} [get]
func (a *API) handleFileDetail(c *gin.Context) {
	user, ok := a.authUser(c)
	if !ok {
		return
	}

	fileID := strings.TrimSpace(c.Param("id"))
	record, err := a.fileService.Detail(c.Request.Context(), user, fileID, true)
	if err != nil {
		writeError(c, statusFromError(err), err)
		return
	}

	c.JSON(http.StatusOK, dto.FileDetailResponse{
		Status: "ok",
		File:   toFileDTO(record),
	})
}

// handleDownloadFile godoc
// @Summary Unduh berkas
// @Description Merekonstruksi stream berkas dari chunk storage berdasarkan ID berkas
// @Tags berkas
// @Security BearerAuth
// @Produce application/octet-stream
// @Param id path string true "UUID berkas"
// @Success 200 {string} binary "Berkas stream"
// @Failure 400 {object} dto.ErrorResponse
// @Failure 401 {object} dto.ErrorResponse
// @Failure 404 {object} dto.ErrorResponse
// @Failure 500 {object} dto.ErrorResponse
// @Failure 502 {object} dto.ErrorResponse
// @Router /files/{id}/download [get]
func (a *API) handleDownloadFile(c *gin.Context) {
	user, ok := a.authUser(c)
	if !ok {
		return
	}

	fileID := strings.TrimSpace(c.Param("id"))
	// includeDeleted=true: download from Trash is intentionally allowed (audited as DOWNLOAD_TRASHED).
	result, err := a.fileService.Download(c.Request.Context(), user, fileID, true)
	if err != nil {
		status := statusFromError(err)
		if status == http.StatusInternalServerError {
			status = http.StatusBadGateway
			log.Printf("event=file_download_failed file_id=%s user_id=%s error=%v", fileID, user.UserID, err)
			writeError(c, status, fmt.Errorf("berkas tidak dapat direkonstruksi dari vault"))
			return
		}
		writeError(c, status, err)
		return
	}
	defer result.Body.Close()

	c.Header("Content-Type", result.File.MIMEType)
	c.Header("Content-Disposition", fmt.Sprintf(`attachment; filename="%s"`, service.SanitizeFilename(result.File.Name)))
	c.Header("Content-Length", fmt.Sprintf("%d", result.File.SizeBytes))
	if result.File.DeletedAt != nil {
		c.Header("X-PUI-Soft-Deleted", "true")
	}

	// Note: response headers (200 + Content-Length) are already sent before Copy starts.
	// If the stream is interrupted mid-way, the client receives a truncated file.
	// We log the error for observability; it cannot be surfaced as an HTTP error at this point.
	if _, err := io.Copy(c.Writer, result.Body); err != nil {
		log.Printf("event=file_stream_truncated file_id=%s user_id=%s error=%v", fileID, user.UserID, err)
	}
}

// handleSoftDeleteFile godoc
// @Summary Soft delete berkas
// @Description Menandai berkas terhapus tanpa menghapus payload fisik di Vault Core
// @Tags berkas
// @Security BearerAuth
// @Produce json
// @Param id path string true "UUID berkas"
// @Success 200 {object} dto.SoftDeleteResponse
// @Failure 400 {object} dto.ErrorResponse
// @Failure 401 {object} dto.ErrorResponse
// @Failure 404 {object} dto.ErrorResponse
// @Failure 500 {object} dto.ErrorResponse
// @Router /files/{id} [delete]
func (a *API) handleSoftDeleteFile(c *gin.Context) {
	user, ok := a.authUser(c)
	if !ok {
		return
	}

	fileID := strings.TrimSpace(c.Param("id"))
	deletedAt, err := a.fileService.SoftDelete(c.Request.Context(), user, fileID)
	if err != nil {
		writeError(c, statusFromError(err), err)
		return
	}

	c.JSON(http.StatusOK, dto.SoftDeleteResponse{
		Status:    "ok",
		FileID:    fileID,
		DeletedAt: deletedAt,
	})
}

// handleRestoreFile godoc
// @Summary Pulihkan berkas dari Sampah
// @Description Memulihkan berkas yang sebelumnya dihapus secara logis
// @Tags berkas
// @Security BearerAuth
// @Produce json
// @Param id path string true "UUID berkas"
// @Success 200 {object} dto.FileMutationResponse
// @Failure 400 {object} dto.ErrorResponse
// @Failure 401 {object} dto.ErrorResponse
// @Failure 404 {object} dto.ErrorResponse
// @Failure 500 {object} dto.ErrorResponse
// @Router /files/{id}/restore [post]
func (a *API) handleRestoreFile(c *gin.Context) {
	user, ok := a.authUser(c)
	if !ok {
		return
	}

	fileID := strings.TrimSpace(c.Param("id"))
	record, err := a.fileService.Restore(c.Request.Context(), user, fileID)
	if err != nil {
		writeError(c, statusFromError(err), err)
		return
	}

	c.JSON(http.StatusOK, dto.FileMutationResponse{Status: "ok", File: toFileDTO(record)})
}

// handlePermanentDeleteFile godoc
// @Summary Hapus permanen metadata berkas
// @Description Menghapus permanen metadata berkas dari Sampah tanpa menghapus chunk fisik atau manifest Vault Core
// @Tags berkas
// @Security BearerAuth
// @Produce json
// @Param id path string true "UUID berkas"
// @Success 200 {object} dto.OKResponse
// @Failure 400 {object} dto.ErrorResponse
// @Failure 401 {object} dto.ErrorResponse
// @Failure 404 {object} dto.ErrorResponse
// @Failure 500 {object} dto.ErrorResponse
// @Router /files/{id}/permanent [delete]
func (a *API) handlePermanentDeleteFile(c *gin.Context) {
	user, ok := a.authUser(c)
	if !ok {
		return
	}

	fileID := strings.TrimSpace(c.Param("id"))
	if err := a.fileService.PermanentDelete(c.Request.Context(), user, fileID); err != nil {
		writeError(c, statusFromError(err), err)
		return
	}

	c.JSON(http.StatusOK, dto.OKResponse{Status: "ok"})
}

// handleStarFile godoc
// @Summary Tandai bintang berkas
// @Description Menandai berkas sebagai berbintang
// @Tags berkas
// @Security BearerAuth
// @Produce json
// @Param id path string true "UUID berkas"
// @Success 200 {object} dto.FileMutationResponse
// @Failure 400 {object} dto.ErrorResponse
// @Failure 401 {object} dto.ErrorResponse
// @Failure 404 {object} dto.ErrorResponse
// @Failure 500 {object} dto.ErrorResponse
// @Router /files/{id}/star [put]
func (a *API) handleStarFile(c *gin.Context) {
	a.handleSetStarredFile(c, true)
}

// handleUnstarFile godoc
// @Summary Hapus bintang berkas
// @Description Menghapus penanda bintang dari berkas
// @Tags berkas
// @Security BearerAuth
// @Produce json
// @Param id path string true "UUID berkas"
// @Success 200 {object} dto.FileMutationResponse
// @Failure 400 {object} dto.ErrorResponse
// @Failure 401 {object} dto.ErrorResponse
// @Failure 404 {object} dto.ErrorResponse
// @Failure 500 {object} dto.ErrorResponse
// @Router /files/{id}/star [delete]
func (a *API) handleUnstarFile(c *gin.Context) {
	a.handleSetStarredFile(c, false)
}

func (a *API) handleSetStarredFile(c *gin.Context, starred bool) {
	user, ok := a.authUser(c)
	if !ok {
		return
	}

	fileID := strings.TrimSpace(c.Param("id"))
	record, err := a.fileService.SetStarred(c.Request.Context(), user, fileID, starred)
	if err != nil {
		writeError(c, statusFromError(err), err)
		return
	}

	c.JSON(http.StatusOK, dto.FileMutationResponse{Status: "ok", File: toFileDTO(record)})
}

// handleFileManifest godoc
// @Summary Info manifest berkas
// @Description Menampilkan detail manifest immutable dari Vault Core untuk sebuah berkas
// @Tags berkas
// @Security BearerAuth
// @Produce json
// @Param id path string true "UUID berkas"
// @Success 200 {object} dto.FileManifestResponse
// @Failure 400 {object} dto.ErrorResponse
// @Failure 401 {object} dto.ErrorResponse
// @Failure 404 {object} dto.ErrorResponse
// @Failure 502 {object} dto.ErrorResponse
// @Router /files/{id}/manifest [get]
func (a *API) handleFileManifest(c *gin.Context) {
	user, ok := a.authUser(c)
	if !ok {
		return
	}

	fileID := strings.TrimSpace(c.Param("id"))
	record, err := a.fileService.Detail(c.Request.Context(), user, fileID, true)
	if err != nil {
		writeError(c, statusFromError(err), err)
		return
	}

	manifest, err := a.fileService.GetManifestInfo(c.Request.Context(), record.ManifestID)
	if err != nil {
		writeError(c, http.StatusBadGateway, err)
		return
	}

	c.JSON(http.StatusOK, dto.FileManifestResponse{
		Status: "ok",
		File:   toFileDTO(record),
		Manifest: dto.ManifestInfoDTO{
			ManifestID:     manifest.ManifestID,
			FileHash:       manifest.FileHash,
			TotalSizeBytes: manifest.TotalSizeBytes,
			ChunkCount:     manifest.ChunkCount,
			Immutable:      manifest.Immutable,
			CreatedAt:      manifest.CreatedAt,
		},
	})
}
