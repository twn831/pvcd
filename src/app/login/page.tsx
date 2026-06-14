"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import LoginForm from "@/components/LoginForm";

export default function LoginPage() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const router = useRouter();

  useEffect(() => {
    checkAuth();
  }, []);

  async function checkAuth() {
    try {
      const res = await fetch("/api/auth/check");
      const data = await res.json();
      if (data.authenticated) {
        setIsAuthenticated(true);
        router.push("/drive");
      }
    } catch {
      // Stay on login page
    }
  }

  if (isAuthenticated) {
    return null;
  }

  return <LoginForm />;
}
