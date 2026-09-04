"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

const categoryLabels: Record<string, string> = { NOTICE: "공지", FREE: "자유", QUESTION: "질문", INFO: "정보" };
const recruitmentTypeLabels: Record<string, string> = { PROJECT: "프로젝트", STUDY: "스터디", ETC: "기타" };

type Author = { id: string; name: string; avatar_url: string | null };
type RelationCount = { count: number };
type Post = { id: string; category: string; title: string; created_at: string; author: Author | null; comments: RelationCount[]; post_likes: RelationCount[] };
type Recruitment = { id: string; type: string; title: string; max_members: number | null; deadline: string | null; author: Author | null; recruitment_members: RelationCount[] };
type Job = { id: string; company_name: string; title: string; location: string | null; deadline: string | null };
type CommunityCounts = { members: number; posts: number; openRecruitments: number; jobs: number };

function getToday() {
  const today = new Date();
  return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
}

function getRelationCount(items: RelationCount[]) { return items[0]?.count ?? 0; }

function formatCreatedAt(createdAt: string) {
  return new Intl.DateTimeFormat("ko-KR", { month: "2-digit", day: "2-digit" }).format(new Date(createdAt));
}

function formatDeadline(deadline: string | null) { return deadline ? `마감 ${deadline.replaceAll("-", ".")}` : "상시 모집"; }

export default function Home() {
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [posts, setPosts] = useState<Post[]>([]);
  const [recruitments, setRecruitments] = useState<Recruitment[]>([]);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [counts, setCounts] = useState<CommunityCounts>({ members: 0, posts: 0, openRecruitments: 0, jobs: 0 });
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    let isMounted = true;

    async function loadHome() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!isMounted) return;
      if (!user) {
        setIsAuthenticated(false);
        setIsLoading(false);
        return;
      }

      setIsAuthenticated(true);
      const today = getToday();
      const [postsResult, recruitmentsResult, jobsResult, membersCountResult, postsCountResult, openRecruitmentsCountResult, jobsCountResult] = await Promise.all([
        supabase.from("posts").select("id, category, title, created_at, author:profiles!posts_author_id_fkey(id, name, avatar_url), comments(count), post_likes(count)").order("created_at", { ascending: false }).limit(5),
        supabase.from("recruitments").select("id, type, title, max_members, deadline, author:profiles!recruitments_author_id_fkey(id, name, avatar_url), recruitment_members(count)").eq("status", "OPEN").order("created_at", { ascending: false }).limit(4),
        supabase.from("jobs").select("id, company_name, title, location, deadline").or(`deadline.is.null,deadline.gte.${today}`).order("created_at", { ascending: false }).limit(4),
        supabase.from("profiles").select("id", { count: "exact", head: true }),
        supabase.from("posts").select("id", { count: "exact", head: true }),
        supabase.from("recruitments").select("id", { count: "exact", head: true }).eq("status", "OPEN"),
        supabase.from("jobs").select("id", { count: "exact", head: true }),
      ]);

      if (!isMounted) return;
      if (postsResult.error || recruitmentsResult.error || jobsResult.error || membersCountResult.error || postsCountResult.error || openRecruitmentsCountResult.error || jobsCountResult.error) {
        setErrorMessage("메인 정보를 불러오지 못했습니다. 다시 시도해 주세요.");
        setIsLoading(false);
        return;
      }

      setPosts((postsResult.data ?? []) as unknown as Post[]);
      setRecruitments((recruitmentsResult.data ?? []) as unknown as Recruitment[]);
      setJobs((jobsResult.data ?? []) as unknown as Job[]);
      setCounts({ members: membersCountResult.count ?? 0, posts: postsCountResult.count ?? 0, openRecruitments: openRecruitmentsCountResult.count ?? 0, jobs: jobsCountResult.count ?? 0 });
      setIsLoading(false);
    }

    void loadHome();
    return () => { isMounted = false; };
  }, []);

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-10 sm:px-6 sm:py-16">
      <section className="rounded-2xl bg-slate-950 px-6 py-10 text-white sm:px-10 sm:py-12">
        <p className="text-sm font-semibold text-blue-300">DEVELOPER COMMUNITY</p>
        <h1 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">수업이 끝난 뒤에도<br />함께 공부하고 프로젝트하고 성장해요.</h1>
        <p className="mt-5 max-w-2xl text-base leading-7 text-slate-300">수료생 개발자 커뮤니티에서 소식과 경험을 나누고 새로운 기회를 찾아보세요.</p>
        <div className="mt-7 flex flex-wrap gap-3">
          <Link href="/posts" className="rounded-lg bg-white px-4 py-2.5 text-sm font-medium text-slate-950 hover:bg-slate-100">게시판 보기</Link>
          <Link href="/recruitments" className="rounded-lg border border-slate-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-slate-800">모임 찾기</Link>
          {!isAuthenticated && !isLoading && <Link href="/login" className="rounded-lg border border-blue-400 px-4 py-2.5 text-sm font-medium text-blue-100 hover:bg-slate-800">로그인</Link>}
        </div>
      </section>

      {isLoading ? <p className="py-12 text-sm text-slate-600">커뮤니티 정보를 불러오는 중입니다.</p> : errorMessage ? <p role="alert" className="mt-8 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">{errorMessage}</p> : !isAuthenticated ? (
        <section className="mt-8 rounded-xl border border-slate-200 bg-white px-6 py-10 text-center"><h2 className="text-lg font-semibold text-slate-900">로그인하고 커뮤니티 소식을 확인하세요.</h2><Link href="/login" className="mt-5 inline-flex text-sm font-medium text-blue-700 hover:text-blue-800">로그인하기</Link></section>
      ) : (
        <>
          <section aria-label="커뮤니티 현황" className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-4">
            {[{ label: "회원", value: counts.members, unit: "명" }, { label: "게시글", value: counts.posts, unit: "개" }, { label: "모집중", value: counts.openRecruitments, unit: "개" }, { label: "취업정보", value: counts.jobs, unit: "개" }].map((item) => <div key={item.label} className="rounded-xl border border-slate-200 bg-white px-4 py-4"><p className="text-sm text-slate-500">{item.label}</p><p className="mt-1 text-xl font-bold tracking-tight text-slate-950">{item.value}{item.unit}</p></div>)}
          </section>

          <section className="mt-10">
            <div className="flex items-center justify-between gap-4"><h2 className="text-xl font-bold tracking-tight text-slate-950">최근 게시글</h2><Link href="/posts" className="text-sm font-medium text-blue-700 hover:text-blue-800">게시판 전체보기</Link></div>
            {posts.length === 0 ? <p className="mt-4 rounded-xl border border-dashed border-slate-300 bg-white px-5 py-8 text-sm text-slate-600">아직 등록된 게시글이 없습니다.</p> : <ul className="mt-4 divide-y divide-slate-200 overflow-hidden rounded-xl border border-slate-200 bg-white">{posts.map((post) => { const commentCount = getRelationCount(post.comments); const likeCount = getRelationCount(post.post_likes); return <li key={post.id} className="grid gap-2 px-5 py-4 sm:grid-cols-[76px_minmax(0,1fr)_120px_70px_58px] sm:items-center sm:gap-4"><span className="w-fit rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-700">{categoryLabels[post.category] ?? post.category}</span><Link href={`/posts/${post.id}`} className="min-w-0 truncate font-medium text-slate-950 hover:text-blue-700">{post.title}{commentCount > 0 && <span className="ml-1.5 text-sm font-normal text-slate-500">[{commentCount}]</span>}</Link><span className="text-sm text-slate-600">{post.author?.name ?? "알 수 없음"}</span><time dateTime={post.created_at} className="text-sm text-slate-500">{formatCreatedAt(post.created_at)}</time><span className="text-sm text-slate-600 sm:text-right">♥ {likeCount}</span></li>; })}</ul>}
          </section>

          <section className="mt-10">
            <div className="flex items-center justify-between gap-4"><h2 className="text-xl font-bold tracking-tight text-slate-950">모임 모집</h2><Link href="/recruitments" className="text-sm font-medium text-blue-700 hover:text-blue-800">모임 전체보기</Link></div>
            {recruitments.length === 0 ? <p className="mt-4 rounded-xl border border-dashed border-slate-300 bg-white px-5 py-8 text-sm text-slate-600">현재 모집중인 모임이 없습니다.</p> : <ul className="mt-4 grid gap-4 sm:grid-cols-2">{recruitments.map((recruitment) => { const memberCount = getRelationCount(recruitment.recruitment_members); return <li key={recruitment.id}><Link href={`/recruitments/${recruitment.id}`} className="block h-full rounded-xl border border-slate-200 bg-white p-5 hover:border-slate-300 hover:bg-slate-50"><span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-700">{recruitmentTypeLabels[recruitment.type] ?? recruitment.type}</span><h3 className="mt-3 font-semibold text-slate-950">{recruitment.title}</h3><p className="mt-4 text-sm text-slate-600">참여 {recruitment.max_members === null ? `${memberCount}명` : `${memberCount} / ${recruitment.max_members}명`}</p><p className="mt-1 text-sm text-slate-600">작성자 {recruitment.author?.name ?? "알 수 없음"}</p><p className="mt-1 text-sm text-slate-500">{formatDeadline(recruitment.deadline)}</p></Link></li>; })}</ul>}
          </section>

          <section className="mt-10">
            <div className="flex items-center justify-between gap-4"><h2 className="text-xl font-bold tracking-tight text-slate-950">최근 취업정보</h2><Link href="/jobs" className="text-sm font-medium text-blue-700 hover:text-blue-800">취업정보 전체보기</Link></div>
            {jobs.length === 0 ? <p className="mt-4 rounded-xl border border-dashed border-slate-300 bg-white px-5 py-8 text-sm text-slate-600">등록된 취업정보가 없습니다.</p> : <ul className="mt-4 grid gap-4 sm:grid-cols-2">{jobs.map((job) => <li key={job.id}><Link href={`/jobs/${job.id}`} className="block h-full rounded-xl border border-slate-200 bg-white p-5 hover:border-slate-300 hover:bg-slate-50"><p className="font-semibold text-slate-950">{job.company_name}</p><h3 className="mt-2 font-medium text-slate-800">{job.title}</h3><p className="mt-4 text-sm text-slate-600">{job.location ?? "지역 미정"}</p><p className="mt-1 text-sm text-slate-500">{formatDeadline(job.deadline)}</p></Link></li>)}</ul>}
          </section>
        </>
      )}
    </div>
  );
}
