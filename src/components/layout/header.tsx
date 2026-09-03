"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

const navigationItems = [
  { href: "/posts", label: "게시판" },
  { href: "/recruitments", label: "모임 모집" },
  { href: "/jobs", label: "취업정보" },
  { href: "/members", label: "회원목록" },
];

export default function Header() {
  const pathname = usePathname();
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const isCurrentPath = (href: string) =>
    pathname === href || pathname.startsWith(`${href}/`);

  return (
    <header className="border-b border-slate-200 bg-white">
      <div className="mx-auto flex min-h-16 w-full max-w-5xl items-center justify-between px-4 sm:px-6">
        <Link
          href="/"
          className="flex items-center gap-3 rounded-md focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-blue-600"
          onClick={() => setIsMenuOpen(false)}
        >
          <span
            aria-hidden="true"
            className="flex size-9 items-center justify-center rounded-lg bg-slate-900 text-sm font-bold text-white"
          >
            C
          </span>
          <span className="font-semibold tracking-tight text-slate-900">
            수료생 개발자 커뮤니티
          </span>
        </Link>

        <nav aria-label="주요 메뉴" className="hidden items-center gap-1 md:flex">
          {navigationItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              aria-current={isCurrentPath(item.href) ? "page" : undefined}
              className={`rounded-md px-3 py-2 text-sm font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 ${
                isCurrentPath(item.href)
                  ? "bg-slate-100 text-slate-950"
                  : "text-slate-600 hover:bg-slate-100 hover:text-slate-950"
              }`}
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="hidden items-center gap-2 md:flex">
          <Link
            href="/login"
            className="rounded-md px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
          >
            로그인
          </Link>
          <Link
            href="/signup"
            className="rounded-md bg-slate-900 px-3 py-2 text-sm font-medium text-white hover:bg-slate-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
          >
            회원가입
          </Link>
        </div>

        <button
          type="button"
          aria-label="메뉴 열기"
          aria-controls="mobile-navigation"
          aria-expanded={isMenuOpen}
          className="rounded-md p-2 text-slate-700 hover:bg-slate-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 md:hidden"
          onClick={() => setIsMenuOpen((isOpen) => !isOpen)}
        >
          <span aria-hidden="true" className="flex w-5 flex-col gap-1">
            <span className="h-0.5 w-full rounded bg-current" />
            <span className="h-0.5 w-full rounded bg-current" />
            <span className="h-0.5 w-full rounded bg-current" />
          </span>
        </button>
      </div>

      {isMenuOpen && (
        <nav
          id="mobile-navigation"
          aria-label="모바일 주요 메뉴"
          className="border-t border-slate-200 px-4 py-3 md:hidden"
        >
          <div className="mx-auto flex w-full max-w-5xl flex-col gap-1 sm:px-2">
            {navigationItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                aria-current={isCurrentPath(item.href) ? "page" : undefined}
                className={`rounded-md px-3 py-2.5 text-sm font-medium ${
                  isCurrentPath(item.href)
                    ? "bg-slate-100 text-slate-950"
                    : "text-slate-700 hover:bg-slate-100"
                }`}
                onClick={() => setIsMenuOpen(false)}
              >
                {item.label}
              </Link>
            ))}
            <div className="my-2 border-t border-slate-200" />
            <Link
              href="/login"
              className="rounded-md px-3 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-100"
              onClick={() => setIsMenuOpen(false)}
            >
              로그인
            </Link>
            <Link
              href="/signup"
              className="rounded-md bg-slate-900 px-3 py-2.5 text-center text-sm font-medium text-white hover:bg-slate-700"
              onClick={() => setIsMenuOpen(false)}
            >
              회원가입
            </Link>
          </div>
        </nav>
      )}
    </header>
  );
}
