import { google } from 'googleapis'

function getAuth() {
  const email = process.env.GOOGLE_SHEETS_CLIENT_EMAIL
  let key = process.env.GOOGLE_SHEETS_PRIVATE_KEY
  
  if (!email || !key) throw new Error(`Missing credentials. EMAIL=${!!email}, KEY=${!!key}`)
  
  // Handle all possible formats of private key from Vercel env vars
  // Sometimes Vercel wraps in quotes, sometimes \n stays literal
  key = key.replace(/\\n/g, '\n')        // literal \n → real newline
  key = key.replace(/^["']|["']$/g, '')   // strip surrounding quotes
  
  // Verify key looks correct
  if (!key.includes('BEGIN PRIVATE KEY')) {
    throw new Error('PRIVATE_KEY format invalid — must contain BEGIN PRIVATE KEY header')
  }
  
  return new google.auth.JWT(email, undefined, key, [
    'https://www.googleapis.com/auth/spreadsheets',
  ])
}

function getSheets() {
  return google.sheets({ version: 'v4', auth: getAuth() })
}

const SHEET_ID = () => {
  const id = process.env.SPREADSHEET_ID
  if (!id) throw new Error('Missing SPREADSHEET_ID in env')
  return id
}

// ── SHEETS STRUCTURE ──
// Sheet "Locations": location_id | name | concept | address | area | frontage | rent | ... (survey data)
// Sheet "Scores": location_id | criteria_idx | score | scorer | timestamp
// Sheet "SurveyRaw": location_id | field_key | value | surveyor | timestamp

export async function ensureSheets() {
  const sheets = getSheets()
  const spreadsheet = await sheets.spreadsheets.get({ spreadsheetId: SHEET_ID() })
  const existing = spreadsheet.data.sheets?.map(s => s.properties?.title) || []

  const needed = ['Locations', 'Scores', 'SurveyData']
  for (const name of needed) {
    if (!existing.includes(name)) {
      await sheets.spreadsheets.batchUpdate({
        spreadsheetId: SHEET_ID(),
        requestBody: {
          requests: [{ addSheet: { properties: { title: name } } }],
        },
      })
    }
  }

  // Add headers if sheets are empty
  const headers = {
    Locations: ['location_id', 'name', 'concept', 'created_by', 'created_at', 'updated_at'],
    Scores: ['location_id', 'criteria_idx', 'score', 'scorer', 'timestamp'],
    SurveyData: ['location_id', 'field_key', 'value', 'surveyor', 'timestamp'],
  }

  for (const [sheet, hdr] of Object.entries(headers)) {
    const res = await sheets.spreadsheets.values.get({
      spreadsheetId: SHEET_ID(),
      range: `${sheet}!A1:A1`,
    })
    if (!res.data.values || res.data.values.length === 0) {
      await sheets.spreadsheets.values.update({
        spreadsheetId: SHEET_ID(),
        range: `${sheet}!A1`,
        valueInputOption: 'RAW',
        requestBody: { values: [hdr] },
      })
    }
  }

  return { ok: true }
}

// ── LOCATIONS ──

export async function getLocations() {
  const sheets = getSheets()
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: SHEET_ID(),
    range: 'Locations!A:F',
  })
  const rows = res.data.values || []
  if (rows.length <= 1) return []
  const headers = rows[0]
  return rows.slice(1).map(row => {
    const obj = {}
    headers.forEach((h, i) => { obj[h] = row[i] || '' })
    return obj
  })
}

export async function upsertLocation(locId, data) {
  const sheets = getSheets()
  const existing = await getLocations()
  const idx = existing.findIndex(l => l.location_id === locId)

  if (idx >= 0) {
    // Update
    const rowNum = idx + 2 // +1 for header, +1 for 1-indexed
    await sheets.spreadsheets.values.update({
      spreadsheetId: SHEET_ID(),
      range: `Locations!A${rowNum}:F${rowNum}`,
      valueInputOption: 'RAW',
      requestBody: {
        values: [[locId, data.name || '', data.concept || '', data.created_by || '', data.created_at || '', new Date().toISOString()]],
      },
    })
  } else {
    // Append
    await sheets.spreadsheets.values.append({
      spreadsheetId: SHEET_ID(),
      range: 'Locations!A:F',
      valueInputOption: 'RAW',
      requestBody: {
        values: [[locId, data.name || '', data.concept || '', data.created_by || '', new Date().toISOString(), new Date().toISOString()]],
      },
    })
  }
  return { ok: true }
}

// ── SCORES ──

export async function getScores(locId) {
  const sheets = getSheets()
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: SHEET_ID(),
    range: 'Scores!A:E',
  })
  const rows = res.data.values || []
  if (rows.length <= 1) return {}
  const scores = {}
  rows.slice(1).forEach(row => {
    if (row[0] === locId) {
      scores[row[1]] = parseInt(row[2]) || null
    }
  })
  return scores
}

export async function saveScores(locId, scores, scorer) {
  const sheets = getSheets()
  const now = new Date().toISOString()

  // Get existing scores for this location
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: SHEET_ID(),
    range: 'Scores!A:E',
  })
  const rows = res.data.values || []

  // Find rows to update vs append
  const existingRows = {} // criteria_idx -> row number
  rows.forEach((row, i) => {
    if (i === 0) return // header
    if (row[0] === locId) existingRows[row[1]] = i + 1 // 1-indexed
  })

  const updates = []
  const appends = []

  for (const [idx, score] of Object.entries(scores)) {
    if (score === null || score === undefined) continue
    const rowData = [locId, String(idx), String(score), scorer || '', now]
    if (existingRows[String(idx)]) {
      const rowNum = existingRows[String(idx)]
      updates.push({
        range: `Scores!A${rowNum}:E${rowNum}`,
        values: [rowData],
      })
    } else {
      appends.push(rowData)
    }
  }

  // Batch update existing
  if (updates.length > 0) {
    await sheets.spreadsheets.values.batchUpdate({
      spreadsheetId: SHEET_ID(),
      requestBody: {
        valueInputOption: 'RAW',
        data: updates,
      },
    })
  }

  // Append new
  if (appends.length > 0) {
    await sheets.spreadsheets.values.append({
      spreadsheetId: SHEET_ID(),
      range: 'Scores!A:E',
      valueInputOption: 'RAW',
      requestBody: { values: appends },
    })
  }

  return { ok: true, updated: updates.length, appended: appends.length }
}

// ── SURVEY DATA ──

export async function getSurveyData(locId) {
  const sheets = getSheets()
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: SHEET_ID(),
    range: 'SurveyData!A:E',
  })
  const rows = res.data.values || []
  if (rows.length <= 1) return {}
  const data = {}
  rows.slice(1).forEach(row => {
    if (row[0] === locId) data[row[1]] = row[2] || ''
  })
  return data
}

export async function saveSurveyData(locId, surveyData, surveyor) {
  const sheets = getSheets()
  const now = new Date().toISOString()

  // Get existing
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: SHEET_ID(),
    range: 'SurveyData!A:E',
  })
  const rows = res.data.values || []

  const existingRows = {}
  rows.forEach((row, i) => {
    if (i === 0) return
    if (row[0] === locId) existingRows[row[1]] = i + 1
  })

  const updates = []
  const appends = []

  for (const [key, value] of Object.entries(surveyData)) {
    if (value === null || value === undefined || value === '') continue
    const rowData = [locId, key, String(value), surveyor || '', now]
    if (existingRows[key]) {
      updates.push({
        range: `SurveyData!A${existingRows[key]}:E${existingRows[key]}`,
        values: [rowData],
      })
    } else {
      appends.push(rowData)
    }
  }

  if (updates.length > 0) {
    await sheets.spreadsheets.values.batchUpdate({
      spreadsheetId: SHEET_ID(),
      requestBody: { valueInputOption: 'RAW', data: updates },
    })
  }

  if (appends.length > 0) {
    await sheets.spreadsheets.values.append({
      spreadsheetId: SHEET_ID(),
      range: 'SurveyData!A:E',
      valueInputOption: 'RAW',
      requestBody: { values: appends },
    })
  }

  return { ok: true }
}

// ── GET ALL DATA FOR A LOCATION ──

export async function getFullLocationData(locId) {
  const [scores, survey] = await Promise.all([
    getScores(locId),
    getSurveyData(locId),
  ])
  return { scores, survey }
}

// ── GET ALL LOCATIONS WITH SCORES (for dashboard) ──

export async function getAllData() {
  const [locations, scoresRes, surveyRes] = await Promise.all([
    getLocations(),
    getSheets().then(s => s.spreadsheets.values.get({ spreadsheetId: SHEET_ID(), range: 'Scores!A:E' }).catch(() => ({ data: { values: [] } }))),
    getSheets().then(s => s.spreadsheets.values.get({ spreadsheetId: SHEET_ID(), range: 'SurveyData!A:E' }).catch(() => ({ data: { values: [] } }))),
  ])

  // This is a simplified version - the actual function above is cleaner
  // Just return locations list for now, client fetches details per location
  return { locations }
}
