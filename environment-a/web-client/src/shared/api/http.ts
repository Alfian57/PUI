import axios from "axios";
import { env } from "@/shared/config/env";
import { tokenStorage } from "@/shared/lib/tokenStorage";

export const http = axios.create({
  baseURL: env.apiBaseUrl,
  timeout: 20000
});

http.interceptors.request.use((config) => {
  const token = tokenStorage.get();
  if (!token) {
    return config;
  }

  config.headers = config.headers ?? {};
  config.headers.Authorization = `Bearer ${token}`;
  return config;
});
