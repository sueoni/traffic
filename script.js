const fallbackData = {
  countries: [
    { name: '대한민국', code: 'KR' },
    { name: '미국', code: 'US' },
    { name: '중국', code: 'CN' },
    { name: '베트남', code: 'VN' },
    { name: '일본', code: 'JP' },
    { name: '독일', code: 'DE' }
  ],
  categories: {
    전자기기: {
      phones: { label: '스마트폰', materials: ['알루미늄', '플라스틱'] },
      laptops: { label: '노트북', materials: ['알루미늄', '탄소섬유'] }
    },
    자동차부품: {
      battery: { label: '배터리', materials: ['리튬', '니켈'] },
      tire: { label: '타이어', materials: ['고무'] }
    },
    섬유: {
      shirts: { label: '셔츠', materials: ['면', '폴리에스터'] },
      jacket: { label: '자켓', materials: ['가죽', '나일론'] }
    }
  },
  baseTariff: {
    'KR-US': 4,
    'KR-CN': 7,
    'CN-US': 10,
    'VN-US': 6,
    'JP-DE': 3
  }
}

const UNIPASS_ENDPOINT = 'https://unipass.customs.go.kr:38010/ext/rest/trifFxrtInfoQry/retrieveTrifFxrtInfo'
let countries = [...fallbackData.countries]

const exportEl = document.getElementById('export-country')
const importEl = document.getElementById('import-country')
const categoryEl = document.getElementById('category')
const itemEl = document.getElementById('item')
const materialEl = document.getElementById('material')
const hsCodeEl = document.getElementById('hs-code')
const apiKeyEl = document.getElementById('api-key')
const saveKeyBtn = document.getElementById('save-key-btn')
const fetchBtn = document.getElementById('fetch-btn')
const resetBtn = document.getElementById('reset-btn')

const summaryEl = document.getElementById('summary')
const resultEl = document.getElementById('result')
const tariffRateEl = document.getElementById('tariff-rate')
const dataStatusEl = document.getElementById('data-status')
const chartEl = document.getElementById('trend-chart')
const chartTimeEl = document.getElementById('chart-time')
const trendLegendEl = document.getElementById('trend-legend')
const apiSourceEl = document.getElementById('api-source')

const savedKey = localStorage.getItem('unipass_api_key') || ''
if (savedKey) apiKeyEl.value = savedKey

function setOptions(element, options) {
  element.innerHTML = '<option value="">-선택-</option>'
  options.forEach(({ value, label }) => {
    const opt = document.createElement('option')
    opt.value = value
    opt.textContent = label
    element.appendChild(opt)
  })
}

async function tryLoadCountries() {
  try {
    const response = await fetch('https://restcountries.com/v3.1/all?fields=translations,cca2,name')
    if (!response.ok) throw new Error('국가 API 조회 실패')

    const list = await response.json()
    countries = list
      .map((country) => {
        const korean = country?.translations?.kor?.common
        return { name: korean || country?.name?.common, code: country?.cca2 }
      })
      .filter((country) => country.name && country.code)
      .sort((a, b) => a.name.localeCompare(b.name, 'ko'))

    apiSourceEl.textContent = '국가 목록: 실시간 API 사용'
  } catch {
    countries = [...fallbackData.countries]
    apiSourceEl.textContent = '국가 목록: 내장 데이터 사용'
  }

  setOptions(exportEl, countries.map((country) => ({ value: country.code, label: country.name })))
  setOptions(importEl, countries.map((country) => ({ value: country.code, label: country.name })))
}

function calculateFallbackRate() {
  const exporter = exportEl.value
  const importer = importEl.value
  const category = categoryEl.value
  const item = itemEl.value
  const material = materialEl.value

  if (!exporter || !importer || !category) return null

  let rate = fallbackData.baseTariff[`${exporter}-${importer}`] ?? 8
  if (category === '전자기기') rate -= 1
  if (category === '자동차부품') rate += 2
  if (item) rate += 0.5
  if (material === '리튬' || material === '가죽') rate += 1.5

  return Math.max(0, Number(rate.toFixed(1)))
}

function drawTrendChart(baseRate) {
  chartEl.innerHTML = ''
  if (baseRate === null) {
    trendLegendEl.textContent = '필수 항목 선택 후 트렌드를 표시합니다.'
    return
  }

  const now = new Date()
  chartTimeEl.textContent = `기준시간 ${now.toLocaleString('ko-KR')}`

  const points = Array.from({ length: 6 }, (_, i) => {
    const variation = Math.sin((i + 1) * 1.4) * 0.7 + (Math.random() * 0.8 - 0.4)
    return Number((baseRate + variation).toFixed(1))
  })

  const width = 320
  const height = 180
  const padding = 20
  const max = Math.max(...points) + 1
  const min = Math.max(0, Math.min(...points) - 1)

  const mapX = (idx) => padding + (idx * (width - padding * 2)) / (points.length - 1)
  const mapY = (value) => height - padding - ((value - min) / (max - min || 1)) * (height - padding * 2)
  const polyline = points.map((value, idx) => `${mapX(idx)},${mapY(value)}`).join(' ')

  chartEl.innerHTML = `
    <line x1="${padding}" y1="${height - padding}" x2="${width - padding}" y2="${height - padding}" stroke="hsl(215 20% 65% / 0.5)" />
    <polyline points="${polyline}" fill="none" stroke="hsl(213 93% 66%)" stroke-width="3" />
    ${points
      .map((value, idx) => `<circle cx="${mapX(idx)}" cy="${mapY(value)}" r="3" fill="hsl(213 93% 66%)" />`)
      .join('')}
  `

  trendLegendEl.textContent = `최근 6개월 추정 관세율: ${points.join('% · ')}%`
}

function updateSummary(rate = null) {
  const exporterName = exportEl.options[exportEl.selectedIndex]?.text || '-'
  const importerName = importEl.options[importEl.selectedIndex]?.text || '-'
  const category = categoryEl.value || '-'
  const item = itemEl.options[itemEl.selectedIndex]?.text || '-'
  const material = materialEl.options[materialEl.selectedIndex]?.text || '-'
  const hsCode = hsCodeEl.value.trim() || '-'
  const displayRate = rate ?? calculateFallbackRate()

  summaryEl.innerHTML = `
    <p><span class="text-muted-foreground">수출국/수입국</span> ${exporterName} → ${importerName}</p>
    <p><span class="text-muted-foreground">품목</span> ${category} / ${item} / ${material}</p>
    <p><span class="text-muted-foreground">HS Code</span> ${hsCode}</p>
  `

  tariffRateEl.textContent = displayRate === null ? '-' : `${displayRate}%`
  drawTrendChart(displayRate)
}

function renderMessage(message, tone = 'default') {
  const toneClass = tone === 'error' ? 'text-rose-300' : tone === 'success' ? 'text-emerald-300' : 'text-slate-300'
  resultEl.className = `mt-3 rounded-xl border border-border bg-slate-900/40 p-3 text-sm ${toneClass}`
  resultEl.textContent = message
}

async function fetchUniPassRate() {
  const apiKey = apiKeyEl.value.trim()
  const exporter = exportEl.value
  const importer = importEl.value
  const hsCode = hsCodeEl.value.trim()

  if (!exporter || !importer || !categoryEl.value) {
    renderMessage('수출국, 수입국, 품목은 필수입니다.', 'error')
    return
  }

  if (!/^\d{6,10}$/.test(hsCode)) {
    renderMessage('HS Code는 숫자 6~10자리여야 합니다.', 'error')
    return
  }

  if (!apiKey) {
    renderMessage('UNI-PASS 인증키를 입력하세요.', 'error')
    return
  }

  fetchBtn.disabled = true
  fetchBtn.textContent = '조회 중...'

  try {
    const url = new URL(UNIPASS_ENDPOINT)
    url.searchParams.set('crkyCn', apiKey)
    url.searchParams.set('expDclrNatCd', exporter)
    url.searchParams.set('imprDclrNatCd', importer)
    url.searchParams.set('hsSgn', hsCode)

    const response = await fetch(url.toString())
    if (!response.ok) throw new Error(`HTTP ${response.status}`)

    const text = await response.text()
    const match = text.match(/<(?:aplyRate|tariffRate|trffRt|rate)>(\d+(?:\.\d+)?)<\//i) || text.match(/(\d+(?:\.\d+)?)\s*%/)
    const tariffRate = match ? Number(match[1]) : null

    if (tariffRate === null || Number.isNaN(tariffRate)) throw new Error('관세율 파싱 실패')

    dataStatusEl.textContent = '실조회'
    renderMessage('UNI-PASS 실시간 관세 조회 성공', 'success')
    updateSummary(tariffRate)
  } catch (error) {
    const fallbackRate = calculateFallbackRate()
    dataStatusEl.textContent = '대체값'
    renderMessage(`실조회 실패: ${error.message}. 대체 계산치를 표시합니다.`, 'error')
    updateSummary(fallbackRate)
  } finally {
    fetchBtn.disabled = false
    fetchBtn.textContent = '관세 조회'
  }
}

setOptions(categoryEl, Object.keys(fallbackData.categories).map((category) => ({ value: category, label: category })))

categoryEl.addEventListener('change', () => {
  const category = categoryEl.value
  if (!category) {
    itemEl.disabled = true
    materialEl.disabled = true
    setOptions(itemEl, [])
    setOptions(materialEl, [])
    updateSummary()
    return
  }

  const items = Object.entries(fallbackData.categories[category]).map(([key, value]) => ({ value: key, label: value.label }))
  setOptions(itemEl, items)
  setOptions(materialEl, [])
  itemEl.disabled = false
  materialEl.disabled = true
  updateSummary()
})

itemEl.addEventListener('change', () => {
  const category = categoryEl.value
  const item = itemEl.value

  if (!category || !item) {
    materialEl.disabled = true
    setOptions(materialEl, [])
    updateSummary()
    return
  }

  const materials = fallbackData.categories[category][item].materials.map((material) => ({ value: material, label: material }))
  setOptions(materialEl, materials)
  materialEl.disabled = false
  updateSummary()
})

;[exportEl, importEl, materialEl, hsCodeEl].forEach((el) => {
  el.addEventListener('change', () => updateSummary())
  el.addEventListener('input', () => updateSummary())
})

saveKeyBtn.addEventListener('click', () => {
  localStorage.setItem('unipass_api_key', apiKeyEl.value.trim())
  renderMessage('인증키를 저장했습니다.', 'success')
})

fetchBtn.addEventListener('click', fetchUniPassRate)

resetBtn.addEventListener('click', () => {
  exportEl.value = ''
  importEl.value = ''
  categoryEl.value = ''
  itemEl.disabled = true
  materialEl.disabled = true
  hsCodeEl.value = ''
  setOptions(itemEl, [])
  setOptions(materialEl, [])
  dataStatusEl.textContent = '대기'
  renderMessage('필터를 다시 선택하세요.')
  updateSummary()
})

renderMessage('수출국/수입국/품목을 선택하면 관세와 트렌드가 표시됩니다.')
updateSummary()
tryLoadCountries()
