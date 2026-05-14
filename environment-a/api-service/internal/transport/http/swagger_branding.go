package httptransport

import (
	_ "embed"
	"net/http"
	"strings"

	swaggerFiles "github.com/swaggo/files"
	ginSwagger "github.com/swaggo/gin-swagger"

	"github.com/gin-gonic/gin"
)

//go:embed assets/hashbox-logo.png
var hashBoxLogo []byte

//go:embed assets/favicon-16x16.png
var hashBoxFavicon16 []byte

//go:embed assets/favicon-32x32.png
var hashBoxFavicon32 []byte

func brandedSwaggerHandler() gin.HandlerFunc {
	baseHandler := ginSwagger.CustomWrapHandler(&ginSwagger.Config{
		URL:                      "doc.json",
		DocExpansion:             "list",
		Title:                    "HashBox API",
		DefaultModelsExpandDepth: 1,
		DeepLinking:              true,
	}, swaggerFiles.Handler)

	return func(ctx *gin.Context) {
		switch strings.TrimPrefix(ctx.Param("any"), "/") {
		case "hashbox-logo.png":
			ctx.Data(http.StatusOK, "image/png", hashBoxLogo)
		case "favicon-16x16.png":
			ctx.Data(http.StatusOK, "image/png", hashBoxFavicon16)
		case "favicon-32x32.png":
			ctx.Data(http.StatusOK, "image/png", hashBoxFavicon32)
		case "index.css":
			ctx.Data(http.StatusOK, "text/css; charset=utf-8", []byte(hashBoxSwaggerCSS))
		default:
			baseHandler(ctx)
		}
	}
}

const hashBoxSwaggerCSS = `
html {
  box-sizing: border-box;
  overflow-y: scroll;
}

*,
*:before,
*:after {
  box-sizing: inherit;
}

body {
  margin: 0;
  background: #f5fbff;
}

.swagger-ui .topbar {
  background: #10202a;
  box-shadow: 0 8px 24px rgba(16, 32, 42, 0.14);
}

.swagger-ui .topbar .download-url-wrapper {
  display: none;
}

.swagger-ui .topbar-wrapper .link {
  align-items: center;
  display: inline-flex;
  gap: 12px;
}

.swagger-ui .topbar-wrapper .link svg {
  display: none;
}

.swagger-ui .topbar-wrapper .link:before {
  background: url("./hashbox-logo.png") center / cover no-repeat;
  border-radius: 12px;
  content: "";
  display: inline-block;
  height: 40px;
  width: 40px;
}

.swagger-ui .topbar-wrapper .link:after {
  color: #ffffff;
  content: "HashBox API";
  font-family: Inter, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
  font-size: 18px;
  font-weight: 700;
}

.swagger-ui .info .title {
  color: #10202a;
}
`
