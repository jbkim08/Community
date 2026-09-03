/* eslint-disable @next/next/no-img-element -- 프로필과 게시글 이미지는 Storage 또는 외부 URL입니다. */
"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

const categoryLabels: Record<string, string> = {
  NOTICE: "공지",
  FREE: "자유",
  QUESTION: "질문",
  INFO: "정보",
  JOB: "취업",
};

type Author = {
  id: string;
  name: string;
  avatar_url: string | null;
};

type Post = {
  id: string;
  category: string;
  title: string;
  content: string;
  image_path: string | null;
  created_at: string;
  author: Author | null;
};

function formatDate(createdAt: string) {
  return new Intl.DateTimeFormat("ko-KR", {
    year: "numeric",
    month: "long",
    day: "numeric",
  }).format(new Date(createdAt));
}

export default function PostDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [post, setPost] = useState<Post | null>(null);
  const [imageUrl, setImageUrl] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isNotFound, setIsNotFound] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [imageErrorMessage, setImageErrorMessage] = useState("");

  useEffect(() => {
    let isMounted = true;

    async function loadPost() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.replace("/login");
        return;
      }

      const { data, error } = await supabase
        .from("posts")
        .select(
          "id, category, title, content, image_path, created_at, author:profiles!posts_author_id_fkey(id, name, avatar_url)",
        )
        .eq("id", params.id)
        .single();

      if (!isMounted) {
        return;
      }

      if (error) {
        if (error.code === "PGRST116") {
          setIsNotFound(true);
        } else {
          setErrorMessage("게시글을 불러오지 못했습니다. 다시 시도해 주세요.");
        }
        setIsLoading(false);
        return;
      }

      const loadedPost = data as unknown as Post;
      setPost(loadedPost);

      if (loadedPost.image_path) {
        const { data: signedUrlData, error: signedUrlError } = await supabase.storage
          .from("post-images")
          .createSignedUrl(loadedPost.image_path, 60 * 60);

        if (!isMounted) {
          return;
        }

        if (signedUrlError) {
          setImageErrorMessage("게시글 이미지를 불러오지 못했습니다.");
        } else {
          setImageUrl(signedUrlData.signedUrl);
        }
      }

      if (isMounted) {
        setIsLoading(false);
      }
    }

    void loadPost();

    return () => {
      isMounted = false;
    };
  }, [params.id, router]);

  if (isLoading) {
    return (
      <div className="mx-auto w-full max-w-3xl px-4 py-16 text-sm text-slate-600 sm:px-6">
        게시글을 불러오는 중입니다.
      </div>
    );
  }

  if (isNotFound) {
    return (
      <div className="mx-auto w-full max-w-3xl px-4 py-16 sm:px-6">
        <section className="rounded-xl border border-dashed border-slate-300 bg-white px-6 py-12 text-center">
          <h1 className="text-lg font-semibold text-slate-950">
            게시글을 찾을 수 없습니다
          </h1>
          <p className="mt-2 text-sm text-slate-600">
            존재하지 않거나 조회할 수 없는 게시글입니다.
          </p>
          <Link
            href="/posts"
            className="mt-6 inline-flex text-sm font-medium text-blue-700 hover:text-blue-800"
          >
            게시판으로 돌아가기
          </Link>
        </section>
      </div>
    );
  }

  if (errorMessage || !post) {
    return (
      <div className="mx-auto w-full max-w-3xl px-4 py-16 sm:px-6">
        <p
          role="alert"
          className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700"
        >
          {errorMessage || "게시글을 불러오지 못했습니다. 다시 시도해 주세요."}
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-12 sm:px-6 sm:py-16">
      <Link
        href="/posts"
        className="text-sm font-medium text-slate-600 hover:text-slate-950"
      >
        ← 게시판
      </Link>

      <article className="mt-6 rounded-xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
        <header className="border-b border-slate-100 pb-6">
          <span
            className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${
              post.category === "NOTICE"
                ? "bg-blue-100 text-blue-700"
                : "bg-slate-100 text-slate-600"
            }`}
          >
            {categoryLabels[post.category] ?? post.category}
          </span>
          <h1 className="mt-4 text-2xl font-bold tracking-tight text-slate-950 sm:text-3xl">
            {post.title}
          </h1>
          <div className="mt-5 flex items-center gap-3 text-sm text-slate-600">
            {post.author?.avatar_url ? (
              <img
                src={post.author.avatar_url}
                alt={`${post.author.name} 프로필 이미지`}
                className="size-9 rounded-full border border-slate-200 object-cover"
              />
            ) : (
              <span
                aria-hidden="true"
                className="flex size-9 items-center justify-center rounded-full bg-slate-100 text-sm font-semibold text-slate-700"
              >
                {post.author?.name.slice(0, 1) ?? "?"}
              </span>
            )}
            <div>
              <p className="font-medium text-slate-900">
                {post.author?.name ?? "알 수 없음"}
              </p>
              <time dateTime={post.created_at} className="text-xs text-slate-500">
                {formatDate(post.created_at)}
              </time>
            </div>
          </div>
        </header>

        <div className="py-8">
          <p className="whitespace-pre-wrap break-words text-sm leading-7 text-slate-800">
            {post.content}
          </p>
        </div>

        {imageUrl && (
          <img
            src={imageUrl}
            alt={`${post.title} 이미지`}
            className="w-full rounded-lg border border-slate-200 object-cover"
          />
        )}
        {imageErrorMessage && (
          <p className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
            {imageErrorMessage}
          </p>
        )}
      </article>
    </div>
  );
}
