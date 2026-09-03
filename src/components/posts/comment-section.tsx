"use client";
/* eslint-disable @next/next/no-img-element */

import { FormEvent, useCallback, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

type CommentAuthor = {
  id: string;
  name: string;
  avatar_url: string | null;
};

type Comment = {
  id: string;
  author_id: string;
  content: string;
  created_at: string;
  updated_at: string;
  author: CommentAuthor | null;
};

type CommentSectionProps = {
  postId: string;
  isAdmin: boolean;
};

function formatDate(date: string) {
  return new Intl.DateTimeFormat("ko-KR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(date));
}

function wasUpdated(comment: Comment) {
  return new Date(comment.updated_at).getTime() - new Date(comment.created_at).getTime() > 1000;
}

export default function CommentSection({ postId, isAdmin }: CommentSectionProps) {
  const [comments, setComments] = useState<Comment[]>([]);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [content, setContent] = useState("");
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
  const [editingContent, setEditingContent] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [updatingCommentId, setUpdatingCommentId] = useState<string | null>(null);
  const [deletingCommentId, setDeletingCommentId] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState("");

  const loadComments = useCallback(async () => {
    setIsLoading(true);

    const { data, error } = await supabase
      .from("comments")
      .select(
        "id, content, created_at, updated_at, author_id, author:profiles!comments_author_id_fkey(id, name, avatar_url)",
      )
      .eq("post_id", postId)
      .order("created_at", { ascending: true });

    if (error) {
      setErrorMessage("댓글을 불러오지 못했습니다. 다시 시도해 주세요.");
    } else {
      setComments((data ?? []) as unknown as Comment[]);
    }

    setIsLoading(false);
  }, [postId]);

  useEffect(() => {
    let isMounted = true;

    async function loadCommentSection() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (isMounted) {
        setCurrentUserId(user?.id ?? null);
      }

      await loadComments();
    }

    void loadCommentSection();

    return () => {
      isMounted = false;
    };
  }, [loadComments]);

  async function handleCreate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrorMessage("");

    const trimmedContent = content.trim();
    if (!trimmedContent) {
      setErrorMessage("댓글 내용을 입력해 주세요.");
      return;
    }

    if (trimmedContent.length > 1000) {
      setErrorMessage("댓글은 1000자 이하로 입력해 주세요.");
      return;
    }

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setErrorMessage("로그인한 회원만 댓글을 작성할 수 있습니다.");
      return;
    }

    setIsSubmitting(true);
    const { error } = await supabase.from("comments").insert({
      post_id: postId,
      author_id: user.id,
      content: trimmedContent,
    });
    setIsSubmitting(false);

    if (error) {
      setErrorMessage("댓글 등록에 실패했습니다. 다시 시도해 주세요.");
      return;
    }

    setContent("");
    await loadComments();
  }

  async function handleUpdate(comment: Comment) {
    const trimmedContent = editingContent.trim();
    setErrorMessage("");

    if (!trimmedContent) {
      setErrorMessage("댓글 내용을 입력해 주세요.");
      return;
    }

    if (trimmedContent.length > 1000) {
      setErrorMessage("댓글은 1000자 이하로 입력해 주세요.");
      return;
    }

    if (comment.author_id !== currentUserId) {
      setErrorMessage("댓글 수정 권한이 없습니다.");
      return;
    }

    setUpdatingCommentId(comment.id);
    const { data, error } = await supabase
      .from("comments")
      .update({ content: trimmedContent })
      .eq("id", comment.id)
      .eq("author_id", currentUserId)
      .select("id")
      .maybeSingle();
    setUpdatingCommentId(null);

    if (error || !data) {
      setErrorMessage("댓글 수정에 실패했습니다. 다시 시도해 주세요.");
      return;
    }

    setEditingCommentId(null);
    setEditingContent("");
    await loadComments();
  }

  async function handleDelete(comment: Comment) {
    const canDelete = comment.author_id === currentUserId || isAdmin;
    if (!canDelete) {
      return;
    }

    if (!window.confirm("댓글을 삭제하시겠습니까?")) {
      return;
    }

    setErrorMessage("");
    setDeletingCommentId(comment.id);
    const { data, error } = await supabase
      .from("comments")
      .delete()
      .eq("id", comment.id)
      .select("id")
      .maybeSingle();
    setDeletingCommentId(null);

    if (error || !data) {
      setErrorMessage("댓글 삭제에 실패했습니다. 다시 시도해 주세요.");
      return;
    }

    setComments((currentComments) =>
      currentComments.filter((currentComment) => currentComment.id !== comment.id),
    );
  }

  return (
    <section className="mt-8 rounded-xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
      <h2 className="text-lg font-semibold text-slate-950">댓글 {comments.length}</h2>

      {isLoading ? (
        <p className="mt-5 text-sm text-slate-600">댓글을 불러오는 중입니다.</p>
      ) : comments.length === 0 ? (
        <p className="mt-5 border-b border-slate-100 pb-5 text-sm text-slate-600">
          아직 댓글이 없습니다. 첫 댓글을 남겨 보세요.
        </p>
      ) : (
        <ul className="mt-5 divide-y divide-slate-100 border-y border-slate-100">
          {comments.map((comment) => {
            const isAuthor = comment.author_id === currentUserId;
            const canDelete = isAuthor || isAdmin;
            const isEditing = editingCommentId === comment.id;

            return (
              <li key={comment.id} className="py-5">
                <div className="flex items-start gap-3">
                  {comment.author?.avatar_url ? (
                    <img
                      src={comment.author.avatar_url}
                      alt={`${comment.author.name} 프로필 이미지`}
                      className="size-9 rounded-full border border-slate-200 object-cover"
                    />
                  ) : (
                    <span
                      aria-hidden="true"
                      className="flex size-9 shrink-0 items-center justify-center rounded-full bg-slate-100 text-sm font-semibold text-slate-700"
                    >
                      {comment.author?.name.slice(0, 1) ?? "?"}
                    </span>
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-slate-900">
                      {comment.author?.name ?? "알 수 없음"}
                    </p>
                    {isEditing ? (
                      <>
                        <textarea
                          value={editingContent}
                          onChange={(event) => setEditingContent(event.target.value)}
                          maxLength={1000}
                          rows={3}
                          className="mt-2 w-full resize-y rounded-lg border border-slate-300 px-3 py-2 text-sm leading-6 text-slate-950 outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
                        />
                        <div className="mt-2 flex justify-end gap-2">
                          <button
                            type="button"
                            disabled={updatingCommentId === comment.id}
                            onClick={() => void handleUpdate(comment)}
                            className="rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-slate-700 disabled:cursor-not-allowed disabled:bg-slate-400"
                          >
                            {updatingCommentId === comment.id ? "저장 중..." : "저장"}
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setEditingCommentId(null);
                              setEditingContent("");
                            }}
                            className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
                          >
                            취소
                          </button>
                        </div>
                      </>
                    ) : (
                      <p className="mt-2 whitespace-pre-wrap break-words text-sm leading-6 text-slate-800">
                        {comment.content}
                      </p>
                    )}
                    <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500">
                      <time dateTime={comment.created_at}>{formatDate(comment.created_at)}</time>
                      {wasUpdated(comment) && <span>(수정됨)</span>}
                      {!isEditing && isAuthor && (
                        <button
                          type="button"
                          onClick={() => {
                            setEditingCommentId(comment.id);
                            setEditingContent(comment.content);
                          }}
                          className="font-medium text-slate-700 hover:text-slate-950"
                        >
                          수정
                        </button>
                      )}
                      {!isEditing && canDelete && (
                        <button
                          type="button"
                          disabled={deletingCommentId === comment.id}
                          onClick={() => void handleDelete(comment)}
                          className="font-medium text-red-700 hover:text-red-800 disabled:cursor-not-allowed disabled:text-red-300"
                        >
                          {deletingCommentId === comment.id ? "삭제 중..." : "삭제"}
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      <form onSubmit={handleCreate} className="mt-6 border-t border-slate-100 pt-6">
        <label htmlFor="comment-content" className="block text-sm font-semibold text-slate-900">
          댓글 작성
        </label>
        <textarea
          id="comment-content"
          value={content}
          onChange={(event) => setContent(event.target.value)}
          maxLength={1000}
          rows={4}
          placeholder="댓글 내용을 입력하세요"
          className="mt-3 w-full resize-y rounded-lg border border-slate-300 px-3 py-2.5 text-sm leading-6 text-slate-950 outline-none placeholder:text-slate-400 focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
        />
        <p className="mt-2 text-right text-xs text-slate-500">{content.length}/1,000</p>
        {errorMessage && (
          <p role="alert" className="mt-3 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            {errorMessage}
          </p>
        )}
        <div className="mt-4 flex justify-end">
          <button
            type="submit"
            disabled={isSubmitting}
            className="rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-slate-700 disabled:cursor-not-allowed disabled:bg-slate-400"
          >
            {isSubmitting ? "등록 중..." : "댓글 등록"}
          </button>
        </div>
      </form>
    </section>
  );
}
