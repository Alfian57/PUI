package httptransport

import (
	"net/http"
	"strings"

	"github.com/alfiang/pui/environment-a/api-service/internal/domain"
	"github.com/alfiang/pui/environment-a/api-service/internal/transport/http/dto"
	"github.com/gin-gonic/gin"
)

// handleCreateDirectory godoc
// @Summary Create directory
// @Description Create root or nested directory in user namespace
// @Tags directories
// @Security BearerAuth
// @Accept json
// @Produce json
// @Param payload body dto.CreateDirectoryRequest true "Create directory payload"
// @Success 201 {object} dto.DirectoryResponse
// @Failure 400 {object} dto.ErrorResponse
// @Failure 401 {object} dto.ErrorResponse
// @Failure 404 {object} dto.ErrorResponse
// @Failure 409 {object} dto.ErrorResponse
// @Failure 500 {object} dto.ErrorResponse
// @Router /directories [post]
func (a *API) handleCreateDirectory(c *gin.Context) {
	user, ok := a.authUser(c)
	if !ok {
		return
	}

	var req dto.CreateDirectoryRequest
	if !a.bindAndValidateJSON(c, &req) {
		return
	}

	directory, err := a.directoryService.Create(c.Request.Context(), user, req.Name, req.ParentID)
	if err != nil {
		status := statusFromError(err)
		if status == http.StatusInternalServerError {
			switch err.Error() {
			case "nama direktori wajib diisi", "nama direktori terlalu panjang", "parent_id tidak valid":
				status = http.StatusBadRequest
			}
		}
		writeError(c, status, err)
		return
	}

	c.JSON(http.StatusCreated, dto.DirectoryResponse{
		Status:    "ok",
		Directory: toDirectoryDTO(directory),
	})
}

// handleDirectoryTree godoc
// @Summary Directory tree
// @Description List root directories or subtree with root_id query
// @Tags directories
// @Security BearerAuth
// @Produce json
// @Param root_id query string false "Root directory UUID"
// @Success 200 {object} dto.DirectoryTreeResponse
// @Failure 400 {object} dto.ErrorResponse
// @Failure 401 {object} dto.ErrorResponse
// @Failure 500 {object} dto.ErrorResponse
// @Router /directories/tree [get]
func (a *API) handleDirectoryTree(c *gin.Context) {
	user, ok := a.authUser(c)
	if !ok {
		return
	}

	rootID := strings.TrimSpace(c.Query("root_id"))
	directories, err := a.directoryService.Tree(c.Request.Context(), user, rootID)
	if err != nil {
		status := statusFromError(err)
		if status == http.StatusInternalServerError && err.Error() == "root_id tidak valid" {
			status = http.StatusBadRequest
		}
		writeError(c, status, err)
		return
	}

	c.JSON(http.StatusOK, dto.DirectoryTreeResponse{
		Status:      "ok",
		RootID:      rootID,
		Directories: toDirectoryDTOs(directories),
	})
}

// handleDirectoryFiles godoc
// @Summary Directory files
// @Description List files by directory with optional include_deleted=true
// @Tags directories
// @Security BearerAuth
// @Produce json
// @Param id path string true "Directory UUID"
// @Param include_deleted query bool false "Include soft-deleted files"
// @Success 200 {object} dto.FileListResponse
// @Failure 400 {object} dto.ErrorResponse
// @Failure 401 {object} dto.ErrorResponse
// @Failure 500 {object} dto.ErrorResponse
// @Router /directories/{id}/files [get]
func (a *API) handleDirectoryFiles(c *gin.Context) {
	user, ok := a.authUser(c)
	if !ok {
		return
	}

	directoryID := strings.TrimSpace(c.Param("id"))
	includeDeleted := parseBoolQuery(c.Query("include_deleted"))
	files, err := a.fileService.ListByDirectory(c.Request.Context(), user, directoryID, includeDeleted)
	if err != nil {
		status := statusFromError(err)
		if status == http.StatusInternalServerError && err.Error() == "directory id tidak valid" {
			status = http.StatusBadRequest
		}
		writeError(c, status, err)
		return
	}

	c.JSON(http.StatusOK, dto.FileListResponse{
		Status:      "ok",
		DirectoryID: directoryID,
		Files:       toFileDTOs(files),
	})
}

// handleDirectoryBreadcrumb godoc
// @Summary Directory breadcrumb
// @Description Resolve breadcrumb path for given directory
// @Tags directories
// @Security BearerAuth
// @Produce json
// @Param id path string true "Directory UUID"
// @Success 200 {object} dto.BreadcrumbResponse
// @Failure 400 {object} dto.ErrorResponse
// @Failure 401 {object} dto.ErrorResponse
// @Failure 404 {object} dto.ErrorResponse
// @Failure 500 {object} dto.ErrorResponse
// @Router /directories/{id}/breadcrumb [get]
func (a *API) handleDirectoryBreadcrumb(c *gin.Context) {
	user, ok := a.authUser(c)
	if !ok {
		return
	}

	directoryID := strings.TrimSpace(c.Param("id"))
	items, err := a.directoryService.Breadcrumb(c.Request.Context(), user, directoryID)
	if err != nil {
		status := statusFromError(err)
		if status == http.StatusInternalServerError && err.Error() == "directory id tidak valid" {
			status = http.StatusBadRequest
		}
		if err == domain.ErrNotFound {
			status = http.StatusNotFound
		}
		writeError(c, status, err)
		return
	}

	c.JSON(http.StatusOK, dto.BreadcrumbResponse{
		Status:      "ok",
		DirectoryID: directoryID,
		Breadcrumb:  toDirectoryDTOs(items),
	})
}
