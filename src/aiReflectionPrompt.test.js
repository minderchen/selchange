import { readFileSync } from 'node:fs'
import { after, test } from 'node:test'
import assert from 'node:assert/strict'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { createServer } from 'vite'

const server = await createServer({ server: { middlewareMode: true }, logLevel: 'silent' })
after(() => server.close())
const { AiReflectionPanel } = await server.ssrLoadModule('/src/App.jsx')
const hexagrams = JSON.parse(readFileSync(new URL('./data/hexagrams.json', import.meta.url), 'utf8'))
const original = hexagrams.find((item) => item.id === '010001')
const calculation = {
  originalId: original.id,
  original,
  pairTitle: '綜卦',
  comprehensive: hexagrams.find((item) => item.id === '100010'),
}

function renderPanel(changingHexagram, currentCalculation = calculation) {
  return renderToStaticMarkup(createElement(AiReflectionPanel, {
    journal: { questionText: '如何面對挑戰？', changingHexagram },
    calculation: currentCalculation,
  }))
}

test('includes the generated changing hexagram and changing line in the prompt', () => {
  const html = renderPanel({ originalId: '010001', line: 1 })
  assert.match(html, /### 【變卦】\s+第 8 卦 · 比/)
  assert.match(html, /變爻：第 1 爻（初爻），陽爻 → 陰爻/)
  assert.match(html, /請參考變卦及變爻/)
  assert.match(html, /變卦不代表未來必然發生/)
  assert.match(html, /「綜卦\/錯卦」與「變卦」/)
  assert.doesNotMatch(html, /: (?:&#x27;|')/)
  assert.match(html, /請以「本卦」作為主要分析依據/)

  const regenerated = renderPanel({ originalId: '010001', line: 2 })
  assert.match(regenerated, /變爻：第 2 爻（二爻），陰爻 → 陽爻/)
  assert.doesNotMatch(regenerated, /第 8 卦 · 比/)
})

test('omits changing hexagram content when not generated or stale', () => {
  for (const selection of [null, { originalId: '111111', line: 1 }]) {
    const html = renderPanel(selection)
    assert.doesNotMatch(html, /### 【變卦】|請參考變卦及變爻|與「變卦」|: (?:&#x27;|')/)
    assert.match(html, /### 【本卦】/)
    assert.match(html, /### 【綜卦\/錯卦】/)
  }
})

test('reports invalid saved changing line instead of including it', () => {
  const html = renderPanel({ originalId: '010001', line: 7 })
  assert.match(html, /已儲存的變爻資料無效，請重新產生變卦。/)
  assert.doesNotMatch(html, /### 【變卦】/)
})
