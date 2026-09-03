export default function Home() {
  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-16 sm:px-6 sm:py-24">
      <section className="max-w-2xl">
        <p className="mb-4 text-sm font-semibold text-blue-700">
          STUDENT DEVELOPER COMMUNITY
        </p>
        <h1 className="text-3xl font-bold tracking-tight text-slate-950 sm:text-5xl">
          수료 후에도 함께 성장해요.
        </h1>
        <p className="mt-6 text-base leading-7 text-slate-600 sm:text-lg">
          동료들과 경험을 나누고, 새로운 프로젝트와 학습 기회를 발견할 수
          있는 작은 개발자 커뮤니티입니다.
        </p>
      </section>

      <section
        aria-labelledby="preparing-features"
        className="mt-12 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8"
      >
        <h2
          id="preparing-features"
          className="text-lg font-semibold text-slate-900"
        >
          커뮤니티를 준비하고 있습니다
        </h2>
        <p className="mt-2 text-sm leading-6 text-slate-600">
          게시판, 모임 모집, 취업 정보와 회원 소개 기능을 차례대로 제공할
          예정입니다.
        </p>
      </section>
    </div>
  );
}
