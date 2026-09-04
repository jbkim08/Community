/* eslint-disable @next/next/no-img-element -- 외부 프로필 이미지 URL은 도메인을 제한할 수 없습니다. */
"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

type Member = {
  id: string;
  name: string;
  avatar_url: string | null;
  bio: string | null;
  github_url: string | null;
  portfolio_url: string | null;
  training_course: string | null;
  training_started_at: string | null;
  training_ended_at: string | null;
  role: string;
};

function formatTrainingPeriod(member: Member) {
  if (!member.training_started_at && !member.training_ended_at) {
    return "훈련 기간 미등록";
  }

  return `${member.training_started_at ?? "미정"} ~ ${member.training_ended_at ?? "진행 중"}`;
}

export default function MemberDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [member, setMember] = useState<Member | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    let isMounted = true;

    async function loadMember() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.replace("/login");
        return;
      }

      const { data, error } = await supabase
        .from("profiles")
        .select(
          "id, name, avatar_url, bio, github_url, portfolio_url, training_course, training_started_at, training_ended_at, role",
        )
        .eq("id", params.id)
        .maybeSingle();

      if (!isMounted) {
        return;
      }

      if (error) {
        setErrorMessage("회원 프로필을 불러오지 못했습니다. 다시 시도해 주세요.");
      } else {
        setMember(data as Member | null);
      }

      setIsLoading(false);
    }

    void loadMember();

    return () => {
      isMounted = false;
    };
  }, [params.id, router]);

  if (isLoading) {
    return (
      <div className="mx-auto w-full max-w-3xl px-4 py-16 text-sm text-slate-600 sm:px-6">
        회원 프로필을 불러오는 중입니다.
      </div>
    );
  }

  if (errorMessage) {
    return (
      <div className="mx-auto w-full max-w-3xl px-4 py-16 sm:px-6">
        <p
          role="alert"
          className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700"
        >
          {errorMessage}
        </p>
      </div>
    );
  }

  if (!member) {
    return (
      <div className="mx-auto w-full max-w-3xl px-4 py-16 sm:px-6">
        <section className="rounded-xl border border-dashed border-slate-300 bg-white px-6 py-12 text-center">
          <h1 className="text-lg font-semibold text-slate-950">
            회원을 찾을 수 없습니다
          </h1>
          <p className="mt-2 text-sm text-slate-600">
            존재하지 않거나 조회할 수 없는 회원입니다.
          </p>
          <Link
            href="/members"
            className="mt-6 inline-flex text-sm font-medium text-blue-700 hover:text-blue-800"
          >
            회원목록으로 돌아가기
          </Link>
        </section>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-12 sm:px-6 sm:py-16">
      <Link
        href="/members"
        className="text-sm font-medium text-slate-600 hover:text-slate-950"
      >
        ← 회원목록
      </Link>

      <article className="mt-6 rounded-xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
        <header className="flex items-center gap-4 border-b border-slate-100 pb-6">
          {member.avatar_url ? (
            <img
              src={member.avatar_url}
              alt={`${member.name} 프로필 이미지`}
              className="size-16 rounded-full border border-slate-200 object-cover"
            />
          ) : (
            <span
              aria-hidden="true"
              className="flex size-16 items-center justify-center rounded-full bg-slate-100 text-xl font-semibold text-slate-700"
            >
              {member.name.slice(0, 1)}
            </span>
          )}

          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-2xl font-bold tracking-tight text-slate-950">
                <span className="break-words">{member.name}</span>
              </h1>
              {member.role === "ADMIN" && (
                <span className="rounded-full bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-700">
                  관리자
                </span>
              )}
            </div>
            <p className="mt-2 text-sm text-slate-600">커뮤니티 회원</p>
          </div>
        </header>

        <dl className="mt-6 grid gap-6 sm:grid-cols-2">
          <div>
            <dt className="text-sm font-medium text-slate-500">훈련과정</dt>
            <dd className="mt-1 break-words text-sm text-slate-900">
              {member.training_course ?? "훈련과정 미등록"}
            </dd>
          </div>
          <div>
            <dt className="text-sm font-medium text-slate-500">훈련 기간</dt>
            <dd className="mt-1 text-sm text-slate-900">
              {formatTrainingPeriod(member)}
            </dd>
          </div>
          <div className="sm:col-span-2">
            <dt className="text-sm font-medium text-slate-500">자기소개</dt>
            <dd className="mt-1 whitespace-pre-wrap break-words text-sm leading-6 text-slate-900">
              {member.bio || "자기소개를 등록하지 않았습니다."}
            </dd>
          </div>
        </dl>

        {(member.github_url || member.portfolio_url) && (
          <section className="mt-8 border-t border-slate-100 pt-6">
            <h2 className="text-sm font-semibold text-slate-900">링크</h2>
            <div className="mt-3 flex flex-wrap gap-3">
              {member.github_url && (
                <a
                  href={member.github_url}
                  target="_blank"
                  rel="noreferrer"
                  className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:border-slate-400 hover:bg-slate-50"
                >
                  GitHub 방문하기
                </a>
              )}
              {member.portfolio_url && (
                <a
                  href={member.portfolio_url}
                  target="_blank"
                  rel="noreferrer"
                  className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:border-slate-400 hover:bg-slate-50"
                >
                  Portfolio 방문하기
                </a>
              )}
            </div>
          </section>
        )}
      </article>
    </div>
  );
}
