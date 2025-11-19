// src/services/queryClient.js — Cấu hình React Query Client

import { QueryClient } from "@tanstack/react-query";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      suspense: false,
      refetchOnWindowFocus: false, // Tắt refetch khi focus vào cửa sổ
      refetchOnReconnect: true,
      retry: 1, // Thử lại 1 lần nếu query lỗi
      staleTime: 5 * 60 * 1000, // 5 phút
    },
  },
});

export default queryClient;