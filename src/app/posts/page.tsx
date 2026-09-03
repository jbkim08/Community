"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

const categories = [
  { value: "", label: "전체" },
  { value: "NOTICE", label: "공지" },
  { value: "FREE", label: "자유" },
  { value: "QUESTION", label: "질문" },
  { value: "INFO", label: "정보" },
  { value: "JOB", label: "취업" },
];

type Post = {
  id: string;
  category: string;
  title: string;
  created_at: string;
  profiles: {
    name: string;
  }[];
};

function formatDate(createdAt: string) {
  return new Intl.DateTimeFormat("ko-KR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(createdAt));
}

export default function PostsPage() {
  const router = useRouter();
  const [posts, setPosts] = useState<Post[]>([]);
  const [selectedCategory, setSelectedCategory] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    let isMounted = true;

    async function loadPosts() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.replace("/login");
        return;
      }

      const { data, error } = await supabase
        .from("posts")
        .select("id, category, title, created_at, profiles!posts_author_id_fkey(name)")
        .order("created_at", { ascending: false });

      if (!isMounted) {
        return;
      }

      if (error) {
        setErrorMessage("게시글을 불러오지 못했습니다. 다시 시도해 주세요.");
      } else {
        setPosts(data as Post[]);
      }

      setIsLoading(false);
    }

    void loadPosts();

    return () => {
      isMounted = false;
    };
  }, [router]);

  const filteredPosts = useMemo(
    () =>
      selectedCategory
        ? posts.filter((post) => post.category === selectedCategory)
        : posts,
    [posts, selectedCategory],
  );

  if (isLoading) {
    return (
      <div className="mx-auto w-full max-w-5xl px-4 py-16 text-sm text-slate-600 sm:px-6">
        게시글을 불러오는 중입니다.
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
        <p className="text-sm font-semibold text-blue-700">COMMUNITY</p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-950">
          게시판
        </h1>
        <p className="mt-3 text-sm leading-6 text-slate-600">
          수료생 커뮤니티의 소식과 이야기를 확인하세요.
        </p>
      </section>

      <section aria-label="게시글 카테고리" className="mt-8 flex flex-wrap gap-2">
        {categories.map((category) => {
          const isSelected = selectedCategory === category.value;

          return (
            <button
              key={category.value || "all"}
              type="button"
              aria-pressed={isSelected}
              onClick={() => setSelectedCategory(category.value)}
              className={`rounded-full px-4 py-2 text-sm font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 ${
                isSelected
                  ? "bg-slate-900 text-white"
                  : "border border-slate-300 bg-white text-slate-700 hover:border-slate-400 hover:bg-slate-50"
              }`}
            >
              {category.label}
            </button>
          );
        })}
      </section>

      <p className="mt-6 text-sm text-slate-600">
        총 <span className="font-semibold text-slate-900">{filteredPosts.length}</span>개
      </p>

      {filteredPosts.length === 0 ? (
        <section className="mt-4 rounded-xl border border-dashed border-slate-300 bg-white px-6 py-12 text-center">
          <h2 className="text-base font-semibold text-slate-900">
            게시글이 없습니다
          </h2>
          <p className="mt-2 text-sm text-slate-600">
            {selectedCategory
              ? "선택한 카테고리에 아직 게시글이 없습니다."
              : "첫 게시글이 등록되면 이곳에 표시됩니다."}
          </p>
        </section>
      ) : (
        <section aria-label="게시글 목록" className="mt-4 overflow-hidden rounded-xl border border-slate-200 bg-white">
          <div className="hidden grid-cols-[88px_minmax(0,1fr)_120px_110px] gap-4 border-b border-slate-200 bg-slate-50 px-5 py-3 text-xs font-medium text-slate-500 sm:grid">
            <span>카테고리</span>
            <span>제목</span>
            <span>작성자</span>
            <span>작성일</span>
          </div>
          <ul className="divide-y divide-slate-200">
            {filteredPosts.map((post) => (
              <li
                key={post.id}
                className={`grid gap-2 px-5 py-4 sm:grid-cols-[88px_minmax(0,1fr)_120px_110px] sm:items-center sm:gap-4 ${
                  post.category === "NOTICE" ? "bg-blue-50/50" : "bg-white"
                }`}
              >
                <span
                  className={`w-fit rounded-full px-2.5 py-1 text-xs font-medium ${
                    post.category === "NOTICE"
                      ? "bg-blue-100 text-blue-700"
                      : "bg-slate-100 text-slate-600"
                  }`}
                >
                  {categories.find((category) => category.value === post.category)
                    ?.label ?? post.category}
                </span>
                <p className="truncate font-medium text-slate-950">{post.title}</p>
                <p className="text-sm text-slate-600">
                  {post.profiles[0]?.name ?? "알 수 없음"}
                </p>
                <time dateTime={post.created_at} className="text-sm text-slate-500">
                  {formatDate(post.created_at)}
                </time>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
