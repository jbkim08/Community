"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

type TrainingCourse = { id: string; name: string; started_at: string; ended_at: string; signup_enabled: boolean };

export default function EditTrainingCoursePage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [name, setName] = useState("");
  const [startedAt, setStartedAt] = useState("");
  const [endedAt, setEndedAt] = useState("");
  const [signupEnabled, setSignupEnabled] = useState(true);
  const [isLoading, setIsLoading] = useState(true);
  const [isNotFound, setIsNotFound] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    let isMounted = true;
    async function loadCourse() {
      const { data, error } = await supabase.from("training_courses").select("id, name, started_at, ended_at, signup_enabled").eq("id", params.id).maybeSingle();
      if (!isMounted) return;
      if (error) setErrorMessage("훈련과정을 불러오지 못했습니다.");
      else if (!data) setIsNotFound(true);
      else { const course = data as TrainingCourse; setName(course.name); setStartedAt(course.started_at); setEndedAt(course.ended_at); setSignupEnabled(course.signup_enabled); }
      setIsLoading(false);
    }
    void loadCourse();
    return () => { isMounted = false; };
  }, [params.id]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrorMessage("");
    const trimmedName = name.trim();
    if (!trimmedName || !startedAt || !endedAt) { setErrorMessage("과정명, 시작일, 종료일을 모두 입력해 주세요."); return; }
    if (trimmedName.length > 200) { setErrorMessage("과정명은 200자 이하로 입력해 주세요."); return; }
    if (startedAt > endedAt) { setErrorMessage("시작일은 종료일보다 늦을 수 없습니다."); return; }

    setIsSubmitting(true);
    const { data, error } = await supabase.from("training_courses").update({ name: trimmedName, started_at: startedAt, ended_at: endedAt, signup_enabled: signupEnabled }).eq("id", params.id).select("id").maybeSingle();
    setIsSubmitting(false);
    if (error || !data) { setErrorMessage(error?.code === "23505" ? "이미 등록된 훈련과정입니다." : "훈련과정 수정에 실패했습니다. 다시 시도해 주세요."); return; }
    router.replace("/admin/training-courses");
    router.refresh();
  }

  if (isLoading) return <div className="mx-auto w-full max-w-3xl px-4 py-16 text-sm text-slate-600 sm:px-6">훈련과정을 불러오는 중입니다.</div>;
  if (isNotFound) return <div className="mx-auto w-full max-w-3xl px-4 py-16 sm:px-6"><section className="rounded-xl border border-dashed border-slate-300 bg-white px-6 py-12 text-center"><h1 className="text-lg font-semibold text-slate-950">훈련과정을 찾을 수 없습니다</h1><Link href="/admin/training-courses" className="mt-6 inline-flex text-sm font-medium text-blue-700 hover:text-blue-800">훈련과정 관리로 돌아가기</Link></section></div>;

  return <div className="mx-auto w-full max-w-3xl px-4 py-12 sm:px-6 sm:py-16"><Link href="/admin/training-courses" className="text-sm font-medium text-slate-600 hover:text-slate-950">← 훈련과정 관리</Link><section className="mt-6"><p className="text-sm font-semibold text-blue-700">ADMIN</p><h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-950">훈련과정 수정</h1></section><form onSubmit={handleSubmit} className="mt-8 rounded-xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6"><div><label htmlFor="name" className="block text-sm font-medium text-slate-800">훈련과정명</label><input id="name" type="text" required maxLength={200} value={name} onChange={(event) => setName(event.target.value)} className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm text-slate-950 outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100" /><p className="mt-2 text-right text-xs text-slate-500">{name.length}/200</p></div><div className="mt-6 grid gap-6 sm:grid-cols-2"><div><label htmlFor="started-at" className="block text-sm font-medium text-slate-800">시작일</label><input id="started-at" type="date" required value={startedAt} onChange={(event) => setStartedAt(event.target.value)} className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm text-slate-950 outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100" /></div><div><label htmlFor="ended-at" className="block text-sm font-medium text-slate-800">종료일</label><input id="ended-at" type="date" required value={endedAt} onChange={(event) => setEndedAt(event.target.value)} className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm text-slate-950 outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100" /></div></div><label className="mt-6 flex items-center gap-2 text-sm text-slate-700"><input type="checkbox" checked={signupEnabled} onChange={(event) => setSignupEnabled(event.target.checked)} /> 신규 회원가입 선택에 표시</label>{errorMessage && <p role="alert" className="mt-6 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{errorMessage}</p>}<div className="mt-8 flex flex-wrap justify-end gap-3"><Link href="/admin/training-courses" className="rounded-lg border border-slate-300 px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50">취소</Link><button type="submit" disabled={isSubmitting} className="rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-slate-700 disabled:cursor-not-allowed disabled:bg-slate-400">{isSubmitting ? "수정 중..." : "수정 완료"}</button></div></form></div>;
}
