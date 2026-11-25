import React from "react";
import { BrowserRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/sonner";
import { AuthProvider } from "@/context/AuthContext";
import { DataScopeProvider } from "@/context/DataScopeContext";
import { AppRouter } from "@/router/AppRouter";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      staleTime: 1000 * 60 * 5, // 5 minutes
      retry: 1,
    },
  },
});

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <DataScopeProvider>
          <BrowserRouter>
            <AppRouter />
            <Toaster />
          </BrowserRouter>
        </DataScopeProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}
