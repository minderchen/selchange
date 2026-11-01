import { readFileSync } from 'node:fs'
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { changeHexagramId, drawChangingLine } from './changingHexagram.js'

const hexagrams = JSON.parse(readFileSync(new URL('./data/hexagrams.json', import.meta.url), 'utf8'))

test('changes the specified line from right to left in every hexagram', () => {
  assert.equal(hexagrams.length, 64)
  for (const { id } of hexagrams) {
    for (let line = 1; line <= 6; line++) {
      const changed = changeHexagramId(id, line)
      assert.equal(changed.length, 6)
      assert.deepEqual([...changed].map((bit, index) => bit !== id[index] ? index : -1).filter((index) => index >= 0), [6 - line])
      assert.ok(hexagrams.some((hexagram) => hexagram.id === changed), `${changed} missing from dataset`)
      assert.equal(changeHexagramId(changed, line), id)
    }
  }
})

test('preserves leading zeros and looks up the examples in the dataset', () => {
  const first = hexagrams.find((item) => item.id === changeHexagramId('010001', 1))
  assert.equal(first.id, '010000')
  assert.equal(first.seq, 8)
  assert.equal(first.hexagram, '比')
  const second = changeHexagramId('010001', 2)
  assert.equal(second, '010011')
  assert.ok(hexagrams.some((item) => item.id === second))
})

test('rejects invalid IDs and line numbers', () => {
  for (const id of ['10001', '0100010', '012001', 10001, null]) {
    assert.throws(() => changeHexagramId(id, 1), TypeError)
  }
  for (const line of [0, 7, 1.5, '1', null]) {
    assert.throws(() => changeHexagramId('010001', line), RangeError)
  }
})

test('samples all six lines uniformly and rejects biased byte values', () => {
  const counts = Array(6).fill(0)
  for (let byte = 0; byte < 252; byte++) {
    const line = drawChangingLine((sample) => { sample[0] = byte })
    counts[line - 1]++
  }
  assert.deepEqual(counts, [42, 42, 42, 42, 42, 42])
  const samples = [252, 253, 254, 255, 0]
  assert.equal(drawChangingLine((sample) => { sample[0] = samples.shift() }), 1)
  assert.equal(samples.length, 0)
})
