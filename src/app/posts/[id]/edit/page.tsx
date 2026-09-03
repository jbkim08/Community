"use client";
/* eslint-disable @next/next/no-img-element */

import Link from "next/link";
import { ChangeEvent, FormEvent, useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { POST_IMAGE_BUCKET, removePostImage, uploadPostImage, validatePostImage } from "@/lib/post-image";
import { supabase } from "@/lib/supabase";

const categories = [
  { value: "FREE", label: "자유" },
  { value: "QUESTION", label: "질문" },
  { value: "INFO", label: "정보" },
];

type EditablePost = {
  id: string;
  author_id: string;
  category: string;
  title: string;
  content: string;
  image_path: string | null;
};

export default function EditPostPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [category, setCategory] = useState("FREE");
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [isAdmin, setIsAdmin] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isNotFound, setIsNotFound] = useState(false);
  const [isUnauthorized, setIsUnauthorized] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loadErrorMessage, setLoadErrorMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [existingImagePath, setExistingImagePath] = useState<string | null>(null);
  const [currentImageUrl, setCurrentImageUrl] = useState("");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreviewUrl, setImagePreviewUrl] = useState("");
  const [shouldRemoveImage, setShouldRemoveImage] = useState(false);
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

    async function loadPostForEditing() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.replace("/login");
        return;
      }

      const { data, error } = await supabase
        .from("posts")
        .select("id, author_id, category, title, content, image_path")
        .eq("id", params.id)
        .single();

      if (!isMounted) {
        return;
      }

      if (error) {
        if (error.code === "PGRST116") {
          setIsNotFound(true);
        } else {
          setLoadErrorMessage("게시글을 불러오지 못했습니다. 다시 시도해 주세요.");
        }
        setIsLoading(false);
        return;
      }

      const post = data as EditablePost;

      if (post.author_id !== user.id) {
        setIsUnauthorized(true);
        setIsLoading(false);
        return;
      }

      const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .maybeSingle();

      if (!isMounted) {
        return;
      }

      setCategory(post.category);
      setTitle(post.title);
      setContent(post.content);
      setExistingImagePath(post.image_path);

      if (post.image_path) {
        const { data: signedUrlData, error: signedUrlError } = await supabase.storage
          .from(POST_IMAGE_BUCKET)
          .createSignedUrl(post.image_path, 60 * 60);

        if (!isMounted) {
          return;
        }

        if (signedUrlError || !signedUrlData?.signedUrl) {
          setErrorMessage("현재 게시글 이미지를 불러오지 못했습니다.");
        } else {
          setCurrentImageUrl(signedUrlData.signedUrl);
        }
      }

      setIsAdmin((profile as { role: string } | null)?.role === "ADMIN");
      setIsLoading(false);
    }

    void loadPostForEditing();

    return () => {
      isMounted = false;
    };
  }, [params.id, router]);

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
    setShouldRemoveImage(false);
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

    const previousImagePath = existingImagePath;
    let nextImagePath = previousImagePath;
    let uploadedImagePath: string | null = null;

    if (imageFile) {
      const { path, error: uploadError } = await uploadPostImage(user.id, imageFile);

      if (uploadError || !path) {
        setIsSubmitting(false);
        setErrorMessage("이미지 업로드에 실패했습니다. 다시 시도해 주세요.");
        return;
      }

      uploadedImagePath = path;
      nextImagePath = path;
    } else if (shouldRemoveImage) {
      nextImagePath = null;
    }

    const { data, error } = await supabase
      .from("posts")
      .update({ category, title: trimmedTitle, content: trimmedContent, image_path: nextImagePath })
      .eq("id", params.id)
      .eq("author_id", user.id)
      .select("id")
      .maybeSingle();

    setIsSubmitting(false);

    if (error || !data) {
      if (uploadedImagePath) {
        const cleanupError = await removePostImage(uploadedImagePath);
        if (cleanupError) {
          console.error("새 게시글 이미지 정리에 실패했습니다.", cleanupError);
        }
      }

      setErrorMessage("게시글 수정에 실패했습니다. 다시 시도해 주세요.");
      return;
    }

    if (previousImagePath && previousImagePath !== nextImagePath) {
      const cleanupError = await removePostImage(previousImagePath);
      if (cleanupError) {
        console.error("기존 게시글 이미지 정리에 실패했습니다.", cleanupError);
        window.alert("게시글은 수정되었지만 기존 이미지 정리에 실패했습니다.");
      }
    }

    router.replace(`/posts/${params.id}`);
    router.refresh();
  }

  if (isLoading) {
    return (
      <div className="mx-auto w-full max-w-3xl px-4 py-16 text-sm text-slate-600 sm:px-6">
        게시글을 불러오는 중입니다.
      </div>
    );
  }

  if (isNotFound || isUnauthorized) {
    return (
      <div className="mx-auto w-full max-w-3xl px-4 py-16 sm:px-6">
        <section className="rounded-xl border border-dashed border-slate-300 bg-white px-6 py-12 text-center">
          <h1 className="text-lg font-semibold text-slate-950">
            {isNotFound ? "게시글을 찾을 수 없습니다" : "수정 권한이 없습니다"}
          </h1>
          <p className="mt-2 text-sm text-slate-600">
            {isNotFound
              ? "존재하지 않거나 조회할 수 없는 게시글입니다."
              : "작성자만 게시글을 수정할 수 있습니다."}
          </p>
          <Link
            href={isNotFound ? "/posts" : `/posts/${params.id}`}
            className="mt-6 inline-flex text-sm font-medium text-blue-700 hover:text-blue-800"
          >
            {isNotFound ? "게시판으로 돌아가기" : "게시글로 돌아가기"}
          </Link>
        </section>
      </div>
    );
  }

  if (loadErrorMessage) {
    return (
      <div className="mx-auto w-full max-w-3xl px-4 py-16 sm:px-6">
        <p
          role="alert"
          className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700"
        >
          {loadErrorMessage}
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-12 sm:px-6 sm:py-16">
      <Link
        href={`/posts/${params.id}`}
        className="text-sm font-medium text-slate-600 hover:text-slate-950"
      >
        ← 게시글
      </Link>

      <section className="mt-6">
        <p className="text-sm font-semibold text-blue-700">EDIT POST</p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-950">
          게시글 수정
        </h1>
      </section>

      <form
        onSubmit={handleSubmit}
        className="mt-8 rounded-xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6"
      >
        <div>
          <label htmlFor="category" className="block text-sm font-medium text-slate-800">
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
        </div>

        <div className="mt-6">
          <label htmlFor="title" className="block text-sm font-medium text-slate-800">
            제목
          </label>
          <input
            id="title"
            type="text"
            required
            maxLength={200}
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm text-slate-950 outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
          />
          <p className="mt-2 text-right text-xs text-slate-500">{title.length}/200</p>
        </div>

        <div className="mt-6">
          <label htmlFor="content" className="block text-sm font-medium text-slate-800">
            내용
          </label>
          <textarea
            id="content"
            required
            maxLength={10000}
            rows={12}
            value={content}
            onChange={(event) => setContent(event.target.value)}
            className="mt-2 w-full resize-y rounded-lg border border-slate-300 px-3 py-2.5 text-sm leading-6 text-slate-950 outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
          />
          <p className="mt-2 text-right text-xs text-slate-500">{content.length}/10,000</p>
        </div>

        <div className="mt-6">
          <p className="text-sm font-medium text-slate-800">이미지 <span className="font-normal text-slate-500">(선택, 1장)</span></p>
          {existingImagePath && !shouldRemoveImage && (
            <div className="mt-3">
              {currentImageUrl ? (
                <img
                  src={currentImageUrl}
                  alt="현재 게시글 이미지"
                  className="max-h-80 rounded-lg border border-slate-200 object-contain"
                />
              ) : (
                <p className="text-sm text-slate-500">현재 이미지를 표시할 수 없습니다.</p>
              )}
            </div>
          )}
          {existingImagePath && (
            <label className="mt-3 flex items-center gap-2 text-sm text-slate-700">
              <input
                type="checkbox"
                checked={shouldRemoveImage}
                disabled={Boolean(imageFile)}
                onChange={(event) => setShouldRemoveImage(event.target.checked)}
              />
              기존 이미지 삭제
            </label>
          )}
          <label htmlFor="image" className="mt-4 block text-sm font-medium text-slate-800">
            새 이미지 선택
          </label>
          <input
            id="image"
            type="file"
            accept="image/jpeg,image/png,image/webp,.jpg,.jpeg,.png,.webp"
            onChange={handleImageChange}
            className="mt-2 block w-full text-sm text-slate-700 file:mr-4 file:rounded-lg file:border-0 file:bg-slate-100 file:px-3 file:py-2 file:text-sm file:font-medium file:text-slate-800 hover:file:bg-slate-200"
          />
          <p className="mt-2 text-xs text-slate-500">선택하지 않으면 기존 이미지를 유지합니다. jpg, jpeg, png, webp · 최대 5MB</p>
          {imagePreviewUrl && (
            <img
              src={imagePreviewUrl}
              alt="새 이미지 미리보기"
              className="mt-3 max-h-80 rounded-lg border border-slate-200 object-contain"
            />
          )}
        </div>

        {errorMessage && (
          <p
            role="alert"
            className="mt-6 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700"
          >
            {errorMessage}
          </p>
        )}

        <div className="mt-8 flex justify-end gap-3">
          <Link
            href={`/posts/${params.id}`}
            className="rounded-lg border border-slate-300 px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            취소
          </Link>
          <button
            type="submit"
            disabled={isSubmitting}
            className="rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-slate-700 disabled:cursor-not-allowed disabled:bg-slate-400"
          >
            {isSubmitting ? "수정 중..." : "수정 완료"}
          </button>
        </div>
      </form>
    </div>
  );
}
