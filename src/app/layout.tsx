import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "수료생 개발자 커뮤니티",
    template: "%s | 수료생 개발자 커뮤니티",
  },
  description: "수업을 수료한 개발자들이 소통하고 정보를 나누는 커뮤니티입니다.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="ko">
      <body>
        <div className="flex min-h-screen flex-col">
          <header className="border-b border-slate-200 bg-white">
            <div className="mx-auto flex h-16 w-full max-w-5xl items-center px-4 sm:px-6">
              <span
                aria-hidden="true"
                className="mr-3 flex size-9 items-center justify-center rounded-lg bg-slate-900 text-sm font-bold text-white"
              >
                C
              </span>
              <p className="font-semibold tracking-tight text-slate-900">
                수료생 개발자 커뮤니티
              </p>
            </div>
          </header>

          <main className="flex-1">{children}</main>

          <footer className="border-t border-slate-200 bg-white">
            <div className="mx-auto w-full max-w-5xl px-4 py-6 text-sm text-slate-500 sm:px-6">
              함께 배우고 성장하는 개발자 커뮤니티
            </div>
          </footer>
        </div>
      </body>
    </html>
  );
}
