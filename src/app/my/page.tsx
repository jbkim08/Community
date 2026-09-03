"use client";

import type { ChangeEvent, FormEvent } from "react";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

type ProfileForm = {
  name: string;
  avatarUrl: string;
  bio: string;
  githubUrl: string;
  portfolioUrl: string;
  trainingCourse: string;
  trainingStartedAt: string;
  trainingEndedAt: string;
};

const emptyProfile: ProfileForm = {
  name: "",
  avatarUrl: "",
  bio: "",
  githubUrl: "",
  portfolioUrl: "",
  trainingCourse: "",
  trainingStartedAt: "",
  trainingEndedAt: "",
};

function toNullable(value: string) {
  return value.trim() || null;
}

export default function MyPage() {
  const router = useRouter();
  const [profile, setProfile] = useState<ProfileForm>(emptyProfile);
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("");
  const [userId, setUserId] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  useEffect(() => {
    let isMounted = true;

    async function loadProfile() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.replace("/login");
        return;
      }

      const { data, error } = await supabase
        .from("profiles")
        .select(
          "name, avatar_url, bio, github_url, portfolio_url, training_course, training_started_at, training_ended_at, role",
        )
        .eq("id", user.id)
        .maybeSingle();

      if (!isMounted) {
        return;
      }

      if (error || !data) {
        setErrorMessage(
          "프로필을 불러올 수 없습니다. 초기 migration이 적용됐는지 확인해 주세요.",
        );
        setIsLoading(false);
        return;
      }

      setEmail(user.email ?? "");
      setRole(data.role);
      setUserId(user.id);
      setProfile({
        name: data.name,
        avatarUrl: data.avatar_url ?? "",
        bio: data.bio ?? "",
        githubUrl: data.github_url ?? "",
        portfolioUrl: data.portfolio_url ?? "",
        trainingCourse: data.training_course ?? "",
        trainingStartedAt: data.training_started_at ?? "",
        trainingEndedAt: data.training_ended_at ?? "",
      });
      setIsLoading(false);
    }

    void loadProfile();

    return () => {
      isMounted = false;
    };
  }, [router]);

  function handleChange(
    event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) {
    const fieldName = event.target.name as keyof ProfileForm;
    setProfile((current) => ({
      ...current,
      [fieldName]: event.target.value,
    }));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrorMessage("");
    setSuccessMessage("");

    if (!profile.name.trim()) {
      setErrorMessage("이름을 입력해 주세요.");
      return;
    }

    if (
      profile.trainingStartedAt &&
      profile.trainingEndedAt &&
      profile.trainingStartedAt > profile.trainingEndedAt
    ) {
      setErrorMessage("훈련 종료일은 시작일보다 빠를 수 없습니다.");
      return;
    }

    setIsSaving(true);

    const { error } = await supabase
      .from("profiles")
      .update({
        name: profile.name.trim(),
        avatar_url: toNullable(profile.avatarUrl),
        bio: toNullable(profile.bio),
        github_url: toNullable(profile.githubUrl),
        portfolio_url: toNullable(profile.portfolioUrl),
        training_course: toNullable(profile.trainingCourse),
        training_started_at: profile.trainingStartedAt || null,
        training_ended_at: profile.trainingEndedAt || null,
      })
      .eq("id", userId);

    setIsSaving(false);

    if (error) {
      setErrorMessage("프로필 저장에 실패했습니다. 입력 값을 확인해 주세요.");
      return;
    }

    setSuccessMessage("프로필을 저장했습니다.");
  }

  if (isLoading) {
    return (
      <div className="mx-auto w-full max-w-5xl px-4 py-16 text-sm text-slate-600 sm:px-6">
        프로필을 불러오는 중입니다.
      </div>
    );
  }

  if (errorMessage && !userId) {
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
    <div className="mx-auto w-full max-w-3xl px-4 py-12 sm:px-6 sm:py-16">
      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
        <p className="text-sm font-semibold text-blue-700">MY PROFILE</p>
        <h1 className="mt-2 text-2xl font-bold tracking-tight text-slate-950">
          내 프로필
        </h1>
        <p className="mt-3 text-sm leading-6 text-slate-600">
          커뮤니티에 표시할 정보를 등록해 주세요.
        </p>

        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          <div className="grid gap-5 sm:grid-cols-2">
            <div>
              <label
                htmlFor="email"
                className="block text-sm font-medium text-slate-800"
              >
                이메일
              </label>
              <input
                id="email"
                value={email}
                readOnly
                className="mt-2 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-500"
              />
            </div>
            <div>
              <label
                htmlFor="role"
                className="block text-sm font-medium text-slate-800"
              >
                역할
              </label>
              <input
                id="role"
                value={role === "ADMIN" ? "관리자" : "회원"}
                readOnly
                className="mt-2 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-500"
              />
            </div>
          </div>

          <div>
            <label
              htmlFor="name"
              className="block text-sm font-medium text-slate-800"
            >
              이름
            </label>
            <input
              id="name"
              name="name"
              value={profile.name}
              onChange={handleChange}
              required
              maxLength={50}
              className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm text-slate-950 outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
            />
          </div>

          <div>
            <label
              htmlFor="avatarUrl"
              className="block text-sm font-medium text-slate-800"
            >
              프로필 이미지 URL <span className="font-normal text-slate-500">(선택)</span>
            </label>
            <input
              id="avatarUrl"
              name="avatarUrl"
              type="url"
              value={profile.avatarUrl}
              onChange={handleChange}
              placeholder="https://example.com/profile.png"
              className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm text-slate-950 outline-none placeholder:text-slate-400 focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
            />
          </div>

          <div>
            <label
              htmlFor="bio"
              className="block text-sm font-medium text-slate-800"
            >
              자기소개 <span className="font-normal text-slate-500">(선택)</span>
            </label>
            <textarea
              id="bio"
              name="bio"
              value={profile.bio}
              onChange={handleChange}
              maxLength={500}
              rows={5}
              className="mt-2 w-full resize-y rounded-lg border border-slate-300 px-3 py-2.5 text-sm text-slate-950 outline-none placeholder:text-slate-400 focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
            />
          </div>

          <div className="grid gap-5 sm:grid-cols-2">
            <div>
              <label
                htmlFor="githubUrl"
                className="block text-sm font-medium text-slate-800"
              >
                GitHub URL <span className="font-normal text-slate-500">(선택)</span>
              </label>
              <input
                id="githubUrl"
                name="githubUrl"
                type="url"
                value={profile.githubUrl}
                onChange={handleChange}
                placeholder="https://github.com/username"
                className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm text-slate-950 outline-none placeholder:text-slate-400 focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
              />
            </div>
            <div>
              <label
                htmlFor="portfolioUrl"
                className="block text-sm font-medium text-slate-800"
              >
                Portfolio URL <span className="font-normal text-slate-500">(선택)</span>
              </label>
              <input
                id="portfolioUrl"
                name="portfolioUrl"
                type="url"
                value={profile.portfolioUrl}
                onChange={handleChange}
                placeholder="https://example.com"
                className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm text-slate-950 outline-none placeholder:text-slate-400 focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
              />
            </div>
          </div>

          <div>
            <label
              htmlFor="trainingCourse"
              className="block text-sm font-medium text-slate-800"
            >
              훈련과정명 <span className="font-normal text-slate-500">(선택)</span>
            </label>
            <input
              id="trainingCourse"
              name="trainingCourse"
              type="text"
              value={profile.trainingCourse}
              onChange={handleChange}
              className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm text-slate-950 outline-none placeholder:text-slate-400 focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
            />
          </div>

          <div className="grid gap-5 sm:grid-cols-2">
            <div>
              <label
                htmlFor="trainingStartedAt"
                className="block text-sm font-medium text-slate-800"
              >
                훈련 시작일 <span className="font-normal text-slate-500">(선택)</span>
              </label>
              <input
                id="trainingStartedAt"
                name="trainingStartedAt"
                type="date"
                value={profile.trainingStartedAt}
                onChange={handleChange}
                className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm text-slate-950 outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
              />
            </div>
            <div>
              <label
                htmlFor="trainingEndedAt"
                className="block text-sm font-medium text-slate-800"
              >
                훈련 종료일 <span className="font-normal text-slate-500">(선택)</span>
              </label>
              <input
                id="trainingEndedAt"
                name="trainingEndedAt"
                type="date"
                value={profile.trainingEndedAt}
                onChange={handleChange}
                className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm text-slate-950 outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
              />
            </div>
          </div>

          {errorMessage && (
            <p
              role="alert"
              className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700"
            >
              {errorMessage}
            </p>
          )}

          {successMessage && (
            <p
              role="status"
              className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800"
            >
              {successMessage}
            </p>
          )}

          <button
            type="submit"
            disabled={isSaving}
            className="w-full rounded-lg bg-slate-900 px-4 py-3 text-sm font-semibold text-white hover:bg-slate-700 disabled:cursor-not-allowed disabled:bg-slate-400 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
          >
            {isSaving ? "저장 중..." : "프로필 저장"}
          </button>
        </form>
      </section>
    </div>
  );
}
