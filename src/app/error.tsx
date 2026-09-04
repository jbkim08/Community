"use client";

import Link from "next/link";
import { useEffect } from "react";

export default function GlobalError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => { console.error("예상하지 못한 페이지 오류가 발생했습니다."); }, []);
  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-16 sm:px-6">
      <section className="rounded-xl border border-dashed border-slate-300 bg-white px-6 py-12 text-center">
        <h1 className="text-lg font-semibold text-slate-950">문제가 발생했습니다</h1>
        <p className="mt-2 text-sm text-slate-600">잠시 후 다시 시도해 주세요.</p>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <button type="button" onClick={reset} className="rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-slate-700">다시 시도</button>
          <Link href="/" className="rounded-lg border border-slate-300 px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50">홈으로</Link>
        </div>
      </section>
    </div>
  );
}
