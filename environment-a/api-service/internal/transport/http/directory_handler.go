package httptransport

import (
	"net/http"
	"strings"

	"github.com/alfiang/pui/environment-a/api-service/internal/transport/http/dto"
	"github.com/gin-gonic/gin"
)

// handleCreateDirectory godoc
// @Summary Buat direktori
// @Description Membuat direktori root atau direktori bertingkat di ruang pengguna
// @Tags direktori
// @Security BearerAuth
// @Accept json
// @Produce json
// @Param payload body dto.CreateDirectoryRequest true "Payload pembuatan direktori"
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
// @Summary Pohon direktori
// @Description Menampilkan direktori root atau subtree berdasarkan root_id
// @Tags direktori
// @Security BearerAuth
// @Produce json
// @Param root_id query string false "UUID direktori root"
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
// @Summary Berkas direktori
// @Description Menampilkan berkas pada direktori dengan opsi include_deleted=true
// @Tags direktori
// @Security BearerAuth
// @Produce json
// @Param id path string true "UUID direktori"
// @Param include_deleted query bool false "Sertakan berkas yang sudah soft delete"
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
// @Summary Breadcrumb direktori
// @Description Menyusun path breadcrumb untuk direktori tertentu
// @Tags direktori
// @Security BearerAuth
// @Produce json
// @Param id path string true "UUID direktori"
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
// @Summary Pindahkan direktori ke Sampah
// @Description Melakukan soft delete pada subtree direktori dan memindahkannya ke Sampah
// @Tags direktori
// @Security BearerAuth
// @Produce json
// @Param id path string true "UUID direktori"
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
// @Summary Pulihkan direktori dari Sampah
// @Description Memulihkan subtree direktori yang sebelumnya dihapus secara logis
// @Tags direktori
// @Security BearerAuth
// @Produce json
// @Param id path string true "UUID direktori"
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
// @Summary Hapus permanen metadata direktori
// @Description Menghapus permanen metadata subtree direktori dari Sampah
// @Tags direktori
// @Security BearerAuth
// @Produce json
// @Param id path string true "UUID direktori"
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
// @Summary Tandai bintang direktori
// @Description Menandai direktori sebagai berbintang
// @Tags direktori
// @Security BearerAuth
// @Produce json
// @Param id path string true "UUID direktori"
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
// @Summary Hapus bintang direktori
// @Description Menghapus penanda bintang dari direktori
// @Tags direktori
// @Security BearerAuth
// @Produce json
// @Param id path string true "UUID direktori"
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
// @Summary Sampah
// @Description Menampilkan berkas dan root direktori yang dihapus secara logis oleh pengguna
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
// @Summary Item berbintang
// @Description Menampilkan berkas dan direktori berbintang milik pengguna
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
