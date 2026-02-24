const data = {
  countries: [
    { name: '대한민국', code: 'KR' },
    { name: '미국', code: 'US' },
    { name: '중국', code: 'CN' },
    { name: '베트남', code: 'VN' },
    { name: '일본', code: 'JP' },
    { name: 'EU', code: 'EU' }
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
    'JP-EU': 3
  }
}

const UNIPASS_ENDPOINT = 'https://unipass.customs.go.kr:38010/ext/rest/trifFxrtInfoQry/retrieveTrifFxrtInfo'

const exportEl = document.getElementById('export-country')
const importEl = document.getElementById('import-country')
const categoryEl = document.getElementById('category')
const itemEl = document.getElementById('item')
const materialEl = document.getElementById('material')
const resultEl = document.getElementById('result')
const resetBtn = document.getElementById('reset-btn')
const hsCodeEl = document.getElementById('hs-code')
const apiKeyEl = document.getElementById('api-key')
const saveKeyBtn = document.getElementById('save-key-btn')
const fetchBtn = document.getElementById('fetch-btn')

const savedKey = localStorage.getItem('unipass_api_key') || ''
if (savedKey) apiKeyEl.value = savedKey

document.getElementById('update-date').textContent = new Date().toISOString().slice(0, 10).replaceAll('-', '.')

function setOptions(element, options) {
  element.innerHTML = '<option value="">선택하세요</option>'
  options.forEach((option) => {
    const opt = document.createElement('option')
    opt.value = option.value
    opt.textContent = option.label
    element.appendChild(opt)
  })
}

function getSelectedCountryCode(selectEl) {
  return selectEl.value
}

function renderMessage(html, tone = 'default') {
  const toneClass = tone === 'error' ? 'text-rose-300' : tone === 'success' ? 'text-emerald-300' : 'text-slate-200'
  resultEl.innerHTML = `<div class="space-y-2 ${toneClass}">${html}</div>`
}

function calculateFallbackRate() {
  const exporter = getSelectedCountryCode(exportEl)
  const importer = getSelectedCountryCode(importEl)
  const category = categoryEl.value
  const item = itemEl.value
  const material = materialEl.value

  if (!exporter || !importer || !category) return null

  let rate = data.baseTariff[`${exporter}-${importer}`] ?? 8
  if (category === '전자기기') rate -= 1
  if (category === '자동차부품') rate += 2
  if (item) rate += 0.5
  if (material === '리튬' || material === '가죽') rate += 1.5

  return Math.max(0, Number(rate.toFixed(1)))
}

function updateResultPreview() {
  const exporterName = exportEl.options[exportEl.selectedIndex]?.text || '-'
  const importerName = importEl.options[importEl.selectedIndex]?.text || '-'
  const category = categoryEl.value || '-'
  const item = itemEl.options[itemEl.selectedIndex]?.text || '-'
  const material = materialEl.options[materialEl.selectedIndex]?.text || '-'
  const hsCode = hsCodeEl.value.trim() || '-'

  const fallbackRate = calculateFallbackRate()
  renderMessage(`
    <p><strong>선택 요약</strong></p>
    <p>${exporterName} → ${importerName} / ${category} / ${item} / ${material}</p>
    <p>HS Code: ${hsCode}</p>
    <p class="text-xs text-muted-foreground">예상(샘플) 관세율: ${fallbackRate === null ? '-' : `${fallbackRate}%`}</p>
  `)
}

async function fetchUniPassRate() {
  const apiKey = apiKeyEl.value.trim()
  const exporter = getSelectedCountryCode(exportEl)
  const importer = getSelectedCountryCode(importEl)
  const hsCode = hsCodeEl.value.trim()

  if (!exporter || !importer || !categoryEl.value) {
    renderMessage('<p>수출국/수입국/품목군은 필수입니다.</p>', 'error')
    return
  }

  if (!/^\d{6,10}$/.test(hsCode)) {
    renderMessage('<p>HS Code는 숫자 6~10자리로 입력해주세요.</p>', 'error')
    return
  }

  if (!apiKey) {
    renderMessage('<p>UNI-PASS 인증키를 먼저 입력/저장해주세요.</p>', 'error')
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

    const res = await fetch(url.toString())
    if (!res.ok) throw new Error(`HTTP ${res.status}`)

    const text = await res.text()
    let tariffRate = null

    try {
      const json = JSON.parse(text)
      const flat = JSON.stringify(json)
      const match = flat.match(/(\d+(?:\.\d+)?)\s*%/)
      if (match) tariffRate = Number(match[1])
    } catch {
      const xmlMatch = text.match(/<(?:aplyRate|tariffRate|trffRt|rate)>(\d+(?:\.\d+)?)<\//i)
      if (xmlMatch) tariffRate = Number(xmlMatch[1])
    }

    if (tariffRate === null || Number.isNaN(tariffRate)) {
      throw new Error('관세율 필드를 파싱하지 못했습니다.')
    }

    renderMessage(`
      <p class="text-emerald-300"><strong>UNI-PASS 실조회 성공</strong></p>
      <p>HS Code ${hsCode} 기준 관세율: <strong>${tariffRate}%</strong></p>
      <p class="text-xs text-muted-foreground">응답 원문 길이: ${text.length.toLocaleString()} chars</p>
    `, 'success')
  } catch (error) {
    const fallbackRate = calculateFallbackRate()
    renderMessage(`
      <p><strong>UNI-PASS 조회 실패</strong> (${error.message})</p>
      <p>대체 계산치: <strong>${fallbackRate === null ? '-' : `${fallbackRate}%`}</strong></p>
      <p class="text-xs text-muted-foreground">인증키 권한, 파라미터명, CORS 설정을 확인해주세요.</p>
    `, 'error')
  } finally {
    fetchBtn.disabled = false
    fetchBtn.textContent = 'UNI-PASS 관세 조회'
  }
}

setOptions(exportEl, data.countries.map((country) => ({ value: country.code, label: country.name })))
setOptions(importEl, data.countries.map((country) => ({ value: country.code, label: country.name })))
setOptions(categoryEl, Object.keys(data.categories).map((category) => ({ value: category, label: category })))

categoryEl.addEventListener('change', () => {
  const category = categoryEl.value
  if (!category) {
    itemEl.disabled = true
    materialEl.disabled = true
    setOptions(itemEl, [])
    setOptions(materialEl, [])
    updateResultPreview()
    return
  }

  const items = Object.entries(data.categories[category]).map(([key, value]) => ({ value: key, label: value.label }))
  setOptions(itemEl, items)
  setOptions(materialEl, [])
  itemEl.disabled = false
  materialEl.disabled = true
  updateResultPreview()
})

itemEl.addEventListener('change', () => {
  const category = categoryEl.value
  const item = itemEl.value

  if (!category || !item) {
    materialEl.disabled = true
    setOptions(materialEl, [])
    updateResultPreview()
    return
  }

  const materials = data.categories[category][item].materials.map((material) => ({ value: material, label: material }))
  setOptions(materialEl, materials)
  materialEl.disabled = false
  updateResultPreview()
})

;[exportEl, importEl, materialEl, hsCodeEl].forEach((el) => el.addEventListener('change', updateResultPreview))

saveKeyBtn.addEventListener('click', () => {
  localStorage.setItem('unipass_api_key', apiKeyEl.value.trim())
  renderMessage('<p>인증키를 로컬 스토리지에 저장했습니다.</p>', 'success')
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
  updateResultPreview()
})

updateResultPreview()
