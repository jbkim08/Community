"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

type Author = {
  id: string;
  name: string;
  avatar_url: string | null;
};

type Job = {
  id: string;
  company_name: string;
  title: string;
  location: string | null;
  deadline: string | null;
  created_at: string;
  author: Author | null;
};

function getToday() {
  const today = new Date();
  const month = String(today.getMonth() + 1).padStart(2, "0");
  const date = String(today.getDate()).padStart(2, "0");

  return `${today.getFullYear()}-${month}-${date}`;
}

function formatDeadline(deadline: string | null) {
  if (!deadline) return "상시채용";

  const formattedDeadline = deadline.replaceAll("-", ".");
  return deadline < getToday() ? `마감됨 · ${formattedDeadline}` : `마감 ${formattedDeadline}`;
}

function formatCreatedAt(createdAt: string) {
  return new Intl.DateTimeFormat("ko-KR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(createdAt));
}

export default function JobsPage() {
  const router = useRouter();
  const [jobs, setJobs] = useState<Job[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    let isMounted = true;

    async function loadJobs() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.replace("/login");
        return;
      }

      const { data, error } = await supabase
        .from("jobs")
        .select(
          "id, company_name, title, location, deadline, created_at, author:profiles!jobs_author_id_fkey(id, name, avatar_url)",
        )
        .order("created_at", { ascending: false });

      if (!isMounted) return;

      if (error) {
        setErrorMessage("취업정보를 불러오지 못했습니다.");
      } else {
        setJobs((data ?? []) as unknown as Job[]);
      }

      setIsLoading(false);
    }

    void loadJobs();

    return () => {
      isMounted = false;
    };
  }, [router]);

  const filteredJobs = useMemo(() => {
    const normalizedQuery = searchQuery.trim().toLocaleLowerCase("ko-KR");

    if (!normalizedQuery) return jobs;

    return jobs.filter((job) =>
      [job.company_name, job.title, job.location ?? ""].some((value) =>
        value.toLocaleLowerCase("ko-KR").includes(normalizedQuery),
      ),
    );
  }, [jobs, searchQuery]);

  if (isLoading) {
    return (
      <div className="mx-auto w-full max-w-4xl px-4 py-16 text-sm text-slate-600 sm:px-6">
        취업정보를 불러오는 중입니다.
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
          <p className="text-sm font-semibold text-blue-700">JOBS</p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-950">취업정보</h1>
          <p className="mt-3 text-sm leading-6 text-slate-600">
            회원들과 채용공고와 취업 정보를 공유하세요.
          </p>
        </div>
        <Link
          href="/jobs/new"
          className="rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-slate-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
        >
          취업정보 등록
        </Link>
      </section>

      <div className="mt-8">
        <label htmlFor="job-search" className="sr-only">취업정보 검색</label>
        <input
          id="job-search"
          type="search"
          value={searchQuery}
          onChange={(event) => setSearchQuery(event.target.value)}
          placeholder="회사명, 채용 제목, 지역 검색"
          className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-950 outline-none placeholder:text-slate-400 focus:border-blue-600 focus:ring-2 focus:ring-blue-100 sm:max-w-md"
        />
      </div>

      {filteredJobs.length === 0 ? (
        <section className="mt-6 rounded-xl border border-dashed border-slate-300 bg-white px-6 py-12 text-center">
          <h2 className="text-base font-semibold text-slate-900">{jobs.length === 0 ? "등록된 취업정보가 없습니다." : "검색 결과가 없습니다."}</h2>
          {jobs.length === 0 && <><p className="mt-2 text-sm text-slate-600">좋은 채용공고를 알고 있다면 공유해주세요.</p><Link href="/jobs/new" className="mt-5 inline-flex text-sm font-medium text-blue-700 hover:text-blue-800">취업정보 등록</Link></>}
        </section>
      ) : (
        <ul className="mt-6 divide-y divide-slate-200 overflow-hidden rounded-xl border border-slate-200 bg-white">
          {filteredJobs.map((job) => (
            <li key={job.id} className="px-5 py-5 sm:px-6">
              <p className="text-base font-semibold text-slate-950">{job.company_name}</p>
              <h2 className="mt-2 text-lg font-semibold text-slate-950">
                <Link href={`/jobs/${job.id}`} className="hover:text-blue-700">
                  {job.title}
                </Link>
              </h2>
              <dl className="mt-4 grid gap-2 text-sm text-slate-600 sm:grid-cols-4">
                <div>
                  <dt className="sr-only">지역</dt>
                  <dd>{job.location ?? "지역 미정"}</dd>
                </div>
                <div>
                  <dt className="sr-only">마감일</dt>
                  <dd className={job.deadline && job.deadline < getToday() ? "font-medium text-rose-700" : ""}>
                    {formatDeadline(job.deadline)}
                  </dd>
                </div>
                <div>
                  <dt className="sr-only">작성자</dt>
                  <dd>작성자 {job.author?.name ?? "알 수 없음"}</dd>
                </div>
                <div>
                  <dt className="sr-only">작성일</dt>
                  <dd>작성일 {formatCreatedAt(job.created_at)}</dd>
                </div>
              </dl>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
