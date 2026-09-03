"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

const typeFilters = [
  { value: "", label: "전체" },
  { value: "PROJECT", label: "프로젝트" },
  { value: "STUDY", label: "스터디" },
  { value: "ETC", label: "기타" },
];

const statusFilters = [
  { value: "", label: "전체 상태" },
  { value: "OPEN", label: "모집중" },
  { value: "CLOSED", label: "모집종료" },
];

const typeLabels: Record<string, string> = {
  PROJECT: "프로젝트",
  STUDY: "스터디",
  ETC: "기타",
};

type Author = {
  id: string;
  name: string;
  avatar_url: string | null;
};

type RelationCount = {
  count: number;
};

type Recruitment = {
  id: string;
  type: string;
  status: string;
  title: string;
  max_members: number | null;
  deadline: string | null;
  created_at: string;
  author: Author | null;
  recruitment_members: RelationCount[];
};

function getMemberCount(recruitment: Recruitment) {
  return recruitment.recruitment_members[0]?.count ?? 0;
}

function formatDeadline(deadline: string | null) {
  return deadline ? `마감 ${deadline.replaceAll("-", ".")}` : "상시 모집";
}

function formatCreatedAt(createdAt: string) {
  return new Intl.DateTimeFormat("ko-KR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(createdAt));
}

export default function RecruitmentsPage() {
  const router = useRouter();
  const [recruitments, setRecruitments] = useState<Recruitment[]>([]);
  const [selectedType, setSelectedType] = useState("");
  const [selectedStatus, setSelectedStatus] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    let isMounted = true;

    async function loadRecruitments() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.replace("/login");
        return;
      }

      const { data, error } = await supabase
        .from("recruitments")
        .select(
          "id, type, status, title, max_members, deadline, created_at, author:profiles!recruitments_author_id_fkey(id, name, avatar_url), recruitment_members(count)",
        )
        .order("created_at", { ascending: false });

      if (!isMounted) {
        return;
      }

      if (error) {
        setErrorMessage("모임 모집글을 불러오지 못했습니다.");
      } else {
        setRecruitments((data ?? []) as unknown as Recruitment[]);
      }

      setIsLoading(false);
    }

    void loadRecruitments();

    return () => {
      isMounted = false;
    };
  }, [router]);

  const filteredRecruitments = useMemo(() => {
    const matchingRecruitments = recruitments.filter(
      (recruitment) =>
        (!selectedType || recruitment.type === selectedType) &&
        (!selectedStatus || recruitment.status === selectedStatus),
    );

    return [...matchingRecruitments].sort((firstRecruitment, secondRecruitment) => {
      const statusDifference =
        Number(secondRecruitment.status === "OPEN") -
        Number(firstRecruitment.status === "OPEN");

      if (statusDifference !== 0) {
        return statusDifference;
      }

      return new Date(secondRecruitment.created_at).getTime() - new Date(firstRecruitment.created_at).getTime();
    });
  }, [recruitments, selectedStatus, selectedType]);

  if (isLoading) {
    return (
      <div className="mx-auto w-full max-w-4xl px-4 py-16 text-sm text-slate-600 sm:px-6">
        모임 모집글을 불러오는 중입니다.
      </div>
    );
  }

  if (errorMessage) {
    return (
      <div className="mx-auto w-full max-w-4xl px-4 py-16 sm:px-6">
        <p role="alert" className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {errorMessage}
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-4xl px-4 py-12 sm:px-6 sm:py-16">
      <section className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm font-semibold text-blue-700">RECRUITMENTS</p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-950">모임 모집</h1>
          <p className="mt-3 text-sm leading-6 text-slate-600">
            프로젝트, 스터디, 기타 모임을 함께할 회원을 찾아보세요.
          </p>
        </div>
        <Link
          href="/recruitments/new"
          className="rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-slate-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
        >
          모임 모집하기
        </Link>
      </section>

      <section aria-label="모집글 필터" className="mt-8 space-y-3">
        <div className="flex flex-wrap gap-2">
          {typeFilters.map((filter) => {
            const isSelected = selectedType === filter.value;

            return (
              <button
                key={filter.value || "all-types"}
                type="button"
                aria-pressed={isSelected}
                onClick={() => setSelectedType(filter.value)}
                className={`rounded-full px-4 py-2 text-sm font-medium focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 ${
                  isSelected
                    ? "bg-slate-900 text-white"
                    : "border border-slate-300 bg-white text-slate-700 hover:border-slate-400 hover:bg-slate-50"
                }`}
              >
                {filter.label}
              </button>
            );
          })}
        </div>
        <div className="flex flex-wrap gap-2">
          {statusFilters.map((filter) => {
            const isSelected = selectedStatus === filter.value;

            return (
              <button
                key={filter.value || "all-statuses"}
                type="button"
                aria-pressed={isSelected}
                onClick={() => setSelectedStatus(filter.value)}
                className={`rounded-full px-4 py-2 text-sm font-medium focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 ${
                  isSelected
                    ? "bg-slate-900 text-white"
                    : "border border-slate-300 bg-white text-slate-700 hover:border-slate-400 hover:bg-slate-50"
                }`}
              >
                {filter.label}
              </button>
            );
          })}
        </div>
      </section>

      {filteredRecruitments.length === 0 ? (
        <section className="mt-6 rounded-xl border border-dashed border-slate-300 bg-white px-6 py-12 text-center">
          <h2 className="text-base font-semibold text-slate-900">등록된 모임 모집글이 없습니다.</h2>
        </section>
      ) : (
        <ul className="mt-6 divide-y divide-slate-200 overflow-hidden rounded-xl border border-slate-200 bg-white">
          {filteredRecruitments.map((recruitment) => {
            const memberCount = getMemberCount(recruitment);
            const isOpen = recruitment.status === "OPEN";

            return (
              <li key={recruitment.id} className="px-5 py-5 sm:px-6">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-700">
                    {typeLabels[recruitment.type] ?? recruitment.type}
                  </span>
                  <span
                    className={`rounded-full px-2.5 py-1 text-xs font-medium ${
                      isOpen ? "bg-emerald-100 text-emerald-700" : "bg-slate-200 text-slate-600"
                    }`}
                  >
                    {isOpen ? "모집중" : "모집종료"}
                  </span>
                </div>
                <h2 className="mt-3 text-lg font-semibold text-slate-950">{recruitment.title}</h2>
                <dl className="mt-4 grid gap-2 text-sm text-slate-600 sm:grid-cols-4">
                  <div>
                    <dt className="sr-only">작성자</dt>
                    <dd>작성자 {recruitment.author?.name ?? "알 수 없음"}</dd>
                  </div>
                  <div>
                    <dt className="sr-only">참여 인원</dt>
                    <dd>
                      참여 {recruitment.max_members === null
                        ? `${memberCount}명`
                        : `${memberCount} / ${recruitment.max_members}명`}
                    </dd>
                  </div>
                  <div>
                    <dt className="sr-only">마감일</dt>
                    <dd>{formatDeadline(recruitment.deadline)}</dd>
                  </div>
                  <div>
                    <dt className="sr-only">작성일</dt>
                    <dd>작성일 {formatCreatedAt(recruitment.created_at)}</dd>
                  </div>
                </dl>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
