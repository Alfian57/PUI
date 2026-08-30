package httptransport

import (
	"net/http"
	"strings"

	"github.com/alfiang/pui/environment-a/api-service/internal/domain"
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
// @Param sort query string false "Urutan: newest, oldest, name-asc, name-desc, type, starred"
// @Param created_from query string false "Batas waktu awal RFC3339"
// @Param created_to query string false "Batas waktu akhir RFC3339"
// @Param limit query int false "Ukuran halaman (1-200, default 40)"
// @Param offset query int false "Offset (default 0)"
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

// handleDirectoryDetail godoc
// @Summary Detail direktori
// @Description Menampilkan metadata, isi langsung, dan ringkasan seluruh subtree direktori pada konteks Berbintang atau Sampah
// @Tags direktori
// @Security BearerAuth
// @Produce json
// @Param id path string true "UUID direktori"
// @Param scope query string true "Konteks detail: starred atau trash"
// @Success 200 {object} dto.DirectoryDetailResponse
// @Failure 400 {object} dto.ErrorResponse
// @Failure 401 {object} dto.ErrorResponse
// @Failure 404 {object} dto.ErrorResponse
// @Failure 500 {object} dto.ErrorResponse
// @Router /directories/{id}/detail [get]
func (a *API) handleDirectoryDetail(c *gin.Context) {
	user, ok := a.authUser(c)
	if !ok {
		return
	}

	directoryID := strings.TrimSpace(c.Param("id"))
	scope := domain.DirectoryDetailScope(strings.TrimSpace(c.Query("scope")))
	detail, err := a.directoryService.Detail(c.Request.Context(), user, directoryID, scope)
	if err != nil {
		writeError(c, statusFromError(err), err)
		return
	}

	files, err := a.fileService.ListByDirectory(
		c.Request.Context(),
		user,
		directoryID,
		scope == domain.DirectoryDetailScopeTrash,
	)
	if err != nil {
		writeError(c, statusFromError(err), err)
		return
	}
	if scope == domain.DirectoryDetailScopeTrash {
		deletedFiles := make([]domain.FileRecord, 0, len(files))
		for _, file := range files {
			if file.DeletedAt != nil {
				deletedFiles = append(deletedFiles, file)
			}
		}
		files = deletedFiles
	}

	c.JSON(http.StatusOK, dto.DirectoryDetailResponse{
		Status:    "ok",
		Directory: toDirectoryDTO(detail.Directory),
		Summary: dto.DirectoryDetailSummaryDTO{
			DirectoryCount: detail.Summary.DirectoryCount,
			FileCount:      detail.Summary.FileCount,
			TotalBytes:     detail.Summary.TotalBytes,
		},
		Directories: toDirectoryDTOs(detail.Directories),
		Files:       toFileDTOs(files),
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
// @Param limit query int false "Ukuran halaman per jenis item (1-200, default 40)"
// @Param offset query int false "Offset per jenis item (default 0)"
// @Success 200 {object} dto.TrashResponse
// @Failure 401 {object} dto.ErrorResponse
// @Failure 500 {object} dto.ErrorResponse
// @Router /trash [get]
func (a *API) handleTrash(c *gin.Context) {
	user, ok := a.authUser(c)
	if !ok {
		return
	}

	limit, offset, err := parsePaginationQuery(c)
	if err != nil {
		writeError(c, http.StatusBadRequest, err)
		return
	}

	directories, directoryTotal, normalizedLimit, normalizedOffset, err := a.directoryService.TrashPage(c.Request.Context(), user, limit, offset)
	if err != nil {
		writeError(c, statusFromError(err), err)
		return
	}
	files, fileTotal, _, _, err := a.fileService.TrashPage(c.Request.Context(), user, normalizedLimit, normalizedOffset)
	if err != nil {
		writeError(c, statusFromError(err), err)
		return
	}

	c.JSON(http.StatusOK, dto.TrashResponse{
		Status:         "ok",
		Total:          directoryTotal + fileTotal,
		DirectoryTotal: directoryTotal,
		FileTotal:      fileTotal,
		Limit:          normalizedLimit,
		Offset:         normalizedOffset,
		Directories:    toDirectoryDTOs(directories),
		Files:          toFileDTOs(files),
	})
}

// handleStarred godoc
// @Summary Item berbintang
// @Description Menampilkan berkas dan direktori berbintang milik pengguna
// @Tags workspace
// @Security BearerAuth
// @Produce json
// @Param limit query int false "Ukuran halaman per jenis item (1-200, default 40)"
// @Param offset query int false "Offset per jenis item (default 0)"
// @Success 200 {object} dto.StarredResponse
// @Failure 401 {object} dto.ErrorResponse
// @Failure 500 {object} dto.ErrorResponse
// @Router /starred [get]
func (a *API) handleStarred(c *gin.Context) {
	user, ok := a.authUser(c)
	if !ok {
		return
	}

	limit, offset, err := parsePaginationQuery(c)
	if err != nil {
		writeError(c, http.StatusBadRequest, err)
		return
	}

	directories, directoryTotal, normalizedLimit, normalizedOffset, err := a.directoryService.StarredPage(c.Request.Context(), user, limit, offset)
	if err != nil {
		writeError(c, statusFromError(err), err)
		return
	}
	files, fileTotal, _, _, err := a.fileService.StarredPage(c.Request.Context(), user, normalizedLimit, normalizedOffset)
	if err != nil {
		writeError(c, statusFromError(err), err)
		return
	}

	c.JSON(http.StatusOK, dto.StarredResponse{
		Status:         "ok",
		Total:          directoryTotal + fileTotal,
		DirectoryTotal: directoryTotal,
		FileTotal:      fileTotal,
		Limit:          normalizedLimit,
		Offset:         normalizedOffset,
		Directories:    toDirectoryDTOs(directories),
		Files:          toFileDTOs(files),
	})
}
