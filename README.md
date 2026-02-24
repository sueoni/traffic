# traffic

오픈 API 기반 관세 조회 웹앱입니다.

## 변경 사항
- shadcn 느낌의 간결한 UI로 재구성
- 수출국/수입국/품목 요약 + 큰 관세율 카드 제공
- 월별 트렌드(그래프) 및 기준시간 표시
- 국가 목록은 외부 API(restcountries) 우선 사용, 실패 시 내장 목록 fallback
- 오픈 API 실조회 실패 시 내장 기준 관세 데이터로 fallback 계산
- 자주 조회하는 필터 조합을 프리셋으로 저장/불러오기/삭제 가능
- iPhone 포함 모바일 화면에서 터치 영역과 텍스트 대비를 강화해 시인성 개선
- 배민체(Jua) 느낌의 둥글고 귀여운 톤 + 저채도 파스텔 대비 색상으로 눈부심 완화
- UNI-PASS 관세율 조회 우선 시도, 실패 시 오픈 API(World Bank) 및 내장 기준값으로 자동 fallback
- UNI-PASS API Key 입력/저장 지원 (브라우저 LocalStorage)
- iPhone 모바일 터치 환경에 맞춘 입력/버튼 배치 최적화

## 실행
```bash
python3 -m http.server 4173
```

브라우저에서 `http://localhost:4173` 접속
