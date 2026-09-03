# Student Community Project Rules

## 프로젝트 목적

수업을 수료한 학생들이 계속 소통할 수 있는 소규모 개발자 커뮤니티를 만든다.

초기 사용자는 100명 미만이며, 복잡한 확장성보다 다음을 우선한다.

- 개발하기 쉬울 것
- 유지보수가 쉬울 것
- 코드가 초보자도 이해하기 쉬울 것
- 불필요한 라이브러리를 사용하지 않을 것
- 장기간 운영할 수 있을 것

---

# 기술 스택

- Next.js 최신 안정 버전
- App Router
- TypeScript
- Tailwind CSS
- Supabase
  - PostgreSQL
  - Auth
  - Storage
- Vercel 배포

별도 백엔드 서버는 만들지 않는다.

다음 기술은 현재 사용하지 않는다.

- Spring Boot
- FastAPI
- Express
- 별도 Node.js API 서버
- Redis
- Docker
- AWS S3

필요성이 명확해질 때만 추가한다.

---

# 개발 원칙

1. 코드를 최대한 단순하게 작성한다.
2. 과도한 추상화를 하지 않는다.
3. 작은 프로젝트이므로 불필요한 디자인 패턴을 사용하지 않는다.
4. 컴포넌트가 너무 커질 때만 분리한다.
5. 동일 코드가 반복될 때만 공통화한다.
6. 새로운 라이브러리를 설치하기 전에 반드시 필요한지 판단한다.
7. Supabase 기능으로 해결할 수 있다면 별도 서버 기능을 만들지 않는다.
8. TypeScript 타입을 명확하게 작성한다.
9. 환경 변수와 비밀키를 코드에 직접 작성하지 않는다.
10. 각 Task 완료 후 빌드 오류가 없는지 확인한다.

---

# 주요 기능

## 회원

Supabase Auth를 사용한다.

프로필 정보:

- 이름
- 이메일
- 프로필 이미지
- 자기소개
- GitHub URL
- Portfolio URL
- 훈련과정명
- 훈련 시작일
- 훈련 종료일
- 역할

역할:

- ADMIN
- MEMBER

---

# 게시판

카테고리:

- NOTICE
- FREE
- QUESTION
- INFO
- JOB

기능:

- 목록
- 상세
- 작성
- 수정
- 삭제
- 댓글
- 좋아요

NOTICE는 ADMIN만 작성할 수 있다.

---

# 게시글 이미지

Supabase Storage를 사용한다.

버킷:

post-images

지원 이미지:

- jpg
- jpeg
- png
- webp

파일 하나의 최대 크기:

5MB

게시글 하나에는 초기 버전에서 이미지 최대 1개만 허용한다.

---

# 프로젝트 / 스터디 모집

별도 메뉴 이름:

모임 모집

종류:

- PROJECT
- STUDY
- ETC

상태:

- OPEN
- CLOSED

기능:

- 모집글 작성
- 조회
- 수정
- 삭제
- 참여
- 참여 취소

---

# 취업정보

정보:

- 회사명
- 채용 제목
- 지역
- 설명
- 채용공고 URL
- 마감일

회원과 관리자 모두 등록할 수 있다.

---

# 회원목록

회원 목록을 조회할 수 있다.

필터:

- 훈련과정
- 훈련년도

회원 상세 페이지에서 다음 정보를 확인할 수 있다.

- 프로필
- 훈련과정
- GitHub
- Portfolio
- 자기소개

---

# 기본 DB 테이블

- profiles
- posts
- comments
- post_likes
- recruitments
- recruitment_members
- jobs

Supabase 기본 기능:

- auth.users
- storage

---

# 페이지

- /
- /login
- /signup

- /posts
- /posts/new
- /posts/[id]

- /recruitments
- /recruitments/new
- /recruitments/[id]

- /jobs
- /jobs/new
- /jobs/[id]

- /members
- /members/[id]

- /my

---

# UI 원칙

디자인은 단순하고 깔끔하게 만든다.

모바일과 데스크톱 모두 사용할 수 있도록 responsive하게 구현한다.

화려한 애니메이션이나 복잡한 UI 라이브러리는 사용하지 않는다.

Tailwind CSS를 기본으로 사용한다.

---

# Codex 작업 규칙

하나의 Task에서 너무 많은 기능을 구현하지 않는다.

각 Task마다 다음 순서를 따른다.

1. 현재 프로젝트 구조 확인
2. 필요한 파일만 수정
3. 기능 구현
4. TypeScript 오류 확인
5. lint 확인
6. build 확인
7. 변경된 파일 설명
8. 테스트 방법 설명

현재 Task와 관계없는 코드는 수정하지 않는다.

기존 기능을 깨뜨리지 않는다.

Task 완료 후 다음 Task를 임의로 진행하지 않는다.
