import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "node:path";
export default defineConfig({
    plugins: [react()],
    build: {
        rollupOptions: {
            output: {
                manualChunks(id) {
                    if (id.includes("recharts")) {
                        return "vendor-recharts";
                    }
                    if (id.includes("victory-vendor")) {
                        return "vendor-victory";
                    }
                    if (id.includes("d3-")) {
                        return "vendor-d3";
                    }
                    return undefined;
                }
            }
        }
    },
    resolve: {
        alias: {
            "@": path.resolve(__dirname, "src")
        }
    },
    server: {
        host: "0.0.0.0",
        port: 5173
    }
});
