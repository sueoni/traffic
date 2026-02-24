# traffic

UNI-PASS 기반 관세 조회 웹앱입니다.

## 변경 사항
- shadcn 느낌의 간결한 UI로 재구성
- 수출국/수입국/품목 요약 + 큰 관세율 카드 제공
- 월별 트렌드(그래프) 및 기준시간 표시
- 국가 목록은 외부 API(restcountries) 우선 사용, 실패 시 내장 목록 fallback
- UNI-PASS API 실조회 실패 시 내장 기준 관세 데이터로 fallback 계산
- 자주 조회하는 필터 조합을 프리셋으로 저장/불러오기/삭제 가능
- iPhone 포함 모바일 화면에서 터치 영역과 텍스트 대비를 강화해 시인성 개선

## 실행
```bash
python3 -m http.server 4173
```

브라우저에서 `http://localhost:4173` 접속
