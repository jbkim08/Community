import Link from "next/link";

export default function NotFound() {
  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-16 sm:px-6">
      <section className="rounded-xl border border-dashed border-slate-300 bg-white px-6 py-12 text-center">
        <h1 className="text-lg font-semibold text-slate-950">페이지를 찾을 수 없습니다</h1>
        <p className="mt-2 text-sm text-slate-600">주소를 다시 확인해 주세요.</p>
        <Link href="/" className="mt-6 inline-flex text-sm font-medium text-blue-700 hover:text-blue-800">홈으로 이동</Link>
      </section>
    </div>
  );
}
