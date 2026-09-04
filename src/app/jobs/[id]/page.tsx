"use client";
/* eslint-disable @next/next/no-img-element */

import Link from "next/link";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

type Author = { id: string; name: string; avatar_url: string | null };
type Job = {
  id: string; author_id: string; company_name: string; title: string; location: string | null;
  description: string; application_url: string; deadline: string | null; created_at: string; updated_at: string;
  author: Author | null;
};

function getToday() {
  const today = new Date();
  return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("ko-KR", { year: "numeric", month: "long", day: "numeric" }).format(new Date(value));
}

function formatDeadline(deadline: string | null) {
  if (!deadline) return "상시채용";
  if (deadline < getToday()) return "마감됨";
  return `마감 ${deadline.replaceAll("-", ".")}`;
}

export default function JobDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [job, setJob] = useState<Job | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isNotFound, setIsNotFound] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [isAuthor, setIsAuthor] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteErrorMessage, setDeleteErrorMessage] = useState("");

  useEffect(() => {
    let isMounted = true;

    async function loadJob() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.replace("/login");
        return;
      }

      const { data, error } = await supabase
        .from("jobs")
        .select("id, author_id, company_name, title, location, description, application_url, deadline, created_at, updated_at, author:profiles!jobs_author_id_fkey(id, name, avatar_url)")
        .eq("id", params.id)
        .single();

      if (!isMounted) return;

      if (error) {
        if (error.code === "PGRST116") setIsNotFound(true);
        else setErrorMessage("취업정보를 불러오지 못했습니다.");
        setIsLoading(false);
        return;
      }

      const loadedJob = data as unknown as Job;
      setJob(loadedJob);
      setIsAuthor(loadedJob.author_id === user.id);

      const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).maybeSingle();
      if (!isMounted) return;
      setIsAdmin((profile as { role: string } | null)?.role === "ADMIN");
      setIsLoading(false);
    }

    void loadJob();
    return () => { isMounted = false; };
  }, [params.id, router]);

  async function handleDelete() {
    if (!job || (!isAuthor && !isAdmin)) return;
    if (!window.confirm("취업정보를 삭제하시겠습니까?")) return;

    setDeleteErrorMessage("");
    setIsDeleting(true);
    const { data, error } = await supabase.from("jobs").delete().eq("id", job.id).select("id").maybeSingle();
    setIsDeleting(false);

    if (error || !data) {
      setDeleteErrorMessage("취업정보 삭제에 실패했습니다. 다시 시도해 주세요.");
      return;
    }

    router.replace("/jobs");
    router.refresh();
  }

  if (isLoading) return <div className="mx-auto w-full max-w-3xl px-4 py-16 text-sm text-slate-600 sm:px-6">취업정보를 불러오는 중입니다.</div>;
  if (isNotFound) return <div className="mx-auto w-full max-w-3xl px-4 py-16 sm:px-6"><section className="rounded-xl border border-dashed border-slate-300 bg-white px-6 py-12 text-center"><h1 className="text-lg font-semibold text-slate-950">취업정보를 찾을 수 없습니다</h1><p className="mt-2 text-sm text-slate-600">존재하지 않거나 조회할 수 없는 취업정보입니다.</p><Link href="/jobs" className="mt-6 inline-flex text-sm font-medium text-blue-700 hover:text-blue-800">취업정보로 돌아가기</Link></section></div>;
  if (errorMessage || !job) return <div className="mx-auto w-full max-w-3xl px-4 py-16 sm:px-6"><p role="alert" className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">{errorMessage || "취업정보를 불러오지 못했습니다."}</p></div>;

  const isExpired = Boolean(job.deadline && job.deadline < getToday());

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-12 sm:px-6 sm:py-16">
      <Link href="/jobs" className="text-sm font-medium text-slate-600 hover:text-slate-950">← 취업정보</Link>
      <article className="mt-6 rounded-xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
        <header className="border-b border-slate-100 pb-6">
          <div className="flex flex-wrap items-start justify-between gap-4"><div><p className="text-lg font-semibold text-slate-950">{job.company_name}</p><h1 className="mt-2 text-2xl font-bold tracking-tight text-slate-950 sm:text-3xl">{job.title}</h1></div>{(isAuthor || isAdmin) && <div className="flex shrink-0 gap-2">{isAuthor && <Link href={`/jobs/${job.id}/edit`} className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">수정</Link>}<button type="button" disabled={isDeleting} onClick={() => void handleDelete()} className="rounded-lg border border-red-200 px-3 py-2 text-sm font-medium text-red-700 hover:bg-red-50 disabled:cursor-not-allowed disabled:text-red-300">{isDeleting ? "삭제 중..." : "삭제"}</button></div>}</div>
          <dl className="mt-5 flex flex-wrap gap-x-6 gap-y-2 text-sm text-slate-600"><div><dt className="sr-only">지역</dt><dd>{job.location ?? "지역 미정"}</dd></div><div><dt className="sr-only">마감일</dt><dd className={isExpired ? "font-medium text-rose-700" : ""}>{formatDeadline(job.deadline)}</dd></div></dl>
          <div className="mt-5 flex items-center gap-3 text-sm text-slate-600">{job.author?.avatar_url ? <img src={job.author.avatar_url} alt={`${job.author.name} 프로필 이미지`} className="size-9 rounded-full border border-slate-200 object-cover" /> : <span aria-hidden="true" className="flex size-9 items-center justify-center rounded-full bg-slate-100 text-sm font-semibold text-slate-700">{job.author?.name.slice(0, 1) ?? "?"}</span>}<div><p className="font-medium text-slate-900">작성자 {job.author?.name ?? "알 수 없음"}</p><time dateTime={job.created_at} className="text-xs text-slate-500">등록일 {formatDate(job.created_at)}</time></div></div>
        </header>
        <div className="py-8"><h2 className="text-base font-semibold text-slate-900">채용 설명</h2><p className="mt-4 whitespace-pre-wrap break-words text-sm leading-7 text-slate-800">{job.description}</p></div>
        <dl className="grid gap-4 border-t border-slate-100 py-6 text-sm sm:grid-cols-2"><div><dt className="text-slate-500">마감</dt><dd className={`mt-1 font-medium ${isExpired ? "text-rose-700" : "text-slate-900"}`}>{formatDeadline(job.deadline)}</dd></div><div><dt className="text-slate-500">수정일</dt><dd className="mt-1 font-medium text-slate-900">{formatDate(job.updated_at)}</dd></div></dl>
        <a href={job.application_url} target="_blank" rel="noopener noreferrer" className="inline-flex rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-slate-700">채용공고 보기</a>
        {deleteErrorMessage && <p role="alert" className="mt-6 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{deleteErrorMessage}</p>}
      </article>
    </div>
  );
}
