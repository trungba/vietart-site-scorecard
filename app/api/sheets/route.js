import { NextResponse } from 'next/server'
import {
  ensureSheets, getLocations, upsertLocation,
  getScores, saveScores, getSurveyData, saveSurveyData,
  getFullLocationData,
} from '@/lib/sheets'

// GET /api/sheets?action=locations
// GET /api/sheets?action=scores&locId=xxx
// GET /api/sheets?action=survey&locId=xxx
// GET /api/sheets?action=full&locId=xxx
// GET /api/sheets?action=init
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url)
    const action = searchParams.get('action')
    const locId = searchParams.get('locId')

    switch (action) {
      case 'init':
        const initResult = await ensureSheets()
        return NextResponse.json(initResult)

      case 'locations':
        const locs = await getLocations()
        return NextResponse.json({ locations: locs })

      case 'scores':
        if (!locId) return NextResponse.json({ error: 'locId required' }, { status: 400 })
        const scores = await getScores(locId)
        return NextResponse.json({ scores })

      case 'survey':
        if (!locId) return NextResponse.json({ error: 'locId required' }, { status: 400 })
        const survey = await getSurveyData(locId)
        return NextResponse.json({ survey })

      case 'full':
        if (!locId) return NextResponse.json({ error: 'locId required' }, { status: 400 })
        const full = await getFullLocationData(locId)
        return NextResponse.json(full)

      default:
        return NextResponse.json({ error: 'Unknown action. Use: init, locations, scores, survey, full' }, { status: 400 })
    }
  } catch (e) {
    console.error('Sheets GET error:', e)
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

// POST /api/sheets
// Body: { action, locId, data, user }
export async function POST(request) {
  try {
    const body = await request.json()
    const { action, locId, data, user } = body

    if (!action) return NextResponse.json({ error: 'action required' }, { status: 400 })

    switch (action) {
      case 'upsert_location':
        if (!locId || !data) return NextResponse.json({ error: 'locId and data required' }, { status: 400 })
        const locResult = await upsertLocation(locId, { ...data, created_by: user || '' })
        return NextResponse.json(locResult)

      case 'save_scores':
        if (!locId || !data) return NextResponse.json({ error: 'locId and data required' }, { status: 400 })
        const scoreResult = await saveScores(locId, data, user || '')
        return NextResponse.json(scoreResult)

      case 'save_survey':
        if (!locId || !data) return NextResponse.json({ error: 'locId and data required' }, { status: 400 })
        const surveyResult = await saveSurveyData(locId, data, user || '')
        return NextResponse.json(surveyResult)

      case 'save_all': {
        // Save location + survey + scores in one call
        if (!locId || !data) return NextResponse.json({ error: 'locId and data required' }, { status: 400 })
        const results = {}
        if (data.location) {
          results.location = await upsertLocation(locId, { ...data.location, created_by: user || '' })
        }
        if (data.survey && Object.keys(data.survey).length > 0) {
          results.survey = await saveSurveyData(locId, data.survey, user || '')
        }
        if (data.scores && Object.keys(data.scores).length > 0) {
          results.scores = await saveScores(locId, data.scores, user || '')
        }
        return NextResponse.json({ ok: true, results })
      }

      default:
        return NextResponse.json({ error: 'Unknown action. Use: upsert_location, save_scores, save_survey, save_all' }, { status: 400 })
    }
  } catch (e) {
    console.error('Sheets POST error:', e)
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
