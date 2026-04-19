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

// handleUploadFile godoc
// @Summary Upload file
// @Description Stream multipart file upload to vault-core and persist metadata
// @Tags files
// @Security BearerAuth
// @Accept multipart/form-data
// @Produce json
// @Param directory_id formData string true "Directory UUID"
// @Param file formData file true "File payload"
// @Success 201 {object} dto.UploadResponse
// @Failure 400 {object} dto.ErrorResponse
// @Failure 401 {object} dto.ErrorResponse
// @Failure 404 {object} dto.ErrorResponse
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
	validatedDirectory := false

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
			if !service.IsUUID(directoryID) {
				writeError(c, http.StatusBadRequest, fmt.Errorf("directory_id tidak valid"))
				return
			}

			validatedDirectory = true
			continue
		}

		if part.FormName() != "file" {
			_ = part.Close()
			continue
		}

		if !validatedDirectory {
			_ = part.Close()
			writeError(c, http.StatusBadRequest, fmt.Errorf("directory_id harus dikirim sebelum file"))
			return
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
		status := statusFromError(err)
		if status == http.StatusInternalServerError && err.Error() == "file id tidak valid" {
			status = http.StatusBadRequest
		}
		writeError(c, status, err)
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
		status := statusFromError(err)
		if status == http.StatusInternalServerError {
			switch err.Error() {
			case "file id tidak valid":
				status = http.StatusBadRequest
			default:
				status = http.StatusBadGateway
			}
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
		status := statusFromError(err)
		if status == http.StatusInternalServerError && err.Error() == "file id tidak valid" {
			status = http.StatusBadRequest
		}
		writeError(c, status, err)
		return
	}

	c.JSON(http.StatusOK, dto.SoftDeleteResponse{
		Status:    "ok",
		FileID:    fileID,
		DeletedAt: deletedAt,
	})
}
