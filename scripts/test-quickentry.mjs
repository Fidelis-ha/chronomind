// Parser-Tests für QuickEntry (JS-Port der Logik, gleiche Regexe)
function parseTimeToken(t) {
  const m = t.match(/^(\d{1,2})(?::(\d{2}))?$/)
  if (!m) return null
  const h = parseInt(m[1], 10)
  const min = m[2] ? parseInt(m[2], 10) : 0
  if (h > 23 || min > 59) return null
  return { h, m: min }
}
function parseDurationToken(t) {
  let m = t.match(/^(\d{1,2}):(\d{2})$/)
  if (m) return parseInt(m[1], 10) * 3600 + parseInt(m[2], 10) * 60
  m = t.match(/^(\d+(?:[.,]\d+)?)\s*(h|std|stunden?|m|min|minuten?)$/i)
  if (m) {
    const n = parseFloat(m[1].replace(',', '.'))
    return /^h|std|stunden?$/i.test(m[2]) ? Math.round(n * 3600) : Math.round(n * 60)
  }
  m = t.match(/^(\d+)h(\d{1,2})$/i)
  if (m) return parseInt(m[1], 10) * 3600 + parseInt(m[2], 10) * 60
  return null
}
function applyDate(base, dateToken) {
  const d = new Date(base)
  if (!dateToken) return d
  const now = new Date()
  const t = dateToken.toLowerCase()
  if (t === 'gestern') d.setDate(now.getDate() - 1)
  else if (t === 'vorgestern') d.setDate(now.getDate() - 2)
  else {
    const m = t.match(/^(\d{1,2})\.(\d{1,2})\.(\d{2,4})?$/)
    if (m) {
      const year = m[3] ? (m[3].length === 2 ? 2000 + parseInt(m[3], 10) : parseInt(m[3], 10)) : now.getFullYear()
      d.setFullYear(year, parseInt(m[2], 10) - 1, parseInt(m[1], 10))
    }
  }
  return d
}
function parseQuickEntry(input) {
  const now = new Date()
  let text = input.trim()
  if (!text) return { error: 'Leer' }
  let dateToken = null
  const dateMatch = text.match(/^(gestern|vorgestern|\d{1,2}\.\d{1,2}\.(?:\d{2,4})?)\s+/i)
  if (dateMatch) { dateToken = dateMatch[1]; text = text.slice(dateMatch[0].length) }
  const tags = []
  let category = null
  const tagRegex = /(?:^|\s)([@#])([\wäöüÄÖÜß-]+)/g
  let tagMatch
  while ((tagMatch = tagRegex.exec(text)) !== null) {
    if (tagMatch[1] === '@') category = tagMatch[2]
    else tags.push(tagMatch[2])
  }
  text = text.replace(tagRegex, '').replace(/\s+/g, ' ').trim()
  const rangeMatch = text.match(/^(\d{1,2}(?::\d{2})?)\s*(?:-|–|bis\s+)\s*(\d{1,2}(?::\d{2})?|\d{1,2}h\d{1,2}|\d+(?:[.,]\d+)?\s*(?:h|std|m|min)?)\s+(.+)$/i)
  const durMatch = text.match(/^(?:\+)?(\d{1,2}(?::\d{2})?|\d+(?:[.,]\d+)?\s*(?:h|std|m|min)|\d+h\d{1,2})\s+(.+)$/i)
  let startH, startM, endH = null, endM = null, duration = null, title = ''
  if (rangeMatch) {
    const s = parseTimeToken(rangeMatch[1])
    if (!s) return { error: `Ungültige Startzeit: ${rangeMatch[1]}` }
    startH = s.h; startM = s.m
    const dTok = parseDurationToken(rangeMatch[2])
    if (dTok !== null && !rangeMatch[2].includes(':')) { duration = dTok } else {
      const e = parseTimeToken(rangeMatch[2])
      if (!e) return { error: `Ungültige Endzeit: ${rangeMatch[2]}` }
      endH = e.h; endM = e.m
    }
    title = rangeMatch[3].trim()
  } else if (durMatch) {
    const d = parseDurationToken(durMatch[1])
    if (d === null || d <= 0) return { error: `Ungültige Dauer: ${durMatch[1]}` }
    duration = d
    title = durMatch[2].trim()
    const endD = applyDate(now, dateToken)
    const startDate = new Date(endD.getTime() - d * 1000)
    return {
      title, category, tags,
      started_at: startDate.toISOString(),
      ended_at: endD.toISOString(),
      duration_seconds: d,
      dateLabel: dateToken || 'heute'
    }
  } else {
    return { error: 'Zeit fehlt. Beispiel: 14:30-15:45 Titel oder +45m Titel' }
  }
  if (!title) return { error: 'Titel fehlt' }
  const startDate = applyDate(now, dateToken)
  startDate.setHours(startH, startM, 0, 0)
  let endDate = null, duration_seconds = null
  if (endH !== null && endM !== null) {
    endDate = applyDate(now, dateToken)
    endDate.setHours(endH, endM, 0, 0)
    if (endDate <= startDate) endDate.setDate(endDate.getDate() + 1)
    duration_seconds = Math.round((endDate.getTime() - startDate.getTime()) / 1000)
  } else if (duration !== null) {
    endDate = new Date(startDate.getTime() + duration * 1000)
    duration_seconds = duration
  }
  return { title, category, tags, started_at: startDate.toISOString(), ended_at: endDate ? endDate.toISOString() : null, duration_seconds, dateLabel: dateToken || 'heute' }
}

const cases = [
  '14:30-15:45 Projektarbeit @Arbeit',
  '9-11:30 Kaffee mit Anna',
  '08:30+1:45 Mails',
  '+45m Pause',
  '1h15 Telefonat mit Schneider #kunde',
  'gestern 10-12 Büro @Projekt #deepwork',
  '23.09. 8-9 Frühsport',
  '90min Wochenrückblick',
  '22:00-01:00 Nachtschicht',
  'ohne zeit',
  ''
]
let failures = 0
for (const c of cases) {
  const r = parseQuickEntry(c)
  if (r.error) { console.log(`✗ "${c}" → FEHLER: ${r.error}`); continue }
  const dur = r.duration_seconds
  const h = Math.floor((dur||0)/3600), m = Math.round(((dur||0)%3600)/60)
  console.log(`✓ "${c}" → ${r.title} | @${r.category||'-'} #${r.tags.join(',')||'-'} | ${r.started_at.slice(11,16)}-${r.ended_at.slice(11,16)} | ${h}h${m}m`)
  // Sanity: Dauer muss positiv sein
  if (dur !== null && dur <= 0) { console.log('  !! NEGATIVE DAUER'); failures++ }
}
console.log(failures === 0 ? 'ALLE SANITY-CHECKS OK' : `${failures} FEHLER`)
