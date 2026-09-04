/* eslint-disable @next/next/no-img-element -- 프로필 이미지는 사용자가 등록한 외부 URL일 수 있습니다. */
"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabase";

const PAGE_SIZE = 10;
const categories = [
  { value: "", label: "전체" },
  { value: "NOTICE", label: "공지" },
  { value: "FREE", label: "자유" },
  { value: "QUESTION", label: "질문" },
  { value: "INFO", label: "정보" },
];

type Profile = { id: string; name: string; avatar_url: string | null };
type RelationCount = { count: number };
type Post = {
  id: string; category: string; title: string; created_at: string;
  author: Profile | null; comments: RelationCount[]; post_likes: RelationCount[];
};

function getRelationCount(items: RelationCount[]) { return items[0]?.count ?? 0; }
function formatDate(createdAt: string) {
  return new Intl.DateTimeFormat("ko-KR", { year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date(createdAt));
}
function getCategoryLabel(category: string) { return categories.find((item) => item.value === category)?.label ?? category; }
function getPage(value: string | null) {
  const page = Number(value);
  return Number.isInteger(page) && page > 0 ? page : 1;
}
function getPostsUrl(category: string, page: number) {
  const params = new URLSearchParams();
  if (category) params.set("category", category);
  params.set("page", String(page));
  return `/posts?${params.toString()}`;
}

export default function PostsPage() {
  return <Suspense fallback={<LoadingPosts />}><PostsContent /></Suspense>;
}

function PostsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const rawCategory = searchParams.get("category") ?? "";
  const selectedCategory = categories.some((category) => category.value === rawCategory) ? rawCategory : "";
  const currentPage = getPage(searchParams.get("page"));
  const [posts, setPosts] = useState<Post[]>([]);
  const [notices, setNotices] = useState<Post[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    let isMounted = true;
    async function loadPosts() {
      setIsLoading(true);
      setErrorMessage("");
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.replace("/login"); return; }

      const postSelect = "id, category, title, created_at, author:profiles!posts_author_id_fkey(id, name, avatar_url), comments(count), post_likes(count)";
      const shouldShowNotices = !selectedCategory || selectedCategory === "NOTICE";
      const noticesRequest = shouldShowNotices
        ? supabase.from("posts").select(postSelect).eq("category", "NOTICE").order("created_at", { ascending: false })
        : Promise.resolve({ data: [], error: null });

      let regularQuery = supabase.from("posts").select(postSelect, { count: "exact" }).neq("category", "NOTICE").order("created_at", { ascending: false });
      if (selectedCategory && selectedCategory !== "NOTICE") regularQuery = regularQuery.eq("category", selectedCategory);
      const from = (currentPage - 1) * PAGE_SIZE;
      const regularRequest = selectedCategory === "NOTICE"
        ? Promise.resolve({ data: [], count: 0, error: null })
        : regularQuery.range(from, from + PAGE_SIZE - 1);
      const [noticesResult, regularResult] = await Promise.all([noticesRequest, regularRequest]);
      if (!isMounted) return;

      if (noticesResult.error || regularResult.error) {
        setErrorMessage("게시글을 불러오지 못했습니다. 다시 시도해 주세요.");
        setIsLoading(false);
        return;
      }

      const count = regularResult.count ?? 0;
      const totalPages = Math.max(1, Math.ceil(count / PAGE_SIZE));
      if (count > 0 && currentPage > totalPages) {
        router.replace(getPostsUrl(selectedCategory, totalPages));
        return;
      }

      setNotices((noticesResult.data ?? []) as unknown as Post[]);
      setPosts((regularResult.data ?? []) as unknown as Post[]);
      setTotalCount(count);
      setIsLoading(false);
    }
    void loadPosts();
    return () => { isMounted = false; };
  }, [currentPage, router, selectedCategory]);

  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));
  const pageNumbers = useMemo(() => Array.from({ length: totalPages }, (_, index) => index + 1), [totalPages]);
  const showNotices = !selectedCategory || selectedCategory === "NOTICE";
  const displayedPosts = showNotices ? [...notices, ...posts] : posts;
  const displayedPostCount = showNotices ? notices.length + totalCount : totalCount;

  function moveToPage(page: number) { router.push(getPostsUrl(selectedCategory, page)); }
  function changeCategory(category: string) { router.push(getPostsUrl(category, 1)); }

  if (isLoading) return <LoadingPosts />;
  if (errorMessage) return <div className="mx-auto w-full max-w-5xl px-4 py-16 sm:px-6"><p role="alert" className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">{errorMessage}</p></div>;

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-12 sm:px-6 sm:py-16">
      <section className="flex flex-wrap items-end justify-between gap-4">
        <div><p className="text-sm font-semibold text-blue-700">COMMUNITY</p><h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-950">게시판</h1><p className="mt-3 text-sm leading-6 text-slate-600">수료생 커뮤니티의 소식과 이야기를 확인하세요.</p></div>
        <Link href="/posts/new" className="rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-slate-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600">글쓰기</Link>
      </section>

      <section aria-label="게시글 카테고리" className="mt-8 flex flex-wrap gap-2">
        {categories.map((category) => {
          const isSelected = selectedCategory === category.value;
          return <button key={category.value || "all"} type="button" aria-pressed={isSelected} onClick={() => changeCategory(category.value)} className={`rounded-full px-4 py-2 text-sm font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 ${isSelected ? "bg-slate-900 text-white" : "border border-slate-300 bg-white text-slate-700 hover:border-slate-400 hover:bg-slate-50"}`}>{category.label}</button>;
        })}
      </section>

      <p className="mt-6 text-sm text-slate-600">게시글 <span className="font-semibold text-slate-900">{displayedPostCount}</span>개</p>
      {displayedPosts.length === 0 ? <EmptyPosts /> : <PostList posts={displayedPosts} />}

      {selectedCategory !== "NOTICE" && <>
        {totalCount > 0 && <nav aria-label="게시글 페이지" className="mt-6 flex flex-wrap items-center justify-center gap-2">
          <PaginationButton label="이전" disabled={currentPage === 1} onClick={() => moveToPage(currentPage - 1)} />
          {pageNumbers.map((page) => <button key={page} type="button" aria-current={currentPage === page ? "page" : undefined} onClick={() => moveToPage(page)} className={`min-h-10 min-w-10 rounded-lg px-3 text-sm font-medium ${currentPage === page ? "bg-slate-900 text-white" : "border border-slate-300 bg-white text-slate-700 hover:bg-slate-50"}`}>{page}</button>)}
          <PaginationButton label="다음" disabled={currentPage === totalPages} onClick={() => moveToPage(currentPage + 1)} />
        </nav>}
      </>}
    </div>
  );
}

function LoadingPosts() { return <div className="mx-auto w-full max-w-5xl px-4 py-16 text-sm text-slate-600 sm:px-6">게시글을 불러오는 중입니다.</div>; }
function EmptyPosts() { return <section className="mt-4 rounded-xl border border-dashed border-slate-300 bg-white px-6 py-12 text-center"><h2 className="text-base font-semibold text-slate-900">게시글이 없습니다</h2><p className="mt-2 text-sm text-slate-600">등록된 게시글이 없습니다.</p></section>; }
function PaginationButton({ label, disabled, onClick }: { label: string; disabled: boolean; onClick: () => void }) { return <button type="button" disabled={disabled} onClick={onClick} className="min-h-10 rounded-lg border border-slate-300 bg-white px-3 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:border-slate-200 disabled:bg-slate-50 disabled:text-slate-400">{label}</button>; }
function PostList({ posts }: { posts: Post[] }) {
  return <section aria-label="게시글 목록" className="mt-4 overflow-hidden rounded-xl border border-slate-200 bg-white">
    <div className="hidden grid-cols-[88px_minmax(0,1fr)_120px_110px_56px] gap-4 border-b border-slate-200 bg-slate-50 px-5 py-3 text-xs font-medium text-slate-500 sm:grid"><span>카테고리</span><span>제목</span><span>작성자</span><span>작성일</span><span className="text-right">추천</span></div>
    <ul className="divide-y divide-slate-200">{posts.map((post) => {
      const commentCount = getRelationCount(post.comments); const likeCount = getRelationCount(post.post_likes);
      return <li key={post.id} className={`grid gap-2 px-5 py-4 sm:grid-cols-[88px_minmax(0,1fr)_120px_110px_56px] sm:items-center sm:gap-4 ${post.category === "NOTICE" ? "bg-blue-50/50" : "bg-white"}`}>
        <span className={`w-fit rounded-full px-2.5 py-1 text-xs font-medium ${post.category === "NOTICE" ? "bg-blue-100 text-blue-700" : "bg-slate-100 text-slate-600"}`}>{getCategoryLabel(post.category)}</span>
        <Link href={`/posts/${post.id}`} className="flex min-w-0 items-center gap-1.5 font-medium text-slate-950 hover:text-blue-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"><span className="truncate">{post.title}</span>{commentCount > 0 && <span className="shrink-0 text-sm font-normal text-slate-500">[{commentCount}]</span>}</Link>
        <div className="flex min-w-0 items-center gap-2 text-sm text-slate-600">{post.author?.avatar_url ? <img src={post.author.avatar_url} alt="" className="size-6 shrink-0 rounded-full border border-slate-200 object-cover" /> : <span aria-hidden="true" className="flex size-6 shrink-0 items-center justify-center rounded-full bg-slate-100 text-xs font-semibold text-slate-600">{post.author?.name.slice(0, 1) ?? "?"}</span>}<span className="truncate">{post.author?.name ?? "알 수 없음"}</span></div>
        <time dateTime={post.created_at} className="text-sm text-slate-500">{formatDate(post.created_at)}</time><span className="text-sm text-slate-600 sm:text-right"><span className="sm:hidden">추천 </span>{likeCount}</span>
      </li>;
    })}</ul>
  </section>;
}
