import React from "react";
import ReactDOM from "react-dom/client";
import App from "@/App";
import { QueryProvider } from "@/app/providers/QueryProvider";
import { ConfirmDialogProvider } from "@/components/shared/ConfirmDialogProvider";
import "@/index.css";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <QueryProvider>
      <ConfirmDialogProvider>
        <App />
      </ConfirmDialogProvider>
    </QueryProvider>
  </React.StrictMode>
);
