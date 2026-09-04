"use client";
/* eslint-disable @next/next/no-img-element */

import Link from "next/link";
import { ChangeEvent, FormEvent, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { removePostImage, uploadPostImage, validatePostImage } from "@/lib/post-image";
import { supabase } from "@/lib/supabase";

const categories = [
  { value: "FREE", label: "자유" },
  { value: "QUESTION", label: "질문" },
  { value: "INFO", label: "정보" },
];

export default function NewPostPage() {
  const router = useRouter();
  const [category, setCategory] = useState("FREE");
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [isAdmin, setIsAdmin] = useState(false);
  const [isProfileReady, setIsProfileReady] = useState(false);
  const [isAuthLoading, setIsAuthLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreviewUrl, setImagePreviewUrl] = useState("");
  const previewUrlRef = useRef("");

  useEffect(() => {
    return () => {
      if (previewUrlRef.current) {
        URL.revokeObjectURL(previewUrlRef.current);
      }
    };
  }, []);

  useEffect(() => {
    let isMounted = true;

    async function loadAuthorRole() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.replace("/login");
        return;
      }

      const { data, error } = await supabase
        .from("profiles")
        .select("id, role")
        .eq("id", user.id)
        .maybeSingle();

      if (isMounted) {
        const profile = data as { id: string; role: string } | null;

        if (error || !profile) {
          setErrorMessage(
            "작성자 프로필이 준비되지 않았습니다. 관리자에게 프로필 migration 적용을 요청해 주세요.",
          );
        } else {
          setIsProfileReady(true);
          setIsAdmin(profile.role === "ADMIN");
        }
        setIsAuthLoading(false);
      }
    }

    void loadAuthorRole();

    return () => {
      isMounted = false;
    };
  }, [router]);

  function handleImageChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0] ?? null;

    if (previewUrlRef.current) {
      URL.revokeObjectURL(previewUrlRef.current);
      previewUrlRef.current = "";
    }

    if (!file) {
      setImageFile(null);
      setImagePreviewUrl("");
      return;
    }

    const validationMessage = validatePostImage(file);
    if (validationMessage) {
      setImageFile(null);
      setImagePreviewUrl("");
      event.target.value = "";
      setErrorMessage(validationMessage);
      return;
    }

    setErrorMessage("");
    setImageFile(file);
    const previewUrl = URL.createObjectURL(file);
    previewUrlRef.current = previewUrl;
    setImagePreviewUrl(previewUrl);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrorMessage("");

    const trimmedTitle = title.trim();
    const trimmedContent = content.trim();

    if (!trimmedTitle || !trimmedContent) {
      setErrorMessage("제목과 내용을 모두 입력해 주세요.");
      return;
    }

    setIsSubmitting(true);

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      router.replace("/login");
      return;
    }

    let uploadedImagePath: string | null = null;

    if (imageFile) {
      const { path, error: uploadError } = await uploadPostImage(user.id, imageFile);

      if (uploadError || !path) {
        setIsSubmitting(false);
        setErrorMessage("이미지 업로드에 실패했습니다. 다시 시도해 주세요.");
        return;
      }

      uploadedImagePath = path;
    }

    const { error } = await supabase.from("posts").insert({
      author_id: user.id,
      category,
      title: trimmedTitle,
      content: trimmedContent,
      image_path: uploadedImagePath,
    });

    setIsSubmitting(false);

    if (error) {
      if (uploadedImagePath) {
        const cleanupError = await removePostImage(uploadedImagePath);
        if (cleanupError) {
          console.error("업로드한 게시글 이미지 정리에 실패했습니다.", cleanupError);
        }
      }

      setErrorMessage(
        category === "NOTICE"
          ? "공지 작성 권한이 없거나 게시글 등록에 실패했습니다."
          : "게시글 등록에 실패했습니다. 다시 시도해 주세요.",
      );
      return;
    }

    router.replace("/posts");
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
      <Link
        href="/posts"
        className="text-sm font-medium text-slate-600 hover:text-slate-950"
      >
        ← 게시판
      </Link>

      <section className="mt-6">
        <p className="text-sm font-semibold text-blue-700">NEW POST</p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-950">
          게시글 작성
        </h1>
      </section>

      {!isProfileReady ? (
        <section className="mt-8 rounded-xl border border-red-200 bg-red-50 p-5 text-sm text-red-700">
          {errorMessage || "작성자 프로필을 확인하지 못했습니다. 다시 로그인해 주세요."}
        </section>
      ) : (
        <form
          onSubmit={handleSubmit}
          className="mt-8 rounded-xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6"
        >
        <div>
          <label
            htmlFor="category"
            className="block text-sm font-medium text-slate-800"
          >
            카테고리
          </label>
          <select
            id="category"
            value={category}
            onChange={(event) => setCategory(event.target.value)}
            className="mt-2 w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-950 outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
          >
            {isAdmin && <option value="NOTICE">공지</option>}
            {categories.map((item) => (
              <option key={item.value} value={item.value}>
                {item.label}
              </option>
            ))}
          </select>
          {isAdmin && category === "NOTICE" && (
            <p className="mt-2 text-xs text-blue-700">
              공지 게시글은 모든 회원에게 표시됩니다.
            </p>
          )}
        </div>

        <div className="mt-6">
          <label
            htmlFor="title"
            className="block text-sm font-medium text-slate-800"
          >
            제목
          </label>
          <input
            id="title"
            type="text"
            required
            maxLength={200}
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm text-slate-950 outline-none placeholder:text-slate-400 focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
            placeholder="게시글 제목을 입력하세요"
          />
          <p className="mt-2 text-right text-xs text-slate-500">{title.length}/200</p>
        </div>

        <div className="mt-6">
          <label htmlFor="image" className="block text-sm font-medium text-slate-800">
            이미지 <span className="font-normal text-slate-500">(선택, 1장)</span>
          </label>
          <input
            id="image"
            type="file"
            accept="image/jpeg,image/png,image/webp,.jpg,.jpeg,.png,.webp"
            onChange={handleImageChange}
            className="mt-2 block w-full text-sm text-slate-700 file:mr-4 file:rounded-lg file:border-0 file:bg-slate-100 file:px-3 file:py-2 file:text-sm file:font-medium file:text-slate-800 hover:file:bg-slate-200"
          />
          <p className="mt-2 text-xs text-slate-500">jpg, jpeg, png, webp · 최대 5MB</p>
          {imagePreviewUrl && (
            <img
              src={imagePreviewUrl}
              alt="선택한 이미지 미리보기"
              className="mt-3 h-auto max-w-full max-h-80 rounded-lg border border-slate-200 object-contain"
            />
          )}
        </div>

        <div className="mt-6">
          <label
            htmlFor="content"
            className="block text-sm font-medium text-slate-800"
          >
            내용
          </label>
          <textarea
            id="content"
            required
            maxLength={10000}
            rows={12}
            value={content}
            onChange={(event) => setContent(event.target.value)}
            className="mt-2 w-full resize-y rounded-lg border border-slate-300 px-3 py-2.5 text-sm leading-6 text-slate-950 outline-none placeholder:text-slate-400 focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
            placeholder="커뮤니티 회원과 나눌 내용을 입력하세요"
          />
          <p className="mt-2 text-right text-xs text-slate-500">{content.length}/10,000</p>
        </div>

        {errorMessage && (
          <p
            role="alert"
            className="mt-6 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700"
          >
            {errorMessage}
          </p>
        )}

        <div className="mt-8 flex flex-wrap justify-end gap-3">
          <Link
            href="/posts"
            className="rounded-lg border border-slate-300 px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            취소
          </Link>
          <button
            type="submit"
            disabled={isSubmitting}
            className="rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-slate-700 disabled:cursor-not-allowed disabled:bg-slate-400"
          >
            {isSubmitting ? "등록 중..." : "등록하기"}
          </button>
        </div>
        </form>
      )}
    </div>
  );
}
