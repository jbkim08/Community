"use client";
/* eslint-disable @next/next/no-img-element */

import Link from "next/link";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import RecruitmentParticipation from "@/components/recruitments/recruitment-participation";
import { supabase } from "@/lib/supabase";

const typeLabels: Record<string, string> = { PROJECT: "프로젝트", STUDY: "스터디", ETC: "기타" };

type Author = { id: string; name: string; avatar_url: string | null };
type RelationCount = { count: number };
type Recruitment = {
  id: string; author_id: string; type: string; status: string; title: string; content: string;
  max_members: number | null; deadline: string | null; created_at: string; updated_at: string;
  author: Author | null; recruitment_members: RelationCount[];
};

function formatDate(value: string) {
  return new Intl.DateTimeFormat("ko-KR", { year: "numeric", month: "long", day: "numeric" }).format(new Date(value));
}

function formatDeadline(deadline: string | null) {
  return deadline ? deadline.replaceAll("-", ".") : "상시 모집";
}

export default function RecruitmentDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [recruitment, setRecruitment] = useState<Recruitment | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isNotFound, setIsNotFound] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [isAuthor, setIsAuthor] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteErrorMessage, setDeleteErrorMessage] = useState("");
  const [isClosing, setIsClosing] = useState(false);
  const [closeErrorMessage, setCloseErrorMessage] = useState("");

  useEffect(() => {
    let isMounted = true;

    async function loadRecruitment() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.replace("/login");
        return;
      }

      const { data, error } = await supabase
        .from("recruitments")
        .select("id, author_id, type, status, title, content, max_members, deadline, created_at, updated_at, author:profiles!recruitments_author_id_fkey(id, name, avatar_url), recruitment_members(count)")
        .eq("id", params.id)
        .single();

      if (!isMounted) return;
      if (error) {
        if (error.code === "PGRST116") setIsNotFound(true);
        else setErrorMessage("모임 모집글을 불러오지 못했습니다.");
        setIsLoading(false);
        return;
      }

      const loadedRecruitment = data as unknown as Recruitment;
      setRecruitment(loadedRecruitment);
      setIsAuthor(loadedRecruitment.author_id === user.id);

      const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).maybeSingle();
      if (!isMounted) return;
      setIsAdmin((profile as { role: string } | null)?.role === "ADMIN");
      setIsLoading(false);
    }

    void loadRecruitment();
    return () => { isMounted = false; };
  }, [params.id, router]);

  async function handleDelete() {
    if (!recruitment || (!isAuthor && !isAdmin)) return;
    if (!window.confirm("모집글을 삭제하시겠습니까?")) return;

    setDeleteErrorMessage("");
    setIsDeleting(true);
    const { data, error } = await supabase.from("recruitments").delete().eq("id", recruitment.id).select("id").maybeSingle();
    setIsDeleting(false);

    if (error || !data) {
      setDeleteErrorMessage("모집글 삭제에 실패했습니다. 다시 시도해 주세요.");
      return;
    }

    router.replace("/recruitments");
    router.refresh();
  }

  async function handleCloseRecruitment() {
    if (!recruitment || !isAuthor || recruitment.status !== "OPEN") return;
    if (!window.confirm("모집을 종료하시겠습니까?")) return;

    setCloseErrorMessage("");
    setIsClosing(true);

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setIsClosing(false);
      setCloseErrorMessage("로그인 사용자 정보를 확인하지 못했습니다.");
      return;
    }

    const { data, error } = await supabase
      .from("recruitments")
      .update({ status: "CLOSED" })
      .eq("id", recruitment.id)
      .eq("author_id", user.id)
      .select("id, status")
      .maybeSingle();

    setIsClosing(false);

    if (error || !data) {
      setCloseErrorMessage("모집 종료 처리에 실패했습니다. 다시 시도해 주세요.");
      return;
    }

    setRecruitment((current) => current ? { ...current, status: "CLOSED" } : current);
  }

  if (isLoading) return <div className="mx-auto w-full max-w-3xl px-4 py-16 text-sm text-slate-600 sm:px-6">모집글을 불러오는 중입니다.</div>;

  if (isNotFound) {
    return <div className="mx-auto w-full max-w-3xl px-4 py-16 sm:px-6"><section className="rounded-xl border border-dashed border-slate-300 bg-white px-6 py-12 text-center"><h1 className="text-lg font-semibold text-slate-950">모집글을 찾을 수 없습니다</h1><p className="mt-2 text-sm text-slate-600">존재하지 않거나 조회할 수 없는 모집글입니다.</p><Link href="/recruitments" className="mt-6 inline-flex text-sm font-medium text-blue-700 hover:text-blue-800">모임 모집으로 돌아가기</Link></section></div>;
  }

  if (errorMessage || !recruitment) return <div className="mx-auto w-full max-w-3xl px-4 py-16 sm:px-6"><p role="alert" className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">{errorMessage || "모임 모집글을 불러오지 못했습니다."}</p></div>;

  const isOpen = recruitment.status === "OPEN";

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-12 sm:px-6 sm:py-16">
      <Link href="/recruitments" className="text-sm font-medium text-slate-600 hover:text-slate-950">← 모임 모집</Link>
      <article className="mt-6 rounded-xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
        <header className="border-b border-slate-100 pb-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <div className="flex flex-wrap gap-2"><span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-700">{typeLabels[recruitment.type] ?? recruitment.type}</span><span className={`rounded-full px-2.5 py-1 text-xs font-medium ${isOpen ? "bg-emerald-100 text-emerald-700" : "bg-slate-200 text-slate-600"}`}>{isOpen ? "모집중" : "모집종료"}</span></div>
              <h1 className="mt-4 text-2xl font-bold tracking-tight text-slate-950 sm:text-3xl">{recruitment.title}</h1>
            </div>
            {(isAuthor || isAdmin) && (
              <div className="flex shrink-0 flex-wrap gap-2">
                {isAuthor && <Link href={`/recruitments/${recruitment.id}/edit`} className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">수정</Link>}
                {isAuthor && (isOpen ? (
                  <button type="button" disabled={isClosing} onClick={() => void handleCloseRecruitment()} className="rounded-lg border border-amber-300 px-3 py-2 text-sm font-medium text-amber-800 hover:bg-amber-50 disabled:cursor-not-allowed disabled:text-amber-400">{isClosing ? "종료 중..." : "모집 종료"}</button>
                ) : <span className="rounded-lg bg-slate-100 px-3 py-2 text-sm font-medium text-slate-600">모집 종료됨</span>)}
                <button type="button" disabled={isDeleting} onClick={handleDelete} className="rounded-lg border border-red-200 px-3 py-2 text-sm font-medium text-red-700 hover:bg-red-50 disabled:cursor-not-allowed disabled:text-red-300">{isDeleting ? "삭제 중..." : "삭제"}</button>
              </div>
            )}
          </div>
          <div className="mt-5 flex items-center gap-3 text-sm text-slate-600">
            {recruitment.author?.avatar_url ? <img src={recruitment.author.avatar_url} alt={`${recruitment.author.name} 프로필 이미지`} className="size-9 rounded-full border border-slate-200 object-cover" /> : <span aria-hidden="true" className="flex size-9 items-center justify-center rounded-full bg-slate-100 text-sm font-semibold text-slate-700">{recruitment.author?.name.slice(0, 1) ?? "?"}</span>}
            <div><p className="font-medium text-slate-900">{recruitment.author?.name ?? "알 수 없음"}</p><time dateTime={recruitment.created_at} className="text-xs text-slate-500">{formatDate(recruitment.created_at)}</time></div>
          </div>
        </header>
        <div className="py-8"><p className="whitespace-pre-wrap break-words text-sm leading-7 text-slate-800">{recruitment.content}</p></div>
        <dl className="grid gap-4 border-b border-slate-100 py-6 text-sm sm:grid-cols-2"><div><dt className="text-slate-500">마감</dt><dd className="mt-1 font-medium text-slate-900">{formatDeadline(recruitment.deadline)}</dd></div><div><dt className="text-slate-500">수정일</dt><dd className="mt-1 font-medium text-slate-900">{formatDate(recruitment.updated_at)}</dd></div></dl>
        <RecruitmentParticipation recruitmentId={recruitment.id} status={recruitment.status} deadline={recruitment.deadline} maxMembers={recruitment.max_members} leaderId={recruitment.author_id} />
        {closeErrorMessage && <p role="alert" className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{closeErrorMessage}</p>}
        {deleteErrorMessage && <p role="alert" className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{deleteErrorMessage}</p>}
      </article>
    </div>
  );
}
