# traffic

모바일/데스크톱 반응형 관세 조회 웹앱입니다.

## 주요 개선 사항
- shadcn 스타일 + Tailwind 기반으로 UI/UX 전면 개편
- HS Code 입력, API 키 저장, 실시간 조회 상태 표시 UX 추가
- UNI-PASS API 호출 로직 추가 (실패 시 샘플 관세율 fallback)

## 로컬 실행
```bash
python3 -m http.server 4173
```

그 후 `http://localhost:4173` 접속

## GitHub Pages 퍼블릭 배포 방법
1. 기본 브랜치를 `main`으로 사용합니다.
2. 저장소 Settings → Pages → Build and deployment에서 **GitHub Actions**를 선택합니다.
3. `main` 브랜치에 푸시하면 `.github/workflows/pages.yml` 워크플로우가 실행되어 정적 사이트를 배포합니다.
4. 배포 완료 후 `https://<계정명>.github.io/<저장소명>/` 에서 퍼블릭으로 접근 가능합니다.

## 브랜치 정리 체크리스트
```bash
# 1) main 기준으로 최신화
git checkout main
git pull origin main

# 2) 이미 머지된 로컬 브랜치 정리 (main 제외)
git branch --merged main | rg -v '^\*| main$' | xargs -r git branch -d

# 3) 원격에서 삭제된 브랜치 흔적 정리
git fetch --prune
```

## 참고
- UNI-PASS 인증키가 필요합니다.
- 브라우저 직접 호출 시 CORS/권한 정책에 따라 응답이 차단될 수 있습니다.
