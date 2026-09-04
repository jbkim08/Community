"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

type EditableJob = {
  id: string;
  author_id: string;
  company_name: string;
  title: string;
  location: string | null;
  description: string;
  application_url: string;
  deadline: string | null;
};

function isHttpUrl(value: string) {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

export default function EditJobPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [companyName, setCompanyName] = useState("");
  const [title, setTitle] = useState("");
  const [location, setLocation] = useState("");
  const [description, setDescription] = useState("");
  const [applicationUrl, setApplicationUrl] = useState("");
  const [deadline, setDeadline] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isNotFound, setIsNotFound] = useState(false);
  const [isUnauthorized, setIsUnauthorized] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loadErrorMessage, setLoadErrorMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

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
        .select("id, author_id, company_name, title, location, description, application_url, deadline")
        .eq("id", params.id)
        .single();

      if (!isMounted) return;
      if (error) {
        if (error.code === "PGRST116") setIsNotFound(true);
        else setLoadErrorMessage("취업정보를 불러오지 못했습니다.");
        setIsLoading(false);
        return;
      }

      const job = data as EditableJob;
      if (job.author_id !== user.id) {
        setIsUnauthorized(true);
        setIsLoading(false);
        return;
      }

      setCompanyName(job.company_name);
      setTitle(job.title);
      setLocation(job.location ?? "");
      setDescription(job.description);
      setApplicationUrl(job.application_url);
      setDeadline(job.deadline ?? "");
      setIsLoading(false);
    }

    void loadJob();
    return () => { isMounted = false; };
  }, [params.id, router]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrorMessage("");

    const trimmedCompanyName = companyName.trim();
    const trimmedTitle = title.trim();
    const trimmedDescription = description.trim();
    const trimmedApplicationUrl = applicationUrl.trim();

    if (!trimmedCompanyName || !trimmedTitle || !trimmedDescription || !trimmedApplicationUrl) {
      setErrorMessage("필수 입력 항목을 모두 입력해 주세요.");
      return;
    }
    if (trimmedCompanyName.length > 100 || trimmedTitle.length > 200 || trimmedDescription.length > 10000) {
      setErrorMessage("회사명은 100자, 제목은 200자, 설명은 10,000자 이하로 입력해 주세요.");
      return;
    }
    if (!isHttpUrl(trimmedApplicationUrl)) {
      setErrorMessage("채용공고 URL은 http 또는 https 주소로 입력해 주세요.");
      return;
    }

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setErrorMessage("로그인 사용자 정보를 확인하지 못했습니다.");
      return;
    }

    setIsSubmitting(true);
    const { data, error } = await supabase
      .from("jobs")
      .update({ company_name: trimmedCompanyName, title: trimmedTitle, location: location.trim() || null, description: trimmedDescription, application_url: trimmedApplicationUrl, deadline: deadline || null })
      .eq("id", params.id)
      .eq("author_id", user.id)
      .select("id")
      .maybeSingle();
    setIsSubmitting(false);

    if (error || !data) {
      setErrorMessage("취업정보 수정에 실패했습니다. 다시 시도해 주세요.");
      return;
    }

    router.replace(`/jobs/${params.id}`);
    router.refresh();
  }

  if (isLoading) return <div className="mx-auto w-full max-w-3xl px-4 py-16 text-sm text-slate-600 sm:px-6">취업정보를 불러오는 중입니다.</div>;
  if (isNotFound || isUnauthorized) return <div className="mx-auto w-full max-w-3xl px-4 py-16 sm:px-6"><section className="rounded-xl border border-dashed border-slate-300 bg-white px-6 py-12 text-center"><h1 className="text-lg font-semibold text-slate-950">{isNotFound ? "취업정보를 찾을 수 없습니다" : "수정 권한이 없습니다"}</h1><p className="mt-2 text-sm text-slate-600">{isNotFound ? "존재하지 않거나 조회할 수 없는 취업정보입니다." : "작성자만 취업정보를 수정할 수 있습니다."}</p><Link href={isNotFound ? "/jobs" : `/jobs/${params.id}`} className="mt-6 inline-flex text-sm font-medium text-blue-700 hover:text-blue-800">{isNotFound ? "취업정보로 돌아가기" : "취업정보로 돌아가기"}</Link></section></div>;
  if (loadErrorMessage) return <div className="mx-auto w-full max-w-3xl px-4 py-16 sm:px-6"><p role="alert" className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">{loadErrorMessage}</p></div>;

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-12 sm:px-6 sm:py-16">
      <Link href={`/jobs/${params.id}`} className="text-sm font-medium text-slate-600 hover:text-slate-950">← 취업정보</Link>
      <section className="mt-6"><p className="text-sm font-semibold text-blue-700">EDIT JOB</p><h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-950">취업정보 수정</h1></section>
      <form onSubmit={handleSubmit} className="mt-8 rounded-xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        <div className="grid gap-6 sm:grid-cols-2"><div><label htmlFor="company-name" className="block text-sm font-medium text-slate-800">회사명</label><input id="company-name" type="text" required maxLength={100} value={companyName} onChange={(event) => setCompanyName(event.target.value)} className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm text-slate-950 outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100" /><p className="mt-2 text-right text-xs text-slate-500">{companyName.length}/100</p></div><div><label htmlFor="job-title" className="block text-sm font-medium text-slate-800">채용 제목</label><input id="job-title" type="text" required maxLength={200} value={title} onChange={(event) => setTitle(event.target.value)} className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm text-slate-950 outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100" /><p className="mt-2 text-right text-xs text-slate-500">{title.length}/200</p></div></div>
        <div className="mt-6"><label htmlFor="location" className="block text-sm font-medium text-slate-800">지역 <span className="font-normal text-slate-500">(선택)</span></label><input id="location" type="text" value={location} onChange={(event) => setLocation(event.target.value)} className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm text-slate-950 outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100" /></div>
        <div className="mt-6"><label htmlFor="description" className="block text-sm font-medium text-slate-800">채용 설명</label><textarea id="description" required maxLength={10000} rows={12} value={description} onChange={(event) => setDescription(event.target.value)} className="mt-2 w-full resize-y rounded-lg border border-slate-300 px-3 py-2.5 text-sm leading-6 text-slate-950 outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100" /><p className="mt-2 text-right text-xs text-slate-500">{description.length}/10,000</p></div>
        <div className="mt-6 grid gap-6 sm:grid-cols-2"><div><label htmlFor="application-url" className="block text-sm font-medium text-slate-800">채용공고 URL</label><input id="application-url" type="url" required value={applicationUrl} onChange={(event) => setApplicationUrl(event.target.value)} className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm text-slate-950 outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100" /></div><div><label htmlFor="deadline" className="block text-sm font-medium text-slate-800">마감일 <span className="font-normal text-slate-500">(선택)</span></label><input id="deadline" type="date" value={deadline} onChange={(event) => setDeadline(event.target.value)} className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm text-slate-950 outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100" /></div></div>
        {errorMessage && <p role="alert" className="mt-6 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{errorMessage}</p>}
        <div className="mt-8 flex flex-wrap justify-end gap-3"><Link href={`/jobs/${params.id}`} className="rounded-lg border border-slate-300 px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50">취소</Link><button type="submit" disabled={isSubmitting} className="rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-slate-700 disabled:cursor-not-allowed disabled:bg-slate-400">{isSubmitting ? "수정 중..." : "수정 완료"}</button></div>
      </form>
    </div>
  );
}
