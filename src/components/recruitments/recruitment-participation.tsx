"use client";
/* eslint-disable @next/next/no-img-element */

import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

type MemberProfile = { id: string; name: string; avatar_url: string | null };
type RecruitmentMember = { id: string; profile_id: string; member: MemberProfile | null };

type RecruitmentParticipationProps = {
  recruitmentId: string;
  status: string;
  deadline: string | null;
  maxMembers: number | null;
  leaderId: string;
};

function getToday() {
  const today = new Date();
  const month = String(today.getMonth() + 1).padStart(2, "0");
  const date = String(today.getDate()).padStart(2, "0");
  return `${today.getFullYear()}-${month}-${date}`;
}

export default function RecruitmentParticipation({
  recruitmentId,
  status,
  deadline,
  maxMembers,
  leaderId,
}: RecruitmentParticipationProps) {
  const [members, setMembers] = useState<RecruitmentMember[]>([]);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const loadMembers = useCallback(async () => {
    const { data, error } = await supabase
      .from("recruitment_members")
      .select("id, profile_id, member:profiles!recruitment_members_profile_id_fkey(id, name, avatar_url)")
      .eq("recruitment_id", recruitmentId)
      .order("created_at", { ascending: true });

    if (error) {
      setErrorMessage("참여 회원 목록을 불러오지 못했습니다.");
      return false;
    }

    setMembers((data ?? []) as unknown as RecruitmentMember[]);
    return true;
  }, [recruitmentId]);

  useEffect(() => {
    let isMounted = true;

    async function loadParticipation() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!isMounted) return;

      setCurrentUserId(user?.id ?? null);
      await loadMembers();
      if (isMounted) setIsLoading(false);
    }

    void loadParticipation();
    return () => { isMounted = false; };
  }, [loadMembers]);

  const isParticipating = Boolean(currentUserId && members.some((member) => member.profile_id === currentUserId));
  const isLeader = currentUserId === leaderId;
  const isClosed = status !== "OPEN";
  const isDeadlinePassed = Boolean(deadline && deadline < getToday());
  const isFull = maxMembers !== null && members.length >= maxMembers;

  function getUnavailableMessage() {
    if (isClosed) return "모집이 종료되었습니다.";
    if (isDeadlinePassed) return "마감일이 지난 모집글입니다.";
    if (isFull) return "모집 인원이 마감되었습니다.";
    return "";
  }

  async function handleParticipation() {
    setErrorMessage("");
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setErrorMessage("로그인 사용자 정보를 확인하지 못했습니다.");
      return;
    }

    setCurrentUserId(user.id);
    setIsSubmitting(true);

    if (isParticipating) {
      const { data, error } = await supabase
        .from("recruitment_members")
        .delete()
        .eq("recruitment_id", recruitmentId)
        .eq("profile_id", user.id)
        .select("id")
        .maybeSingle();
      setIsSubmitting(false);

      if (error || !data) {
        await loadMembers();
        setErrorMessage("참여 취소에 실패했습니다. 다시 시도해 주세요.");
        return;
      }
    } else {
      const { error } = await supabase.from("recruitment_members").insert({
        recruitment_id: recruitmentId,
        profile_id: user.id,
      });
      setIsSubmitting(false);

      if (error) {
        await loadMembers();
        setErrorMessage(
          error.code === "23505"
            ? "이미 참여 중인 모집글입니다."
            : "모집 참여에 실패했습니다. 다시 시도해 주세요.",
        );
        return;
      }
    }

    await loadMembers();
  }

  const unavailableMessage = getUnavailableMessage();
  const isDisabled = isLoading || isSubmitting || (!isParticipating && Boolean(unavailableMessage));

  return (
    <section className="border-b border-slate-100 py-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-base font-semibold text-slate-900">현재 참여</h2>
          <p className="mt-1 text-sm text-slate-600">
            {maxMembers === null ? `${members.length}명 참여` : `${members.length} / ${maxMembers}명`}
          </p>
        </div>
        {!isLeader && (
          <button
            type="button"
            disabled={isDisabled}
            onClick={() => void handleParticipation()}
            className="rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-slate-700 disabled:cursor-not-allowed disabled:bg-slate-400"
          >
            {isSubmitting ? "처리 중..." : isParticipating ? "참여 취소" : "참여하기"}
          </button>
        )}
      </div>
      {unavailableMessage && !isParticipating && <p className="mt-3 text-sm text-amber-700">{unavailableMessage}</p>}
      {errorMessage && <p role="alert" className="mt-3 text-sm text-red-700">{errorMessage}</p>}

      <div className="mt-6">
        <h2 className="text-base font-semibold text-slate-900">
          참여 회원 {maxMembers === null ? `${members.length}명` : `${members.length} / ${maxMembers}명`}
        </h2>
        {isLoading ? (
          <p className="mt-3 text-sm text-slate-600">참여 회원을 불러오는 중입니다.</p>
        ) : members.length === 0 ? (
          <p className="mt-3 text-sm text-slate-600">아직 참여한 회원이 없습니다.</p>
        ) : (
          <ul className="mt-3 flex flex-wrap gap-3">
            {members.map((member) => (
              <li key={member.id} className="flex items-center gap-2 rounded-full bg-slate-100 py-1.5 pl-1.5 pr-3 text-sm text-slate-700">
                {member.member?.avatar_url ? (
                  <img src={member.member.avatar_url} alt={`${member.member.name} 프로필 이미지`} className="size-6 rounded-full object-cover" />
                ) : (
                  <span aria-hidden="true" className="flex size-6 items-center justify-center rounded-full bg-white text-xs font-semibold text-slate-600">{member.member?.name.slice(0, 1) ?? "?"}</span>
                )}
                {member.member?.name ?? "알 수 없음"}
                {member.profile_id === leaderId && (
                  <span className="text-xs font-medium text-blue-700">(모임장)</span>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
