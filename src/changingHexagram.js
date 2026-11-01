export function changeHexagramId(id, changingLine) {
  if (typeof id !== 'string' || !/^[01]{6}$/.test(id)) {
    throw new TypeError('本卦 ID 必須是六位二進位字串。')
  }
  if (!Number.isInteger(changingLine) || changingLine < 1 || changingLine > 6) {
    throw new RangeError('變爻必須是 1 至 6 的整數。')
  }
  const index = 6 - changingLine
  return id.slice(0, index) + (id[index] === '0' ? '1' : '0') + id.slice(index + 1)
}

export function drawChangingLine(getRandomValues) {
  const sample = new Uint8Array(1)
  do {
    getRandomValues(sample)
  } while (sample[0] >= 252)
  return sample[0] % 6 + 1
}
