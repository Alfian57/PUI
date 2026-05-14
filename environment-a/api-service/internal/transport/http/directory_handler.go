package httptransport

import (
	"net/http"
	"strings"

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
		writeError(c, statusFromError(err), err)
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
		writeError(c, statusFromError(err), err)
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
		writeError(c, statusFromError(err), err)
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
		writeError(c, statusFromError(err), err)
		return
	}

	c.JSON(http.StatusOK, dto.BreadcrumbResponse{
		Status:      "ok",
		DirectoryID: directoryID,
		Breadcrumb:  toDirectoryDTOs(items),
	})
}

// handleSoftDeleteDirectory godoc
// @Summary Move directory to trash
// @Description Soft-delete a directory subtree and move it to trash
// @Tags directories
// @Security BearerAuth
// @Produce json
// @Param id path string true "Directory UUID"
// @Success 200 {object} dto.DirectoryMutationResponse
// @Failure 400 {object} dto.ErrorResponse
// @Failure 401 {object} dto.ErrorResponse
// @Failure 404 {object} dto.ErrorResponse
// @Failure 500 {object} dto.ErrorResponse
// @Router /directories/{id} [delete]
func (a *API) handleSoftDeleteDirectory(c *gin.Context) {
	user, ok := a.authUser(c)
	if !ok {
		return
	}

	directoryID := strings.TrimSpace(c.Param("id"))
	directory, err := a.directoryService.SoftDelete(c.Request.Context(), user, directoryID)
	if err != nil {
		writeError(c, statusFromError(err), err)
		return
	}

	c.JSON(http.StatusOK, dto.DirectoryMutationResponse{Status: "ok", Directory: toDirectoryDTO(directory)})
}

// handleRestoreDirectory godoc
// @Summary Restore directory from trash
// @Description Restore a previously deleted directory subtree
// @Tags directories
// @Security BearerAuth
// @Produce json
// @Param id path string true "Directory UUID"
// @Success 200 {object} dto.DirectoryMutationResponse
// @Failure 400 {object} dto.ErrorResponse
// @Failure 401 {object} dto.ErrorResponse
// @Failure 404 {object} dto.ErrorResponse
// @Failure 500 {object} dto.ErrorResponse
// @Router /directories/{id}/restore [post]
func (a *API) handleRestoreDirectory(c *gin.Context) {
	user, ok := a.authUser(c)
	if !ok {
		return
	}

	directoryID := strings.TrimSpace(c.Param("id"))
	directory, err := a.directoryService.Restore(c.Request.Context(), user, directoryID)
	if err != nil {
		writeError(c, statusFromError(err), err)
		return
	}

	c.JSON(http.StatusOK, dto.DirectoryMutationResponse{Status: "ok", Directory: toDirectoryDTO(directory)})
}

// handlePermanentDeleteDirectory godoc
// @Summary Permanently delete directory
// @Description Permanently remove a directory subtree from trash metadata
// @Tags directories
// @Security BearerAuth
// @Produce json
// @Param id path string true "Directory UUID"
// @Success 200 {object} dto.OKResponse
// @Failure 400 {object} dto.ErrorResponse
// @Failure 401 {object} dto.ErrorResponse
// @Failure 404 {object} dto.ErrorResponse
// @Failure 500 {object} dto.ErrorResponse
// @Router /directories/{id}/permanent [delete]
func (a *API) handlePermanentDeleteDirectory(c *gin.Context) {
	user, ok := a.authUser(c)
	if !ok {
		return
	}

	directoryID := strings.TrimSpace(c.Param("id"))
	if err := a.directoryService.PermanentDelete(c.Request.Context(), user, directoryID); err != nil {
		writeError(c, statusFromError(err), err)
		return
	}

	c.JSON(http.StatusOK, dto.OKResponse{Status: "ok"})
}

// handleStarDirectory godoc
// @Summary Star directory
// @Description Mark a directory as starred
// @Tags directories
// @Security BearerAuth
// @Produce json
// @Param id path string true "Directory UUID"
// @Success 200 {object} dto.DirectoryMutationResponse
// @Failure 400 {object} dto.ErrorResponse
// @Failure 401 {object} dto.ErrorResponse
// @Failure 404 {object} dto.ErrorResponse
// @Failure 500 {object} dto.ErrorResponse
// @Router /directories/{id}/star [put]
func (a *API) handleStarDirectory(c *gin.Context) {
	a.handleSetStarredDirectory(c, true)
}

// handleUnstarDirectory godoc
// @Summary Unstar directory
// @Description Remove starred marker from a directory
// @Tags directories
// @Security BearerAuth
// @Produce json
// @Param id path string true "Directory UUID"
// @Success 200 {object} dto.DirectoryMutationResponse
// @Failure 400 {object} dto.ErrorResponse
// @Failure 401 {object} dto.ErrorResponse
// @Failure 404 {object} dto.ErrorResponse
// @Failure 500 {object} dto.ErrorResponse
// @Router /directories/{id}/star [delete]
func (a *API) handleUnstarDirectory(c *gin.Context) {
	a.handleSetStarredDirectory(c, false)
}

func (a *API) handleSetStarredDirectory(c *gin.Context, starred bool) {
	user, ok := a.authUser(c)
	if !ok {
		return
	}

	directoryID := strings.TrimSpace(c.Param("id"))
	directory, err := a.directoryService.SetStarred(c.Request.Context(), user, directoryID, starred)
	if err != nil {
		writeError(c, statusFromError(err), err)
		return
	}

	c.JSON(http.StatusOK, dto.DirectoryMutationResponse{Status: "ok", Directory: toDirectoryDTO(directory)})
}

// handleTrash godoc
// @Summary Trash
// @Description List user's deleted files and directory trash roots
// @Tags workspace
// @Security BearerAuth
// @Produce json
// @Success 200 {object} dto.TrashResponse
// @Failure 401 {object} dto.ErrorResponse
// @Failure 500 {object} dto.ErrorResponse
// @Router /trash [get]
func (a *API) handleTrash(c *gin.Context) {
	user, ok := a.authUser(c)
	if !ok {
		return
	}

	directories, err := a.directoryService.Trash(c.Request.Context(), user)
	if err != nil {
		writeError(c, statusFromError(err), err)
		return
	}
	files, err := a.fileService.Trash(c.Request.Context(), user)
	if err != nil {
		writeError(c, statusFromError(err), err)
		return
	}

	c.JSON(http.StatusOK, dto.TrashResponse{
		Status:      "ok",
		Directories: toDirectoryDTOs(directories),
		Files:       toFileDTOs(files),
	})
}

// handleStarred godoc
// @Summary Starred items
// @Description List user's starred files and directories
// @Tags workspace
// @Security BearerAuth
// @Produce json
// @Success 200 {object} dto.StarredResponse
// @Failure 401 {object} dto.ErrorResponse
// @Failure 500 {object} dto.ErrorResponse
// @Router /starred [get]
func (a *API) handleStarred(c *gin.Context) {
	user, ok := a.authUser(c)
	if !ok {
		return
	}

	directories, err := a.directoryService.Starred(c.Request.Context(), user)
	if err != nil {
		writeError(c, statusFromError(err), err)
		return
	}
	files, err := a.fileService.Starred(c.Request.Context(), user)
	if err != nil {
		writeError(c, statusFromError(err), err)
		return
	}

	c.JSON(http.StatusOK, dto.StarredResponse{
		Status:      "ok",
		Directories: toDirectoryDTOs(directories),
		Files:       toFileDTOs(files),
	})
}
