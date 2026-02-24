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

## 참고
- UNI-PASS 인증키가 필요합니다.
- 브라우저 직접 호출 시 CORS/권한 정책에 따라 응답이 차단될 수 있습니다.
