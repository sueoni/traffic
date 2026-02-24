const data = {
  countries: ['대한민국', '미국', '중국', '베트남', '일본', 'EU'],
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
    '대한민국-미국': 4,
    '대한민국-중국': 7,
    '중국-미국': 10,
    '베트남-미국': 6,
    '일본-EU': 3
  }
}

const exportEl = document.getElementById('export-country')
const importEl = document.getElementById('import-country')
const categoryEl = document.getElementById('category')
const itemEl = document.getElementById('item')
const materialEl = document.getElementById('material')
const resultEl = document.getElementById('result')
const resetBtn = document.getElementById('reset-btn')

document.getElementById('update-date').textContent = new Date().toISOString().slice(0, 10).replaceAll('-', '.')

function setOptions(element, options) {
  element.innerHTML = '<option value="">-선택-</option>'
  options.forEach((option) => {
    const opt = document.createElement('option')
    opt.value = option.value
    opt.textContent = option.label
    element.appendChild(opt)
  })
}

function updateResult() {
  const exporter = exportEl.value
  const importer = importEl.value
  const category = categoryEl.value
  const item = itemEl.value
  const material = materialEl.value

  if (!exporter || !importer || !category) {
    resultEl.textContent = '수출국/수입국/품목(필요 시 세부/재질)을 선택하세요.'
    return
  }

  let rate = data.baseTariff[`${exporter}-${importer}`] ?? 8

  if (category === '전자기기') rate -= 1
  if (category === '자동차부품') rate += 2
  if (item) rate += 0.5
  if (material === '리튬' || material === '가죽') rate += 1.5

  rate = Math.max(0, Number(rate.toFixed(1)))
  resultEl.innerHTML = `
    <p class="font-semibold">예상 관세율: <span class="text-emerald-300">${rate}%</span></p>
    <p class="mt-1 text-lg text-slate-300">${exporter} → ${importer} / ${category}${item ? ` / ${item}` : ''}${material ? ` / ${material}` : ''}</p>
  `
}

setOptions(exportEl, data.countries.map((country) => ({ value: country, label: country })))
setOptions(importEl, data.countries.map((country) => ({ value: country, label: country })))
setOptions(categoryEl, Object.keys(data.categories).map((category) => ({ value: category, label: category })))

categoryEl.addEventListener('change', () => {
  const category = categoryEl.value
  if (!category) {
    itemEl.disabled = true
    materialEl.disabled = true
    setOptions(itemEl, [])
    setOptions(materialEl, [])
    updateResult()
    return
  }

  const items = Object.entries(data.categories[category]).map(([key, value]) => ({ value: key, label: value.label }))
  setOptions(itemEl, items)
  setOptions(materialEl, [])
  itemEl.disabled = false
  materialEl.disabled = true
  updateResult()
})

itemEl.addEventListener('change', () => {
  const category = categoryEl.value
  const item = itemEl.value

  if (!category || !item) {
    materialEl.disabled = true
    setOptions(materialEl, [])
    updateResult()
    return
  }

  const materials = data.categories[category][item].materials.map((material) => ({ value: material, label: material }))
  setOptions(materialEl, materials)
  materialEl.disabled = false
  updateResult()
})

;[exportEl, importEl, materialEl].forEach((el) => el.addEventListener('change', updateResult))

resetBtn.addEventListener('click', () => {
  exportEl.value = ''
  importEl.value = ''
  categoryEl.value = ''
  itemEl.disabled = true
  materialEl.disabled = true
  setOptions(itemEl, [])
  setOptions(materialEl, [])
  updateResult()
})
