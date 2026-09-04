"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

const types = [
  { value: "PROJECT", label: "프로젝트" },
  { value: "STUDY", label: "스터디" },
  { value: "ETC", label: "기타" },
];

type EditableRecruitment = {
  id: string;
  author_id: string;
  type: string;
  title: string;
  content: string;
  max_members: number | null;
  deadline: string | null;
};

function getMaxMembers(value: string) {
  if (!value) return { value: null, error: "" };
  const maxMembers = Number(value);
  return !Number.isInteger(maxMembers) || maxMembers < 1
    ? { value: null, error: "모집 인원은 1명 이상으로 입력해 주세요." }
    : { value: maxMembers, error: "" };
}

export default function EditRecruitmentPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [type, setType] = useState("PROJECT");
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [maxMembers, setMaxMembers] = useState("");
  const [deadline, setDeadline] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isNotFound, setIsNotFound] = useState(false);
  const [isUnauthorized, setIsUnauthorized] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loadErrorMessage, setLoadErrorMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

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
        .select("id, author_id, type, title, content, max_members, deadline")
        .eq("id", params.id)
        .single();

      if (!isMounted) return;
      if (error) {
        if (error.code === "PGRST116") setIsNotFound(true);
        else setLoadErrorMessage("모임 모집글을 불러오지 못했습니다.");
        setIsLoading(false);
        return;
      }

      const recruitment = data as EditableRecruitment;
      if (recruitment.author_id !== user.id) {
        setIsUnauthorized(true);
        setIsLoading(false);
        return;
      }

      setType(recruitment.type);
      setTitle(recruitment.title);
      setContent(recruitment.content);
      setMaxMembers(recruitment.max_members?.toString() ?? "");
      setDeadline(recruitment.deadline ?? "");
      setIsLoading(false);
    }
    void loadRecruitment();
    return () => { isMounted = false; };
  }, [params.id, router]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrorMessage("");
    const trimmedTitle = title.trim();
    const trimmedContent = content.trim();
    const maxMembersResult = getMaxMembers(maxMembers);

    if (!types.some((item) => item.value === type)) {
      setErrorMessage("올바른 모집 종류를 선택해 주세요.");
      return;
    }
    if (!trimmedTitle || !trimmedContent) {
      setErrorMessage("제목과 내용을 모두 입력해 주세요.");
      return;
    }
    if (trimmedTitle.length > 200 || trimmedContent.length > 10000) {
      setErrorMessage("제목은 200자, 내용은 10,000자 이하로 입력해 주세요.");
      return;
    }
    if (maxMembersResult.error) {
      setErrorMessage(maxMembersResult.error);
      return;
    }

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setErrorMessage("로그인 사용자 정보를 확인하지 못했습니다.");
      return;
    }

    setIsSubmitting(true);
    const { data, error } = await supabase
      .from("recruitments")
      .update({ type, title: trimmedTitle, content: trimmedContent, max_members: maxMembersResult.value, deadline: deadline || null })
      .eq("id", params.id)
      .eq("author_id", user.id)
      .select("id")
      .maybeSingle();
    setIsSubmitting(false);

    if (error || !data) {
      setErrorMessage("모임 모집글 수정에 실패했습니다. 다시 시도해 주세요.");
      return;
    }

    router.replace(`/recruitments/${params.id}`);
    router.refresh();
  }

  if (isLoading) return <div className="mx-auto w-full max-w-3xl px-4 py-16 text-sm text-slate-600 sm:px-6">모집글을 불러오는 중입니다.</div>;
  if (isNotFound || isUnauthorized) return <div className="mx-auto w-full max-w-3xl px-4 py-16 sm:px-6"><section className="rounded-xl border border-dashed border-slate-300 bg-white px-6 py-12 text-center"><h1 className="text-lg font-semibold text-slate-950">{isNotFound ? "모집글을 찾을 수 없습니다" : "수정 권한이 없습니다"}</h1><p className="mt-2 text-sm text-slate-600">{isNotFound ? "존재하지 않거나 조회할 수 없는 모집글입니다." : "작성자만 모집글을 수정할 수 있습니다."}</p><Link href={isNotFound ? "/recruitments" : `/recruitments/${params.id}`} className="mt-6 inline-flex text-sm font-medium text-blue-700 hover:text-blue-800">{isNotFound ? "모임 모집으로 돌아가기" : "모집글로 돌아가기"}</Link></section></div>;
  if (loadErrorMessage) return <div className="mx-auto w-full max-w-3xl px-4 py-16 sm:px-6"><p role="alert" className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">{loadErrorMessage}</p></div>;

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-12 sm:px-6 sm:py-16">
      <Link href={`/recruitments/${params.id}`} className="text-sm font-medium text-slate-600 hover:text-slate-950">← 모집글</Link>
      <section className="mt-6"><p className="text-sm font-semibold text-blue-700">EDIT RECRUITMENT</p><h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-950">모집글 수정</h1></section>
      <form onSubmit={handleSubmit} className="mt-8 rounded-xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        <div><label htmlFor="type" className="block text-sm font-medium text-slate-800">모집 종류</label><select id="type" value={type} onChange={(event) => setType(event.target.value)} className="mt-2 w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-950 outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100">{types.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}</select></div>
        <div className="mt-6"><label htmlFor="title" className="block text-sm font-medium text-slate-800">제목</label><input id="title" type="text" required maxLength={200} value={title} onChange={(event) => setTitle(event.target.value)} className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm text-slate-950 outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100" /><p className="mt-2 text-right text-xs text-slate-500">{title.length}/200</p></div>
        <div className="mt-6"><label htmlFor="content" className="block text-sm font-medium text-slate-800">내용</label><textarea id="content" required maxLength={10000} rows={12} value={content} onChange={(event) => setContent(event.target.value)} className="mt-2 w-full resize-y rounded-lg border border-slate-300 px-3 py-2.5 text-sm leading-6 text-slate-950 outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100" /><p className="mt-2 text-right text-xs text-slate-500">{content.length}/10,000</p></div>
        <div className="mt-6 grid gap-6 sm:grid-cols-2"><div><label htmlFor="max-members" className="block text-sm font-medium text-slate-800">최대 모집 인원 <span className="font-normal text-slate-500">(선택)</span></label><input id="max-members" type="number" min="1" step="1" value={maxMembers} onChange={(event) => setMaxMembers(event.target.value)} className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm text-slate-950 outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100" /></div><div><label htmlFor="deadline" className="block text-sm font-medium text-slate-800">마감일 <span className="font-normal text-slate-500">(선택)</span></label><input id="deadline" type="date" value={deadline} onChange={(event) => setDeadline(event.target.value)} className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm text-slate-950 outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100" /></div></div>
        {errorMessage && <p role="alert" className="mt-6 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{errorMessage}</p>}
        <div className="mt-8 flex flex-wrap justify-end gap-3"><Link href={`/recruitments/${params.id}`} className="rounded-lg border border-slate-300 px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50">취소</Link><button type="submit" disabled={isSubmitting} className="rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-slate-700 disabled:cursor-not-allowed disabled:bg-slate-400">{isSubmitting ? "수정 중..." : "수정 완료"}</button></div>
      </form>
    </div>
  );
}
