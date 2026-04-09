import { NextResponse } from 'next/server'

// GET /api/debug — kiểm tra env vars (không hiện giá trị, chỉ hiện trạng thái)
export async function GET() {
  const email = process.env.GOOGLE_SHEETS_CLIENT_EMAIL || ''
  const key = process.env.GOOGLE_SHEETS_PRIVATE_KEY || ''
  const sheetId = process.env.SPREADSHEET_ID || ''

  return NextResponse.json({
    email_exists: !!email,
    email_preview: email ? email.slice(0, 20) + '...' : 'MISSING',
    key_exists: !!key,
    key_length: key.length,
    key_has_begin: key.includes('BEGIN PRIVATE KEY'),
    key_has_end: key.includes('END PRIVATE KEY'),
    key_has_literal_backslash_n: key.includes('\\n'),
    key_first_30: key ? key.slice(0, 30) + '...' : 'MISSING',
    sheet_id_exists: !!sheetId,
    sheet_id_preview: sheetId ? sheetId.slice(0, 15) + '...' : 'MISSING',
  })
}
