# 가장 보통의 매거진 — 인수인계 문서 (v1, 2026-10-11)

새 대화에서 이 문서와 저장소 주소만 주면 이어서 작업할 수 있다.
저장소: https://github.com/hommek4b/ordinary-magazine (공개)
공개 주소: https://hommek4b.github.io/ordinary-magazine/
글쓰기: 공개 주소/write.html (편집자 이메일 로그인)

## 1. 한눈에
- 원본 사이트(네이버 블로그는 별개). 글은 한 편씩 발행. 호(issue) 개념 없음.
- 정적 사이트(GitHub Pages, main 브랜치 루트) + Supabase(글 DB, 이미지 저장소, 로그인).
- 서버 코드 없음. 공개 페이지는 Supabase REST를 fetch로 직접 읽는다. 글쓰기만 supabase-js를 쓴다.
- main에 push하면 1~2분 뒤 자동 반영.

## 2. 파일 지도
- index.html : 첫 화면. 한 파일 안에 모바일(.P)·PC(.L) 구성을 모두 담음(900px 기준). 자체 CSS 포함.
- archive.html : 전체 글(정렬: 최신/오래된/인기). category.html : 분야별 글(탭+정렬). 두 목록은 SITE.issueRow 공용.
- post.html : 글 읽기. #글번호 로 연다. 세로 표지 → 제목 → 본문 → 출처 → 관련 글.
- about.html : 소개. write.html : 글쓰기(편집자 전용).
- site.js : 공용(카테고리·예시 글·데이터 로드·헤더/푸터·renderArticle·recordView·readCounts·issueRow·sanitizer).
- site.css : 하위 페이지 공용 스타일과 색 토큰. config.js : Supabase 주소·공개 키.
- supabase/setup.sql : 테이블·권한·저장소 설정(이미 실행함). img/ : 예시 이미지(실제 글이 생기면 안 쓰임).
- index.backup 류 파일 없음. 복구는 git으로.

## 3. 데이터
- posts: id(bigint, 새 글 101부터), status(draft|published), iso(YYYY-MM-DD), cat, title, dek,
  cover_path(세로 표지), img_path(가로 대표), blocks(jsonb), sources(jsonb), updated(ms).
- blocks: {t:"h",x} 소제목 / {t:"p",x,h?} 문단(h는 서식 있는 HTML, sanitizer 통과분) / {t:"i",id,x} 사진(id=저장소 경로).
- reads: (post_id, viewer) 한 사람당 한 글 1회. read_counts() RPC로 집계(인기글·인기순).
- 이미지: 공개 버킷 images. 글쓰기에서 올릴 때 가로 1800px JPEG로 줄여 올림.
- 권한: 발행글은 누구나 읽기, 쓰기·초안·이미지 업로드는 admins 표에 등록된 이메일(is_admin())만. RLS 켜짐.
- 실제 발행글이 1편이라도 있으면 예시 글(SAMPLE)은 전부 사라지고 실제 글만 보인다.

## 4. 결정 사항(바꾸지 말 것 / 바꿀 때 캡틴 확인)
- 카테고리 8개, 순서: 이슈·정치, 노동·일자리, 주거·금융, 가족·복지, 사회·소식, 문화·예술, 역사·인물, 생각·제언. (site.js의 CATS 한 곳)
- 첫 화면에 카테고리 목록 없음(삭제함). 모바일 첫 화면 = 제목+표지+"최신 글 읽기". PC = 제목/표지/LATEST 목록.
- 문구: 제목 위 "있는 그대로, 보통의 말로 전합니다." 제목 아래 설명은 비워 둠(나중에 사용). "월세와 일자리…" 류 문구는 모두 삭제.
- 글 읽기: 세로 표지가 먼저 한 화면. "글 시작" 버튼은 뺌. 표지가 없으면 표지 화면 없이 제목부터.
- 목록 형식(전체 글·분야별): 번호=핫핑크, 소개 줄=올리브, 번호는 발행 순서(가장 오래된 글 001), 맨 위 최신 글 번호 = 상단 LATEST 번호.
- 색: 바탕 #1A1A1A, 글자 #FFFFFF, 설명 #E6E5E2, 보조 #CFCECB, 분홍 #E6007E(보통·버튼·번호·선), 올리브 #9DBF96(분야·소개 줄).
- 폰트(모두 구글 폰트, OFL 무료): Noto Serif KR, Noto Sans KR, Bodoni Moda, Nanum Pen Script, Black Han Sans. 기본 굵기 500.
- 이슈 글도 정치색 없이 사실 기준. AI 기자(여성)는 도입 예정: 글쓴이 칸·프로필 필요, AI임을 밝힐 것.

## 5. 글쓰기 화면
- 이메일 링크 로그인(비밀번호 없음). 서식: 글꼴·크기(px)·굵게·기울임·밑줄·글자색·배경색·서식 지우기.
- 문단/소제목/사진/출처 번호 버튼. 통째 붙여넣기 시 제목·소제목(##)·문단·출처로 자동 분리. 임시 저장 자동.
- 알려진 문제: 폰에서 "## "+스페이스 자동 소제목이 안 됨(버튼으로는 됨).

## 6. 복구 지점(git)
- 순백·굵기 개편 직전: a0b9947 / 굵기 500 개편 직전: 31f6e90 / 최신: main.
- 되돌리기: git revert 또는 해당 커밋 파일 체크아웃 후 push.

## 7. 남은 일
- 실제 글 발행 테스트(사진·표지·인기글 집계, 폰 로그인) — 캡틴 확인 중.
- 정정·제보 연락처, 생활·소비 카테고리(코디 포함) 여부, AI 기자 글쓴이 칸.
- 표지·대표 이미지(캡틴 제작), 도메인(선택), 인기글 조작 방지(현재는 단순 집계).
- 옛 claude.ai 주소(artifact)는 폐기된 사본. 보지 말 것.

## 8. 작업 방법 메모
- 이 작업 환경은 Supabase에 직접 접속 못 함 → 로그인·저장은 가짜 서버로 테스트, 실제는 캡틴 확인.
- 캡틴은 짧은 답, 빠른 방향 수정을 선호. 지우라는 말이 아니면 지우지 말고 수정 안을 낼 것.
- 요청 범위만 수정하고 범위 밖 문제는 알리기만.
