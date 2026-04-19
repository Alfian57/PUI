package dto

type ErrorResponse struct {
	Status string `json:"status" example:"error"`
	Error  string `json:"error" example:"unauthorized"`
}

type OKResponse struct {
	Status string `json:"status" example:"ok"`
}
