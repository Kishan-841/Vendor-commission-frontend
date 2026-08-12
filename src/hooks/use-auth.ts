"use client";

import { useMutation } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/store";
import type { AuthUser } from "@/lib/types";

interface LoginResponse {
  token: string;
  user: AuthUser;
}

export function useLogin() {
  const setAuth = useAuth((s) => s.setAuth);
  return useMutation({
    mutationFn: (input: { email: string; password: string }) =>
      api.post<LoginResponse>("/auth/login", input).then((r) => r.data),
    onSuccess: (data) => setAuth(data.token, data.user),
  });
}
