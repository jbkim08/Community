"use client";

import Link from "next/link";
import { useEffect, useState, type ReactNode } from "react";
import { supabase } from "@/lib/supabase";

export default function AdminLayout({ children }: { children: ReactNode }) {
  const [isLoading, setIsLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    let isMounted = true;

    async function checkAdminRole() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        if (isMounted) setIsLoading(false);
        return;
      }

      const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .maybeSingle();

      if (!isMounted) return;
      setIsAdmin((profile as { role: string } | null)?.role === "ADMIN");
      setIsLoading(false);
    }

    void checkAdminRole();
    return () => { isMounted = false; };
  }, []);

  if (isLoading) {
    return <div className="mx-auto w-full max-w-4xl px-4 py-16 text-sm text-slate-600 sm:px-6">관리자 권한을 확인하는 중입니다.</div>;
  }

  if (!isAdmin) {
    return <div className="mx-auto w-full max-w-4xl px-4 py-16 sm:px-6"><section className="rounded-xl border border-dashed border-slate-300 bg-white px-6 py-12 text-center"><h1 className="text-lg font-semibold text-slate-950">접근 권한이 없습니다</h1><p className="mt-2 text-sm text-slate-600">관리자만 이 페이지에 접근할 수 있습니다.</p><Link href="/" className="mt-6 inline-flex text-sm font-medium text-blue-700 hover:text-blue-800">홈으로 이동</Link></section></div>;
  }

  return <>{children}</>;
}
