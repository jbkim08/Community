# 수료생 개발자 커뮤니티

수업을 수료한 학생들이 계속 소통하고 함께 성장할 수 있는 소규모 개발자 커뮤니티입니다.

## 기술 스택

- Next.js (App Router)
- TypeScript
- Tailwind CSS

## 실행 방법

```bash
npm install
npm run dev
```

브라우저에서 `http://localhost:3000`을 열어 확인합니다.

## Supabase 환경 변수

`.env.local.example`을 복사해 `.env.local` 파일을 만들고, Supabase Dashboard의 Connect 메뉴에서 프로젝트 URL과 Publishable Key를 입력합니다.

```bash
Copy-Item .env.local.example .env.local
```

`.env.local`은 Git에 포함되지 않습니다. 비밀 키는 `NEXT_PUBLIC_` 접두사를 붙이지 않으며, 현재 단계에서는 필요하지 않습니다.

## Supabase 데이터베이스

초기 스키마 migration은 `supabase/migrations/20260903000000_initial_schema.sql`에 있습니다. Supabase CLI를 연결한 뒤 다음 명령으로 적용합니다.

```bash
supabase db push
```

## 검사 명령어

```bash
npm run lint
npm run build
```
