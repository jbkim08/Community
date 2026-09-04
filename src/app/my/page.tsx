"use client";

import type { ChangeEvent, FormEvent } from "react";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import {
  getTrainingCourseName,
  getTrainingPeriod,
  normalizeTrainingCourse,
  type TrainingCourse,
} from "@/lib/training-course";

type ProfileForm = {
  name: string;
  avatarUrl: string;
  bio: string;
  githubUrl: string;
  portfolioUrl: string;
  customTrainingCourse: string;
  customTrainingStartedAt: string;
  customTrainingEndedAt: string;
};

type ProfileCourse = {
  training_course_id: string | null;
  custom_training_course: string | null;
  custom_training_started_at: string | null;
  custom_training_ended_at: string | null;
  training_course: TrainingCourse | null;
};

const emptyProfile: ProfileForm = {
  name: "", avatarUrl: "", bio: "", githubUrl: "", portfolioUrl: "",
  customTrainingCourse: "", customTrainingStartedAt: "", customTrainingEndedAt: "",
};

function toNullable(value: string) {
  return value.trim() || null;
}

export default function MyPage() {
  const router = useRouter();
  const [profile, setProfile] = useState<ProfileForm>(emptyProfile);
  const [course, setCourse] = useState<ProfileCourse | null>(null);
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
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.replace("/login"); return; }

      const { data, error } = await supabase.from("profiles").select(
        "name, avatar_url, bio, github_url, portfolio_url, training_course_id, custom_training_course, custom_training_started_at, custom_training_ended_at, role, training_course:training_courses(id, name, started_at, ended_at, signup_enabled)",
      ).eq("id", user.id).maybeSingle();

      if (!isMounted) return;
      if (error || !data) {
        setErrorMessage("프로필을 불러올 수 없습니다. migration 적용 여부를 확인해 주세요.");
      } else {
        const loadedCourse = {
          ...(data as unknown as ProfileCourse),
          training_course: normalizeTrainingCourse(data.training_course),
        };
        setEmail(user.email ?? "");
        setRole(data.role);
        setUserId(user.id);
        setCourse(loadedCourse);
        setProfile({
          name: data.name,
          avatarUrl: data.avatar_url ?? "",
          bio: data.bio ?? "",
          githubUrl: data.github_url ?? "",
          portfolioUrl: data.portfolio_url ?? "",
          customTrainingCourse: data.custom_training_course ?? "",
          customTrainingStartedAt: data.custom_training_started_at ?? "",
          customTrainingEndedAt: data.custom_training_ended_at ?? "",
        });
      }
      setIsLoading(false);
    }
    void loadProfile();
    return () => { isMounted = false; };
  }, [router]);

  function handleChange(event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) {
    const fieldName = event.target.name as keyof ProfileForm;
    setProfile((current) => ({ ...current, [fieldName]: event.target.value }));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrorMessage(""); setSuccessMessage("");
    if (!profile.name.trim()) { setErrorMessage("이름을 입력해 주세요."); return; }
    if (!course?.training_course_id && !profile.customTrainingCourse.trim()) {
      setErrorMessage("기타 훈련과정명을 입력해 주세요."); return;
    }
    if (profile.customTrainingCourse.trim().length > 200) { setErrorMessage("기타 훈련과정명은 200자 이하로 입력해 주세요."); return; }
    if (profile.customTrainingStartedAt && profile.customTrainingEndedAt && profile.customTrainingStartedAt > profile.customTrainingEndedAt) {
      setErrorMessage("훈련 종료일은 시작일보다 빠를 수 없습니다."); return;
    }

    const updateData = {
      name: profile.name.trim(), avatar_url: toNullable(profile.avatarUrl), bio: toNullable(profile.bio),
      github_url: toNullable(profile.githubUrl), portfolio_url: toNullable(profile.portfolioUrl),
      ...(course?.training_course_id ? {} : {
        custom_training_course: toNullable(profile.customTrainingCourse),
        custom_training_started_at: profile.customTrainingStartedAt || null,
        custom_training_ended_at: profile.customTrainingEndedAt || null,
      }),
    };
    setIsSaving(true);
    const { error } = await supabase.from("profiles").update(updateData).eq("id", userId);
    setIsSaving(false);
    if (error) { setErrorMessage("프로필 저장에 실패했습니다. 입력 값을 확인해 주세요."); return; }
    setSuccessMessage("프로필을 저장했습니다.");
  }

  if (isLoading) return <div className="mx-auto w-full max-w-5xl px-4 py-16 text-sm text-slate-600 sm:px-6">프로필을 불러오는 중입니다.</div>;
  if (errorMessage && !userId) return <div className="mx-auto w-full max-w-5xl px-4 py-16 sm:px-6"><p role="alert" className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">{errorMessage}</p></div>;

  const isManagedCourse = Boolean(course?.training_course_id);
  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-12 sm:px-6 sm:py-16">
      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
        <p className="text-sm font-semibold text-blue-700">MY PROFILE</p>
        <h1 className="mt-2 text-2xl font-bold tracking-tight text-slate-950">내 프로필</h1>
        <p className="mt-3 text-sm leading-6 text-slate-600">커뮤니티에 표시할 정보를 등록해 주세요.</p>
        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          <div className="grid gap-5 sm:grid-cols-2">
            <ReadOnlyInput id="email" label="이메일" value={email} />
            <ReadOnlyInput id="role" label="역할" value={role === "ADMIN" ? "관리자" : "회원"} />
          </div>
          <TextInput id="name" label="이름" value={profile.name} onChange={handleChange} required maxLength={50} />
          <TextInput id="avatarUrl" label="프로필 이미지 URL" optional type="url" value={profile.avatarUrl} onChange={handleChange} placeholder="https://example.com/profile.png" />
          <div><label htmlFor="bio" className="block text-sm font-medium text-slate-800">자기소개 <span className="font-normal text-slate-500">(선택)</span></label><textarea id="bio" name="bio" value={profile.bio} onChange={handleChange} maxLength={500} rows={5} className="mt-2 w-full resize-y rounded-lg border border-slate-300 px-3 py-2.5 text-sm text-slate-950 outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100" /></div>
          <div className="grid gap-5 sm:grid-cols-2">
            <TextInput id="githubUrl" label="GitHub URL" optional type="url" value={profile.githubUrl} onChange={handleChange} placeholder="https://github.com/username" />
            <TextInput id="portfolioUrl" label="Portfolio URL" optional type="url" value={profile.portfolioUrl} onChange={handleChange} placeholder="https://example.com" />
          </div>

          {isManagedCourse ? (
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
              <p className="text-sm font-medium text-slate-800">훈련과정</p>
              <p className="mt-2 break-words text-sm text-slate-950">{course ? getTrainingCourseName(course) : "훈련과정 정보 없음"}</p>
              <p className="mt-1 text-sm text-slate-600">{course ? getTrainingPeriod(course) : "기간 정보 없음"}</p>
              <p className="mt-3 text-xs leading-5 text-slate-500">관리자가 등록한 과정 정보는 여기서 수정할 수 없습니다.</p>
            </div>
          ) : (
            <div className="space-y-5 rounded-lg border border-slate-200 bg-slate-50 p-4">
              <TextInput id="customTrainingCourse" label="기타 훈련과정명" value={profile.customTrainingCourse} onChange={handleChange} required maxLength={200} />
              <div className="grid gap-5 sm:grid-cols-2">
                <TextInput id="customTrainingStartedAt" label="훈련 시작일" type="date" value={profile.customTrainingStartedAt} onChange={handleChange} />
                <TextInput id="customTrainingEndedAt" label="훈련 종료일" type="date" value={profile.customTrainingEndedAt} onChange={handleChange} />
              </div>
            </div>
          )}
          {errorMessage && <p role="alert" className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{errorMessage}</p>}
          {successMessage && <p role="status" className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">{successMessage}</p>}
          <button type="submit" disabled={isSaving} className="w-full rounded-lg bg-slate-900 px-4 py-3 text-sm font-semibold text-white hover:bg-slate-700 disabled:cursor-not-allowed disabled:bg-slate-400">{isSaving ? "저장 중..." : "프로필 저장"}</button>
        </form>
      </section>
    </div>
  );
}

type InputProps = { id: string; label: string; value: string; onChange?: (event: ChangeEvent<HTMLInputElement>) => void; type?: string; required?: boolean; maxLength?: number; optional?: boolean; placeholder?: string };
function TextInput({ id, label, optional, ...props }: InputProps) {
  return <div><label htmlFor={id} className="block text-sm font-medium text-slate-800">{label} {optional && <span className="font-normal text-slate-500">(선택)</span>}</label><input id={id} name={id} {...props} className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm text-slate-950 outline-none placeholder:text-slate-400 focus:border-blue-600 focus:ring-2 focus:ring-blue-100" /></div>;
}
function ReadOnlyInput({ id, label, value }: Pick<InputProps, "id" | "label" | "value">) {
  return <div><label htmlFor={id} className="block text-sm font-medium text-slate-800">{label}</label><input id={id} value={value} readOnly className="mt-2 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-500" /></div>;
}
