"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { getToken, getCompany } from "@/lib/api";

export default function Home() {
  const router = useRouter();
  useEffect(() => {
    if (!getToken()) router.replace("/login");
    else if (!getCompany()) router.replace("/companies");
    else router.replace("/dashboard");
  }, [router]);
  return null;
}
