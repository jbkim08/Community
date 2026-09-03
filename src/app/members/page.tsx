"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

type Member = {
  id: string;
  name: string;
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

export default function MembersPage() {
  const router = useRouter();
  const [members, setMembers] = useState<Member[]>([]);
  const [selectedCourse, setSelectedCourse] = useState("");
  const [selectedYear, setSelectedYear] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    let isMounted = true;

    async function loadMembers() {
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
          "id, name, bio, github_url, portfolio_url, training_course, training_started_at, training_ended_at, role",
        )
        .order("name");

      if (!isMounted) {
        return;
      }

      if (error) {
        setErrorMessage("회원 목록을 불러오지 못했습니다. 다시 시도해 주세요.");
        setIsLoading(false);
        return;
      }

      setMembers(data as Member[]);
      setIsLoading(false);
    }

    void loadMembers();

    return () => {
      isMounted = false;
    };
  }, [router]);

  const courses = useMemo(
    () =>
      Array.from(
        new Set(
          members
            .map((member) => member.training_course)
            .filter((course): course is string => Boolean(course)),
        ),
      ).sort((first, second) => first.localeCompare(second, "ko")),
    [members],
  );

  const years = useMemo(
    () =>
      Array.from(
        new Set(
          members
            .map((member) => member.training_started_at?.slice(0, 4))
            .filter((year): year is string => Boolean(year)),
        ),
      ).sort((first, second) => second.localeCompare(first)),
    [members],
  );

  const filteredMembers = members.filter((member) => {
    const hasCourse =
      !selectedCourse || member.training_course === selectedCourse;
    const hasYear =
      !selectedYear || member.training_started_at?.startsWith(selectedYear);

    return hasCourse && hasYear;
  });

  if (isLoading) {
    return (
      <div className="mx-auto w-full max-w-5xl px-4 py-16 text-sm text-slate-600 sm:px-6">
        회원 목록을 불러오는 중입니다.
      </div>
    );
  }

  if (errorMessage) {
    return (
      <div className="mx-auto w-full max-w-5xl px-4 py-16 sm:px-6">
        <p
          role="alert"
          className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700"
        >
          {errorMessage}
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-12 sm:px-6 sm:py-16">
      <section>
        <p className="text-sm font-semibold text-blue-700">MEMBERS</p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-950">
          회원목록
        </h1>
        <p className="mt-3 text-sm leading-6 text-slate-600">
          함께 배우고 성장하는 커뮤니티 회원을 만나보세요.
        </p>
      </section>

      <section
        aria-label="회원 필터"
        className="mt-8 grid gap-4 rounded-xl border border-slate-200 bg-white p-4 sm:grid-cols-2"
      >
        <div>
          <label
            htmlFor="training-course"
            className="block text-sm font-medium text-slate-800"
          >
            훈련과정
          </label>
          <select
            id="training-course"
            value={selectedCourse}
            onChange={(event) => setSelectedCourse(event.target.value)}
            className="mt-2 w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-950 outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
          >
            <option value="">전체 훈련과정</option>
            {courses.map((course) => (
              <option key={course} value={course}>
                {course}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label
            htmlFor="training-year"
            className="block text-sm font-medium text-slate-800"
          >
            훈련 시작년도
          </label>
          <select
            id="training-year"
            value={selectedYear}
            onChange={(event) => setSelectedYear(event.target.value)}
            className="mt-2 w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-950 outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
          >
            <option value="">전체 년도</option>
            {years.map((year) => (
              <option key={year} value={year}>
                {year}년
              </option>
            ))}
          </select>
        </div>
      </section>

      <p className="mt-6 text-sm text-slate-600">
        총 <span className="font-semibold text-slate-900">{filteredMembers.length}</span>명
      </p>

      {filteredMembers.length === 0 ? (
        <section className="mt-4 rounded-xl border border-dashed border-slate-300 bg-white px-6 py-12 text-center">
          <h2 className="text-base font-semibold text-slate-900">
            조건에 맞는 회원이 없습니다
          </h2>
          <p className="mt-2 text-sm text-slate-600">
            다른 훈련과정 또는 년도를 선택해 보세요.
          </p>
        </section>
      ) : (
        <section
          aria-label="회원 목록"
          className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3"
        >
          {filteredMembers.map((member) => (
            <article
              key={member.id}
              className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm"
            >
              <div className="flex items-start gap-3">
                <span
                  aria-hidden="true"
                  className="flex size-10 shrink-0 items-center justify-center rounded-full bg-slate-100 text-sm font-semibold text-slate-700"
                >
                  {member.name.slice(0, 1)}
                </span>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <h2 className="truncate font-semibold text-slate-950">
                      {member.name}
                    </h2>
                    {member.role === "ADMIN" && (
                      <span className="rounded-full bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-700">
                        관리자
                      </span>
                    )}
                  </div>
                  <p className="mt-1 text-sm text-slate-600">
                    {member.training_course ?? "훈련과정 미등록"}
                  </p>
                </div>
              </div>

              <p className="mt-4 text-sm leading-6 text-slate-600">
                {member.bio || "자기소개를 등록하지 않았습니다."}
              </p>
              <p className="mt-4 text-xs text-slate-500">
                {formatTrainingPeriod(member)}
              </p>

              {(member.github_url || member.portfolio_url) && (
                <div className="mt-4 flex flex-wrap gap-3 text-sm font-medium">
                  {member.github_url && (
                    <a
                      href={member.github_url}
                      target="_blank"
                      rel="noreferrer"
                      className="text-blue-700 hover:text-blue-800"
                    >
                      GitHub
                    </a>
                  )}
                  {member.portfolio_url && (
                    <a
                      href={member.portfolio_url}
                      target="_blank"
                      rel="noreferrer"
                      className="text-blue-700 hover:text-blue-800"
                    >
                      Portfolio
                    </a>
                  )}
                </div>
              )}

              <Link
                href={`/members/${member.id}`}
                className="mt-5 inline-flex text-sm font-medium text-blue-700 hover:text-blue-800"
              >
                프로필 보기
              </Link>
            </article>
          ))}
        </section>
      )}
    </div>
  );
}
