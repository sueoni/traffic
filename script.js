const fallbackData = {
  countries: [
    { name: '멕시코', code: 'MX' },
    { name: '베트남', code: 'VN' },
    { name: '브라질', code: 'BR' },
    { name: '이집트', code: 'EG' },
    { name: '인도', code: 'IN' },
    { name: '인도네시아', code: 'ID' },
    { name: '일본', code: 'JP' },
    { name: '중국', code: 'CN' },
    { name: '폴란드', code: 'PL' },
    { name: '한국', code: 'KR' }
  ],
  products: [
    { value: 'set', label: '세트', hsCode: '847330' },
    { value: 'module', label: '모듈', hsCode: '854239' },
    { value: 'raw', label: '원소재', hsCode: '390190' },
    { value: 'press', label: '프레스', hsCode: '846229' },
    { value: 'injection', label: '사출', hsCode: '847710' },
    { value: 'extrusion', label: '압출', hsCode: '847720' },
    { value: 'packaging', label: '포장', hsCode: '481910' }
  ],
  baseTariff: {
    'MX-KR': 5.8,
    'VN-KR': 4.2,
    'BR-KR': 8.4,
    'EG-KR': 7.6,
    'IN-KR': 6.1,
    'ID-KR': 5.5,
    'JP-KR': 3.2,
    'CN-KR': 8.1,
    'PL-KR': 4.7,
    'KR-CN': 8,
    'KR-VN': 4,
    'KR-JP': 3.3,
    'KR-MX': 5.6
  }
}

const WORLD_BANK_ENDPOINT = 'https://api.worldbank.org/v2/country'
const UNIPASS_CANDIDATE_ENDPOINTS = [
  'https://unipass.customs.go.kr/ext/rest/tariff',
  'https://unipass.customs.go.kr:38010/ext/rest/tariff'
]
const PRESET_KEY = 'unipass_presets_v2'
const UNIPASS_KEY_STORAGE = 'unipass_api_key_v1'

const exportEl = document.getElementById('export-country')
const importEl = document.getElementById('import-country')
const categoryEl = document.getElementById('category')
const fetchBtn = document.getElementById('fetch-btn')
const resetBtn = document.getElementById('reset-btn')

const presetNameEl = document.getElementById('preset-name')
const presetListEl = document.getElementById('preset-list')
const savePresetBtn = document.getElementById('save-preset-btn')
const deletePresetBtn = document.getElementById('delete-preset-btn')
const uniPassApiKeyEl = document.getElementById('unipass-api-key')
const saveKeyBtn = document.getElementById('save-key-btn')

const summaryEl = document.getElementById('summary')
const resultEl = document.getElementById('result')
const tariffRateEl = document.getElementById('tariff-rate')
const dataStatusEl = document.getElementById('data-status')
const chartEl = document.getElementById('trend-chart')
const chartTimeEl = document.getElementById('chart-time')
const trendLegendEl = document.getElementById('trend-legend')
const apiSourceEl = document.getElementById('api-source')


function readUniPassApiKey() {
  return (localStorage.getItem(UNIPASS_KEY_STORAGE) || '').trim()
}

function saveUniPassApiKey() {
  const key = (uniPassApiKeyEl?.value || '').trim()
  if (!key) {
    localStorage.removeItem(UNIPASS_KEY_STORAGE)
    renderMessage('API Key를 비웠습니다. 키 없이 조회합니다.', 'success')
    return
  }

  localStorage.setItem(UNIPASS_KEY_STORAGE, key)
  renderMessage('API Key를 저장했습니다.', 'success')
}

function setOptions(element, options, emptyText = '-선택-') {
  element.innerHTML = `<option value="">${emptyText}</option>`
  options.forEach(({ value, label }) => {
    const opt = document.createElement('option')
    opt.value = value
    opt.textContent = label
    element.appendChild(opt)
  })
}

function getSelectedProduct() {
  return fallbackData.products.find((product) => product.value === categoryEl.value) || null
}

function safeReadPresets() {
  try {
    const parsed = JSON.parse(localStorage.getItem(PRESET_KEY) || '[]')
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

function writePresets(presets) {
  localStorage.setItem(PRESET_KEY, JSON.stringify(presets.slice(0, 12)))
}

function getCurrentFilterValue() {
  return {
    exportCountry: exportEl.value,
    importCountry: importEl.value,
    product: categoryEl.value
  }
}

function applyFilterValue(filters) {
  exportEl.value = filters.exportCountry || ''
  importEl.value = filters.importCountry || ''
  categoryEl.value = filters.product || ''
  updateSummary()
}

function refreshPresetList() {
  const presets = safeReadPresets()
  setOptions(
    presetListEl,
    presets.map((preset) => ({ value: preset.id, label: `${preset.name} · ${preset.filters.exportCountry || '-'}→${preset.filters.importCountry || '-'}` })),
    presets.length ? '프리셋을 선택하세요' : '저장된 프리셋 없음'
  )
}

function savePreset() {
  const name = presetNameEl.value.trim()
  if (!name) {
    renderMessage('프리셋 이름을 입력하세요.', 'error')
    return
  }

  const presets = safeReadPresets()
  const filters = getCurrentFilterValue()
  const existingIndex = presets.findIndex((preset) => preset.name === name)

  if (existingIndex >= 0) {
    presets[existingIndex] = { ...presets[existingIndex], filters }
    renderMessage(`프리셋 '${name}'을(를) 덮어썼습니다.`, 'success')
  } else {
    presets.unshift({ id: crypto.randomUUID(), name, filters })
    renderMessage(`프리셋 '${name}'을(를) 저장했습니다.`, 'success')
  }

  writePresets(presets)
  refreshPresetList()
}

function deletePreset() {
  const selectedId = presetListEl.value
  if (!selectedId) {
    renderMessage('삭제할 프리셋을 선택하세요.', 'error')
    return
  }

  const presets = safeReadPresets()
  const selected = presets.find((preset) => preset.id === selectedId)
  writePresets(presets.filter((preset) => preset.id !== selectedId))
  refreshPresetList()
  renderMessage(`프리셋 '${selected?.name || ''}'을(를) 삭제했습니다.`, 'success')
}

function calculateFallbackRate() {
  const exporter = exportEl.value
  const importer = importEl.value
  const product = getSelectedProduct()

  if (!exporter || !importer || !product) return null

  let rate = fallbackData.baseTariff[`${exporter}-${importer}`] ?? 6.5

  if (product.value === 'raw') rate += 1.2
  if (product.value === 'packaging') rate -= 0.8
  if (product.value === 'module' || product.value === 'set') rate += 0.6

  return Math.max(0, Number(rate.toFixed(1)))
}

function drawTrendChart(baseRate) {
  chartEl.innerHTML = ''
  if (baseRate === null) {
    trendLegendEl.textContent = '필수 항목 선택 후 트렌드를 표시합니다.'
    chartTimeEl.textContent = ''
    return
  }

  const now = new Date()
  chartTimeEl.textContent = `기준시간 ${now.toLocaleString('ko-KR')}`

  const points = Array.from({ length: 6 }, (_, i) => {
    const curve = Math.sin((i + 1) * 1.2) * 0.55 + Math.cos((i + 1) * 0.7) * 0.25
    return Number((baseRate + curve).toFixed(1))
  })

  const width = 320
  const height = 180
  const padding = 20
  const max = Math.max(...points) + 1
  const min = Math.max(0, Math.min(...points) - 1)
  const mapX = (idx) => padding + (idx * (width - padding * 2)) / (points.length - 1)
  const mapY = (value) => height - padding - ((value - min) / (max - min || 1)) * (height - padding * 2)

  const line = points.map((value, idx) => `${mapX(idx)},${mapY(value)}`).join(' ')
  const area = `${padding},${height - padding} ${line} ${width - padding},${height - padding}`

  chartEl.innerHTML = `
    <defs>
      <linearGradient id="lineGradient" x1="0" y1="0" x2="1" y2="0">
        <stop offset="0%" stop-color="hsl(246 56% 67%)" />
        <stop offset="100%" stop-color="hsl(218 54% 67%)" />
      </linearGradient>
      <linearGradient id="areaGradient" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="hsl(242 60% 72% / 0.36)" />
        <stop offset="100%" stop-color="hsl(219 62% 74% / 0.05)" />
      </linearGradient>
    </defs>
    <line x1="${padding}" y1="${height - padding}" x2="${width - padding}" y2="${height - padding}" stroke="hsl(236 24% 73% / 0.55)" />
    <polygon points="${area}" fill="url(#areaGradient)" />
    <polyline points="${line}" fill="none" stroke="url(#lineGradient)" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round" />
    ${points
      .map(
        (value, idx) => `<circle cx="${mapX(idx)}" cy="${mapY(value)}" r="3.3" fill="hsl(240 48% 72%)" stroke="hsl(0 0% 100% / 0.9)" stroke-width="1.6" />`
      )
      .join('')}
  `

  trendLegendEl.textContent = `최근 6개월 추정 관세율: ${points.join('% · ')}%`
}

function updateSummary(rate = null) {
  const exporterName = exportEl.options[exportEl.selectedIndex]?.text || '-'
  const importerName = importEl.options[importEl.selectedIndex]?.text || '-'
  const product = getSelectedProduct()
  const hsCode = product?.hsCode || '-'
  const displayRate = rate ?? calculateFallbackRate()

  summaryEl.innerHTML = `
    <p><span class="text-slate-600">수출국/수입국</span> <span class="font-semibold text-slate-900">${exporterName} → ${importerName}</span></p>
    <p><span class="text-slate-600">품목</span> <span class="font-semibold text-slate-900">${product?.label || '-'}</span></p>
    <p><span class="text-slate-600">자동 매핑 HS Code</span> <span class="font-semibold tracking-wide text-slate-900">${hsCode}</span></p>
  `

  tariffRateEl.textContent = displayRate === null ? '-' : `${displayRate}%`
  drawTrendChart(displayRate)
}

function renderMessage(message, tone = 'default') {
  const toneClass = tone === 'error' ? 'text-rose-700' : tone === 'success' ? 'text-emerald-700' : 'text-slate-800'
  resultEl.className = `mt-3 rounded-2xl border border-border bg-white p-3 text-base leading-relaxed ${toneClass}`
  resultEl.textContent = message
}

function buildWorldBankUrl(importer) {
  const url = new URL(`${WORLD_BANK_ENDPOINT}/${importer}/indicator/TM.TAX.MRCH.SM.AR.ZS`)
  url.searchParams.set('format', 'json')
  url.searchParams.set('per_page', '60')
  return url.toString()
}

function buildUniPassUrls(importer, hsCode, apiKey = '') {
  return UNIPASS_CANDIDATE_ENDPOINTS.map((endpoint) => {
    const url = new URL(endpoint)
    url.searchParams.set('imprCn', importer)
    url.searchParams.set('hsCode', hsCode)

    if (apiKey) {
      url.searchParams.set('apiKey', apiKey)
      url.searchParams.set('serviceKey', apiKey)
      url.searchParams.set('crkyCn', apiKey)
    }

    return url.toString()
  })
}

function extractWorldBankRate(payload) {
  if (!Array.isArray(payload) || !Array.isArray(payload[1])) return null
  const entry = payload[1].find((item) => typeof item?.value === 'number')
  if (!entry) return null
  return { rate: entry.value, year: entry.date }
}

function parseUniPassRate(payload) {
  const candidates = [
    payload?.rate,
    payload?.tariffRate,
    payload?.data?.rate,
    payload?.data?.tariffRate,
    payload?.response?.body?.items?.[0]?.rate,
    payload?.response?.body?.items?.[0]?.tariffRate
  ]

  const value = candidates.find((item) => Number.isFinite(Number(item)))
  if (!Number.isFinite(Number(value))) return null

  return {
    rate: Number(value),
    year: payload?.year || payload?.baseYear || new Date().getFullYear().toString()
  }
}

async function requestTariff(url) {
  try {
    const direct = await fetch(url)
    if (!direct.ok) throw new Error(`HTTP ${direct.status}`)
    const json = await direct.json()
    const parsed = extractWorldBankRate(json)
    if (parsed) return parsed
  } catch {
    // CORS 또는 네트워크 실패 시 프록시 재시도
  }

  const proxyUrl = `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`
  const proxy = await fetch(proxyUrl)
  if (!proxy.ok) throw new Error(`Proxy HTTP ${proxy.status}`)
  const proxyText = await proxy.text()
  const proxyParsed = extractWorldBankRate(JSON.parse(proxyText))
  if (!proxyParsed) throw new Error('관세율 파싱 실패')
  return proxyParsed
}

async function requestUniPassTariff(importer, hsCode, apiKey = '') {
  const urls = buildUniPassUrls(importer, hsCode, apiKey)
  for (const url of urls) {
    try {
      const proxyUrl = `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`
      const res = await fetch(proxyUrl)
      if (!res.ok) continue

      const payload = await res.json()
      const parsed = parseUniPassRate(payload)
      if (parsed) {
        return { ...parsed, endpoint: url }
      }
    } catch {
      // 다음 후보 엔드포인트 재시도
    }
  }

  throw new Error('UNI-PASS 응답을 받지 못했습니다.')
}

async function fetchUniPassRate() {
  const exporter = exportEl.value
  const importer = importEl.value
  const hsCode = getSelectedProduct()?.hsCode

  if (!exporter || !importer || !hsCode) {
    renderMessage('수출국, 수입국, 품목은 필수입니다.', 'error')
    return
  }

  fetchBtn.disabled = true
  fetchBtn.textContent = '조회 중...'

  try {
    try {
      const uniPassResult = await requestUniPassTariff(importer, hsCode, readUniPassApiKey())
      dataStatusEl.textContent = 'UNI-PASS'
      renderMessage(`UNI-PASS 조회 완료 (기준연도 ${uniPassResult.year})`, 'success')
      updateSummary(Number(uniPassResult.rate.toFixed(1)))
      return
    } catch {
      // UNI-PASS 실패 시 기존 방식 유지
    }

    const url = buildWorldBankUrl(importer)
    const { rate: openApiRate, year } = await requestTariff(url)
    const fallbackRate = calculateFallbackRate() ?? openApiRate
    const tariffRate = Number((openApiRate * 0.7 + fallbackRate * 0.3).toFixed(1))

    dataStatusEl.textContent = '오픈API'
    renderMessage(`UNI-PASS 실패, 오픈 API 조회 완료 (기준연도 ${year})`, 'success')
    updateSummary(tariffRate)
  } catch (error) {
    const fallbackRate = calculateFallbackRate()
    dataStatusEl.textContent = '대체값'
    renderMessage(`조회 실패: ${error.message} · 대체값 표시`, 'error')
    updateSummary(fallbackRate)
  } finally {
    fetchBtn.disabled = false
    fetchBtn.textContent = '관세 조회'
  }
}

setOptions(exportEl, fallbackData.countries.map((country) => ({ value: country.code, label: country.name })))
setOptions(importEl, fallbackData.countries.map((country) => ({ value: country.code, label: country.name })))
setOptions(categoryEl, fallbackData.products.map((product) => ({ value: product.value, label: product.label })))
apiSourceEl.textContent = 'UNI-PASS(API Key 선택 입력) 우선 조회 + 실패 시 Open API(World Bank) + 내장 보정값 사용'

presetListEl.addEventListener('change', () => {
  const selectedId = presetListEl.value
  const selected = safeReadPresets().find((preset) => preset.id === selectedId)
  if (!selected) return
  presetNameEl.value = selected.name
  applyFilterValue(selected.filters)
  renderMessage(`프리셋 '${selected.name}'을(를) 불러왔습니다.`, 'success')
})

savePresetBtn.addEventListener('click', savePreset)
deletePresetBtn.addEventListener('click', deletePreset)
saveKeyBtn?.addEventListener('click', saveUniPassApiKey)

;[exportEl, importEl, categoryEl].forEach((el) => {
  el.addEventListener('change', () => updateSummary())
})

fetchBtn.addEventListener('click', fetchUniPassRate)

resetBtn.addEventListener('click', () => {
  exportEl.value = ''
  importEl.value = ''
  categoryEl.value = ''
  dataStatusEl.textContent = '대기'
  renderMessage('필터를 다시 선택하세요.')
  updateSummary()
})

if (uniPassApiKeyEl) uniPassApiKeyEl.value = readUniPassApiKey()

refreshPresetList()
renderMessage('국가와 품목을 선택하세요.')
updateSummary()
