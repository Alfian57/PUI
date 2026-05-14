package service

import (
	"bytes"
	"encoding/csv"
	"fmt"
	"strconv"
	"strings"

	"github.com/alfiang/pui/environment-a/api-service/internal/domain"
	"github.com/phpdave11/gofpdf"
)

type ReportFile struct {
	FileName    string
	ContentType string
	Body        []byte
}

func BuildUserInsightReport(format string, insight domain.UserInsight) (ReportFile, error) {
	format = normalizeReportFormat(format)
	switch format {
	case "csv":
		return buildUserInsightCSV(insight)
	case "pdf":
		return buildUserInsightPDF(insight)
	default:
		return ReportFile{}, fmt.Errorf("%w: format harus pdf atau csv", domain.ErrInvalidInput)
	}
}

func BuildAdminAnalyticsReport(format string, analytics domain.AdminAnalytics) (ReportFile, error) {
	format = normalizeReportFormat(format)
	switch format {
	case "csv":
		return buildAdminAnalyticsCSV(analytics)
	case "pdf":
		return buildAdminAnalyticsPDF(analytics)
	default:
		return ReportFile{}, fmt.Errorf("%w: format harus pdf atau csv", domain.ErrInvalidInput)
	}
}

func normalizeReportFormat(format string) string {
	format = strings.ToLower(strings.TrimSpace(format))
	if format == "" {
		return "pdf"
	}
	return format
}

func buildUserInsightCSV(insight domain.UserInsight) (ReportFile, error) {
	var buffer bytes.Buffer
	writer := csv.NewWriter(&buffer)
	writeCSVSection(writer, "Ringkasan")
	_ = writer.Write([]string{"Metrik", "Nilai"})
	summary := insight.Summary
	_ = writer.Write([]string{"File aktif", intString(summary.ActiveFiles)})
	_ = writer.Write([]string{"Folder aktif", intString(summary.ActiveFolders)})
	_ = writer.Write([]string{"Penyimpanan aktif (byte)", intString(summary.ActiveStorageBytes)})
	_ = writer.Write([]string{"Penyimpanan sampah (byte)", intString(summary.TrashStorageBytes)})
	_ = writer.Write([]string{"Total chunk", intString(summary.TotalChunks)})
	_ = writer.Write([]string{"Chunk baru", intString(summary.NewChunks)})
	_ = writer.Write([]string{"Chunk digunakan ulang", intString(summary.ReuseChunks)})
	_ = writer.Write([]string{"Efisiensi deduplikasi", percentString(summary.DedupRatio)})
	_ = writer.Write([]string{})
	writeCSVSection(writer, "Aktivitas")
	_ = writer.Write([]string{"Tanggal", "Upload", "Download", "Hapus", "Pulihkan", "Bintang"})
	for _, item := range insight.Activity {
		_ = writer.Write([]string{item.Date, intString(item.Uploads), intString(item.Downloads), intString(item.Deletes), intString(item.Restores), intString(item.Stars)})
	}
	_ = writer.Write([]string{})
	writeCSVSection(writer, "File Terbesar")
	_ = writer.Write([]string{"Nama", "Ukuran (byte)", "Tipe", "Dibuat"})
	for _, item := range insight.LargestFiles {
		_ = writer.Write([]string{item.Name, intString(item.SizeBytes), item.MIMEType, item.CreatedAt.Format("2006-01-02 15:04:05")})
	}
	_ = writer.Write([]string{})
	writeCSVSection(writer, "Sampah")
	_ = writer.Write([]string{"Jenis", "Nama", "Ukuran (byte)", "Dihapus"})
	for _, item := range insight.TrashItems {
		_ = writer.Write([]string{item.Kind, item.Name, intString(item.SizeBytes), item.DeletedAt.Format("2006-01-02 15:04:05")})
	}
	writer.Flush()
	if err := writer.Error(); err != nil {
		return ReportFile{}, fmt.Errorf("build user insight csv: %w", err)
	}
	return ReportFile{
		FileName:    fmt.Sprintf("hashbox-insight-%s.csv", insight.Range),
		ContentType: "text/csv; charset=utf-8",
		Body:        buffer.Bytes(),
	}, nil
}

func buildAdminAnalyticsCSV(analytics domain.AdminAnalytics) (ReportFile, error) {
	var buffer bytes.Buffer
	writer := csv.NewWriter(&buffer)
	writeCSVSection(writer, "Ringkasan Agregat")
	_ = writer.Write([]string{"Metrik", "Nilai"})
	summary := analytics.Summary
	_ = writer.Write([]string{"Pengguna", intString(summary.TotalUsers)})
	_ = writer.Write([]string{"Admin", intString(summary.TotalAdmins)})
	_ = writer.Write([]string{"Pengguna aktif", intString(summary.ActiveUsers)})
	_ = writer.Write([]string{"File aktif", intString(summary.ActiveFiles)})
	_ = writer.Write([]string{"Folder aktif", intString(summary.ActiveFolders)})
	_ = writer.Write([]string{"Penyimpanan aktif (byte)", intString(summary.ActiveStorageBytes)})
	_ = writer.Write([]string{"Penyimpanan sampah (byte)", intString(summary.TrashStorageBytes)})
	_ = writer.Write([]string{"Total chunk", intString(summary.TotalChunks)})
	_ = writer.Write([]string{"Chunk baru", intString(summary.NewChunks)})
	_ = writer.Write([]string{"Chunk digunakan ulang", intString(summary.ReuseChunks)})
	_ = writer.Write([]string{"Efisiensi deduplikasi", percentString(summary.DedupRatio)})
	_ = writer.Write([]string{})
	writeCSVSection(writer, "Aktivitas Agregat")
	_ = writer.Write([]string{"Tanggal", "Login", "Upload", "Download", "Hapus", "Pulihkan", "Bintang"})
	for _, item := range analytics.Activity {
		_ = writer.Write([]string{item.Date, intString(item.Logins), intString(item.Uploads), intString(item.Downloads), intString(item.Deletes), intString(item.Restores), intString(item.Stars)})
	}
	_ = writer.Write([]string{})
	writeCSVSection(writer, "Tipe File")
	_ = writer.Write([]string{"Tipe", "Jumlah", "Total byte"})
	for _, item := range analytics.FileTypes {
		_ = writer.Write([]string{item.Type, intString(item.Count), intString(item.TotalBytes)})
	}
	writer.Flush()
	if err := writer.Error(); err != nil {
		return ReportFile{}, fmt.Errorf("build admin analytics csv: %w", err)
	}
	return ReportFile{
		FileName:    fmt.Sprintf("hashbox-analitik-%s.csv", analytics.Range),
		ContentType: "text/csv; charset=utf-8",
		Body:        buffer.Bytes(),
	}, nil
}

func buildUserInsightPDF(insight domain.UserInsight) (ReportFile, error) {
	pdf := newReportPDF("Laporan Insight Pengguna", insight.Range)
	summary := insight.Summary
	addPDFTable(pdf, []string{"Metrik", "Nilai"}, [][]string{
		{"File aktif", intString(summary.ActiveFiles)},
		{"Folder aktif", intString(summary.ActiveFolders)},
		{"Penyimpanan aktif", byteString(summary.ActiveStorageBytes)},
		{"Penyimpanan sampah", byteString(summary.TrashStorageBytes)},
		{"Total chunk", intString(summary.TotalChunks)},
		{"Chunk digunakan ulang", intString(summary.ReuseChunks)},
		{"Efisiensi deduplikasi", percentString(summary.DedupRatio)},
	})
	addPDFSection(pdf, "File terbesar")
	addPDFTable(pdf, []string{"Nama", "Ukuran", "Tipe"}, insightFileRows(insight.LargestFiles))
	addPDFSection(pdf, "Item di Sampah")
	addPDFTable(pdf, []string{"Jenis", "Nama", "Dihapus"}, insightTrashRows(insight.TrashItems))
	body, err := outputPDF(pdf)
	if err != nil {
		return ReportFile{}, err
	}
	return ReportFile{FileName: fmt.Sprintf("hashbox-insight-%s.pdf", insight.Range), ContentType: "application/pdf", Body: body}, nil
}

func buildAdminAnalyticsPDF(analytics domain.AdminAnalytics) (ReportFile, error) {
	pdf := newReportPDF("Laporan Analitik HashBox", analytics.Range)
	summary := analytics.Summary
	addPDFTable(pdf, []string{"Metrik", "Nilai"}, [][]string{
		{"Pengguna", intString(summary.TotalUsers)},
		{"Pengguna aktif", intString(summary.ActiveUsers)},
		{"Item aktif", intString(summary.ActiveFiles + summary.ActiveFolders)},
		{"Penyimpanan aktif", byteString(summary.ActiveStorageBytes)},
		{"Penyimpanan sampah", byteString(summary.TrashStorageBytes)},
		{"Total chunk", intString(summary.TotalChunks)},
		{"Chunk digunakan ulang", intString(summary.ReuseChunks)},
		{"Efisiensi deduplikasi", percentString(summary.DedupRatio)},
	})
	addPDFSection(pdf, "Tipe file agregat")
	addPDFTable(pdf, []string{"Tipe", "Jumlah", "Ukuran"}, adminFileTypeRows(analytics.FileTypes))
	addPDFSection(pdf, "Aktivitas terbaru")
	addPDFTable(pdf, []string{"Tanggal", "Upload", "Download", "Hapus"}, adminActivityRows(analytics.Activity))
	body, err := outputPDF(pdf)
	if err != nil {
		return ReportFile{}, err
	}
	return ReportFile{FileName: fmt.Sprintf("hashbox-analitik-%s.pdf", analytics.Range), ContentType: "application/pdf", Body: body}, nil
}

func newReportPDF(title, reportRange string) *gofpdf.Fpdf {
	pdf := gofpdf.New("P", "mm", "A4", "")
	pdf.SetMargins(14, 14, 14)
	pdf.AddPage()
	pdf.SetFont("Arial", "B", 18)
	pdf.Cell(0, 10, title)
	pdf.Ln(8)
	pdf.SetFont("Arial", "", 10)
	pdf.SetTextColor(90, 104, 122)
	pdf.Cell(0, 8, fmt.Sprintf("HashBox - rentang %s", reportRange))
	pdf.Ln(12)
	pdf.SetTextColor(0, 0, 0)
	return pdf
}

func addPDFSection(pdf *gofpdf.Fpdf, title string) {
	pdf.Ln(4)
	pdf.SetFont("Arial", "B", 13)
	pdf.Cell(0, 8, title)
	pdf.Ln(9)
}

func addPDFTable(pdf *gofpdf.Fpdf, headers []string, rows [][]string) {
	if len(headers) == 0 {
		return
	}
	width := 182.0 / float64(len(headers))
	pdf.SetFont("Arial", "B", 10)
	pdf.SetFillColor(230, 239, 247)
	for _, header := range headers {
		pdf.CellFormat(width, 8, header, "1", 0, "L", true, 0, "")
	}
	pdf.Ln(-1)
	pdf.SetFont("Arial", "", 9)
	if len(rows) == 0 {
		rows = [][]string{{"Belum ada data"}}
	}
	for _, row := range rows {
		for index := range headers {
			value := ""
			if index < len(row) {
				value = row[index]
			}
			pdf.CellFormat(width, 8, truncateReportText(value, 34), "1", 0, "L", false, 0, "")
		}
		pdf.Ln(-1)
	}
}

func outputPDF(pdf *gofpdf.Fpdf) ([]byte, error) {
	var buffer bytes.Buffer
	if err := pdf.Output(&buffer); err != nil {
		return nil, fmt.Errorf("build pdf report: %w", err)
	}
	return buffer.Bytes(), nil
}

func writeCSVSection(writer *csv.Writer, title string) {
	_ = writer.Write([]string{title})
}

func insightFileRows(items []domain.InsightFileItem) [][]string {
	rows := make([][]string, 0, len(items))
	for _, item := range items {
		rows = append(rows, []string{item.Name, byteString(item.SizeBytes), item.MIMEType})
	}
	return rows
}

func insightTrashRows(items []domain.InsightTrashItem) [][]string {
	rows := make([][]string, 0, len(items))
	for _, item := range items {
		rows = append(rows, []string{item.Kind, item.Name, item.DeletedAt.Format("2006-01-02")})
	}
	return rows
}

func adminFileTypeRows(items []domain.AdminFileTypeStat) [][]string {
	rows := make([][]string, 0, len(items))
	for _, item := range items {
		rows = append(rows, []string{item.Type, intString(item.Count), byteString(item.TotalBytes)})
	}
	return rows
}

func adminActivityRows(items []domain.AdminActivityPoint) [][]string {
	rows := make([][]string, 0, len(items))
	start := 0
	if len(items) > 10 {
		start = len(items) - 10
	}
	for _, item := range items[start:] {
		rows = append(rows, []string{item.Date, intString(item.Uploads), intString(item.Downloads), intString(item.Deletes)})
	}
	return rows
}

func intString(value int64) string {
	return strconv.FormatInt(value, 10)
}

func percentString(value float64) string {
	return fmt.Sprintf("%.2f%%", value*100)
}

func byteString(value int64) string {
	if value < 1024 {
		return fmt.Sprintf("%d B", value)
	}
	units := []string{"KB", "MB", "GB", "TB"}
	size := float64(value)
	for _, unit := range units {
		size /= 1024
		if size < 1024 {
			return fmt.Sprintf("%.1f %s", size, unit)
		}
	}
	return fmt.Sprintf("%.1f PB", size/1024)
}

func truncateReportText(value string, max int) string {
	runes := []rune(value)
	if len(runes) <= max {
		return value
	}
	if max <= 3 {
		return string(runes[:max])
	}
	return string(runes[:max-3]) + "..."
}
