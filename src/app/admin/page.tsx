import Link from "next/link";

export default function AdminPage() {
  return (
    <div className="mx-auto w-full max-w-4xl px-4 py-12 sm:px-6 sm:py-16">
      <section>
        <p className="text-sm font-semibold text-blue-700">ADMIN</p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-950">관리자</h1>
      </section>
      <section className="mt-8 rounded-xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        <h2 className="text-lg font-semibold text-slate-950">훈련과정 관리</h2>
        <p className="mt-2 text-sm leading-6 text-slate-600">회원가입 화면에 표시할 훈련과정을 등록하고 관리합니다.</p>
        <Link href="/admin/training-courses" className="mt-5 inline-flex rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-slate-700">훈련과정 관리</Link>
      </section>
    </div>
  );
}
