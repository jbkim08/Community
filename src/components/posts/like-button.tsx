"use client";

import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

type LikeButtonProps = {
  postId: string;
};

type PostLike = {
  profile_id: string;
};

export default function LikeButton({ postId }: LikeButtonProps) {
  const [likeCount, setLikeCount] = useState(0);
  const [isLiked, setIsLiked] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loadErrorMessage, setLoadErrorMessage] = useState("");
  const [actionErrorMessage, setActionErrorMessage] = useState("");

  const loadLikes = useCallback(async (userId: string | null) => {
    setIsLoading(true);
    setLoadErrorMessage("");

    const { data, error } = await supabase
      .from("post_likes")
      .select("profile_id")
      .eq("post_id", postId);

    if (error) {
      setLoadErrorMessage("좋아요 정보를 불러오지 못했습니다.");
      setIsLoading(false);
      return false;
    }

    const likes = (data ?? []) as PostLike[];
    setLikeCount(likes.length);
    setIsLiked(Boolean(userId && likes.some((like) => like.profile_id === userId)));
    setIsLoading(false);
    return true;
  }, [postId]);

  useEffect(() => {
    let isMounted = true;

    async function loadLikeButton() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!isMounted) {
        return;
      }

      const userId = user?.id ?? null;
      await loadLikes(userId);
    }

    void loadLikeButton();

    return () => {
      isMounted = false;
    };
  }, [loadLikes]);

  async function handleLikeToggle() {
    setActionErrorMessage("");

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setActionErrorMessage("로그인한 회원만 좋아요를 누를 수 있습니다.");
      return;
    }

    setIsSubmitting(true);

    if (isLiked) {
      const { data, error } = await supabase
        .from("post_likes")
        .delete()
        .eq("post_id", postId)
        .eq("profile_id", user.id)
        .select("id")
        .maybeSingle();

      setIsSubmitting(false);

      if (error || !data) {
        await loadLikes(user.id);
        setActionErrorMessage("좋아요 취소에 실패했습니다. 다시 시도해 주세요.");
        return;
      }
    } else {
      const { error } = await supabase.from("post_likes").insert({
        post_id: postId,
        profile_id: user.id,
      });

      setIsSubmitting(false);

      if (error) {
        await loadLikes(user.id);
        setActionErrorMessage(
          error.code === "23505"
            ? "이미 좋아요를 누른 게시글입니다."
            : "좋아요 등록에 실패했습니다. 다시 시도해 주세요.",
        );
        return;
      }
    }

    await loadLikes(user.id);
  }

  return (
    <section className="mt-6 border-t border-slate-100 pt-6">
      <button
        type="button"
        disabled={isLoading || isSubmitting}
        onClick={() => void handleLikeToggle()}
        className={`rounded-lg border px-4 py-2.5 text-sm font-medium disabled:cursor-not-allowed disabled:border-slate-200 disabled:bg-slate-100 disabled:text-slate-400 ${
          isLiked
            ? "border-red-200 bg-red-50 text-red-700 hover:bg-red-100"
            : "border-slate-300 text-slate-700 hover:bg-slate-50"
        }`}
      >
        {isLoading ? "좋아요 확인 중..." : `${isLiked ? "♥" : "♡"} 좋아요 ${likeCount}`}
      </button>
      {loadErrorMessage && (
        <p role="alert" className="mt-3 text-sm text-red-700">
          {loadErrorMessage}
        </p>
      )}
      {actionErrorMessage && (
        <p role="alert" className="mt-3 text-sm text-red-700">
          {actionErrorMessage}
        </p>
      )}
    </section>
  );
}
