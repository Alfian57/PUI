package httptransport

import (
	"errors"
	"fmt"
	"io"
	"net/http"
	"strings"

	"github.com/alfiang/pui/environment-a/api-service/internal/domain"
	"github.com/alfiang/pui/environment-a/api-service/internal/service"
	"github.com/alfiang/pui/environment-a/api-service/internal/transport/http/dto"
	"github.com/gin-gonic/gin"
)

// handleListFiles godoc
// @Summary List files
// @Description List root files or files inside a directory when directory_id is provided
// @Tags files
// @Security BearerAuth
// @Produce json
// @Param directory_id query string false "Directory UUID; omit for root files"
// @Param include_deleted query bool false "Include soft-deleted files"
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
	files, err := a.fileService.ListByDirectory(c.Request.Context(), user, directoryID, includeDeleted)
	if err != nil {
		writeError(c, statusFromError(err), err)
		return
	}

	c.JSON(http.StatusOK, dto.FileListResponse{
		Status:      "ok",
		DirectoryID: directoryID,
		Files:       toFileDTOs(files),
	})
}

// handleSearchFiles godoc
// @Summary Search files
// @Description Search file metadata by query in user namespace with optional filters and pagination
// @Tags files
// @Security BearerAuth
// @Produce json
// @Param q query string true "Search keyword (min 2 chars)"
// @Param directory_id query string false "Directory UUID"
// @Param include_deleted query bool false "Include soft-deleted files"
// @Param limit query int false "Page size (1-200, default 20)"
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
// @Summary Upload file
// @Description Stream multipart file upload to vault-core and persist metadata
// @Tags files
// @Security BearerAuth
// @Accept multipart/form-data
// @Produce json
// @Param directory_id formData string false "Directory UUID; omit for root upload"
// @Param file formData file true "File payload"
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
				writeError(c, http.StatusRequestEntityTooLarge, fmt.Errorf("ukuran file melampaui batas maksimal"))
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

	writeError(c, http.StatusBadRequest, fmt.Errorf("field file wajib diisi"))
}

// handleFileDetail godoc
// @Summary File detail
// @Description Get file metadata by ID (including soft-deleted files)
// @Tags files
// @Security BearerAuth
// @Produce json
// @Param id path string true "File UUID"
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
// @Summary Download file
// @Description Stream file payload from vault-core by file ID
// @Tags files
// @Security BearerAuth
// @Produce application/octet-stream
// @Param id path string true "File UUID"
// @Success 200 {string} binary "File stream"
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
	result, err := a.fileService.Download(c.Request.Context(), user, fileID, true)
	if err != nil {
		writeError(c, statusFromError(err), err)
		return
	}
	defer result.Body.Close()

	c.Header("Content-Type", result.File.MIMEType)
	c.Header("Content-Disposition", fmt.Sprintf(`attachment; filename="%s"`, service.SanitizeFilename(result.File.Name)))
	c.Header("Content-Length", fmt.Sprintf("%d", result.File.SizeBytes))
	if result.File.DeletedAt != nil {
		c.Header("X-PUI-Soft-Deleted", "true")
	}

	if _, err := io.Copy(c.Writer, result.Body); err != nil {
		return
	}
}

// handleSoftDeleteFile godoc
// @Summary Soft delete file
// @Description Mark file as deleted without removing physical payload
// @Tags files
// @Security BearerAuth
// @Produce json
// @Param id path string true "File UUID"
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
// @Summary Restore file from trash
// @Description Restore a previously deleted file
// @Tags files
// @Security BearerAuth
// @Produce json
// @Param id path string true "File UUID"
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
// @Summary Permanently delete file
// @Description Permanently remove deleted file metadata from trash
// @Tags files
// @Security BearerAuth
// @Produce json
// @Param id path string true "File UUID"
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
// @Summary Star file
// @Description Mark a file as starred
// @Tags files
// @Security BearerAuth
// @Produce json
// @Param id path string true "File UUID"
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
// @Summary Unstar file
// @Description Remove starred marker from a file
// @Tags files
// @Security BearerAuth
// @Produce json
// @Param id path string true "File UUID"
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
// @Summary File manifest info
// @Description Get immutable manifest details from vault-core for a file
// @Tags files
// @Security BearerAuth
// @Produce json
// @Param id path string true "File UUID"
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
