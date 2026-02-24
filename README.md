# traffic

모바일 우선 관세 조회 웹앱입니다.

## 기능
- 수출국/수입국/품목/세부품목/재질 선택 기반 예상 관세율 계산
- 다크 테마 모바일 UI (Tailwind + shadcn 스타일 컴포넌트 느낌)
- GitHub Pages 자동 배포 워크플로우 포함 (`work` 브랜치 푸시 시 배포)

## 로컬 실행
정적 파일 프로젝트라서 브라우저에서 `index.html`을 바로 열거나, 간단한 서버로 실행할 수 있습니다.

```bash
python3 -m http.server 4173
```

그 후 `http://localhost:4173` 접속
