"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

const types = [
  { value: "PROJECT", label: "프로젝트" },
  { value: "STUDY", label: "스터디" },
  { value: "ETC", label: "기타" },
];

function getMaxMembers(value: string) {
  if (!value) {
    return { value: null, error: "" };
  }

  const maxMembers = Number(value);
  if (!Number.isInteger(maxMembers) || maxMembers < 1) {
    return { value: null, error: "모집 인원은 1명 이상으로 입력해 주세요." };
  }

  return { value: maxMembers, error: "" };
}

export default function NewRecruitmentPage() {
  const router = useRouter();
  const [type, setType] = useState("PROJECT");
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [maxMembers, setMaxMembers] = useState("");
  const [deadline, setDeadline] = useState("");
  const [isAuthLoading, setIsAuthLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    async function checkUser() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.replace("/login");
        return;
      }

      setIsAuthLoading(false);
    }

    void checkUser();
  }, [router]);

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

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setErrorMessage("로그인 사용자 정보를 확인하지 못했습니다.");
      return;
    }

    setIsSubmitting(true);
    const { data, error } = await supabase
      .from("recruitments")
      .insert({
        author_id: user.id,
        type,
        status: "OPEN",
        title: trimmedTitle,
        content: trimmedContent,
        max_members: maxMembersResult.value,
        deadline: deadline || null,
      })
      .select("id")
      .single();
    setIsSubmitting(false);

    if (error || !data) {
      setErrorMessage("모임 모집글 작성에 실패했습니다. 다시 시도해 주세요.");
      return;
    }

    router.replace(`/recruitments/${data.id}`);
    router.refresh();
  }

  if (isAuthLoading) {
    return (
      <div className="mx-auto w-full max-w-3xl px-4 py-16 text-sm text-slate-600 sm:px-6">
        작성 권한을 확인하는 중입니다.
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-12 sm:px-6 sm:py-16">
      <Link href="/recruitments" className="text-sm font-medium text-slate-600 hover:text-slate-950">
        ← 모임 모집
      </Link>
      <section className="mt-6">
        <p className="text-sm font-semibold text-blue-700">NEW RECRUITMENT</p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-950">모임 모집하기</h1>
      </section>
      <form onSubmit={handleSubmit} className="mt-8 rounded-xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        <div>
          <label htmlFor="type" className="block text-sm font-medium text-slate-800">모집 종류</label>
          <select id="type" value={type} onChange={(event) => setType(event.target.value)} className="mt-2 w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-950 outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100">
            {types.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
          </select>
        </div>
        <div className="mt-6">
          <label htmlFor="title" className="block text-sm font-medium text-slate-800">제목</label>
          <input id="title" type="text" required maxLength={200} value={title} onChange={(event) => setTitle(event.target.value)} placeholder="모집글 제목을 입력하세요" className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm text-slate-950 outline-none placeholder:text-slate-400 focus:border-blue-600 focus:ring-2 focus:ring-blue-100" />
          <p className="mt-2 text-right text-xs text-slate-500">{title.length}/200</p>
        </div>
        <div className="mt-6">
          <label htmlFor="content" className="block text-sm font-medium text-slate-800">내용</label>
          <textarea id="content" required maxLength={10000} rows={12} value={content} onChange={(event) => setContent(event.target.value)} placeholder="모임 소개와 모집 내용을 입력하세요" className="mt-2 w-full resize-y rounded-lg border border-slate-300 px-3 py-2.5 text-sm leading-6 text-slate-950 outline-none placeholder:text-slate-400 focus:border-blue-600 focus:ring-2 focus:ring-blue-100" />
          <p className="mt-2 text-right text-xs text-slate-500">{content.length}/10,000</p>
        </div>
        <div className="mt-6 grid gap-6 sm:grid-cols-2">
          <div>
            <label htmlFor="max-members" className="block text-sm font-medium text-slate-800">최대 모집 인원 <span className="font-normal text-slate-500">(선택)</span></label>
            <input id="max-members" type="number" min="1" step="1" value={maxMembers} onChange={(event) => setMaxMembers(event.target.value)} className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm text-slate-950 outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100" />
          </div>
          <div>
            <label htmlFor="deadline" className="block text-sm font-medium text-slate-800">마감일 <span className="font-normal text-slate-500">(선택)</span></label>
            <input id="deadline" type="date" value={deadline} onChange={(event) => setDeadline(event.target.value)} className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm text-slate-950 outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100" />
          </div>
        </div>
        {errorMessage && <p role="alert" className="mt-6 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{errorMessage}</p>}
        <div className="mt-8 flex justify-end gap-3">
          <Link href="/recruitments" className="rounded-lg border border-slate-300 px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50">취소</Link>
          <button type="submit" disabled={isSubmitting} className="rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-slate-700 disabled:cursor-not-allowed disabled:bg-slate-400">{isSubmitting ? "등록 중..." : "등록하기"}</button>
        </div>
      </form>
    </div>
  );
}
