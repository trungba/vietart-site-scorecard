'use client'
import { useState, useEffect, useMemo, useCallback, useRef } from 'react'
import { GROUPS, CRITERIA, TRAFFIC_SLOTS, SURVEY_FIELDS, SURVEY_SECTIONS, calcResults, getVerdict } from '@/lib/data'
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Legend, Cell } from 'recharts'
import * as XLSX from 'xlsx'

const COLORS = ['#1565C0','#00897B','#E65100','#C62828','#2E7D32']

function emptyLoc(id) {
  return { id, name:`Location ${id}`, survey:{}, scores:{} }
}

// ── Google Sheets Sync Hook ──
function useSheetSync() {
  const [syncing, setSyncing] = useState(false)
  const [lastSync, setLastSync] = useState(null)
  const [syncError, setSyncError] = useState(null)
  const [cloudEnabled, setCloudEnabled] = useState(false)

  // Check if API is available
  useEffect(() => {
    fetch('/api/sheets?action=init')
      .then(r => r.json())
      .then(d => { if (d.ok) setCloudEnabled(true) })
      .catch(() => setCloudEnabled(false))
  }, [])

  const syncToCloud = useCallback(async (locId, data, user) => {
    if (!cloudEnabled) return
    setSyncing(true)
    setSyncError(null)
    try {
      const res = await fetch('/api/sheets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'save_all',
          locId: String(locId),
          data: {
            location: { name: data.name, concept: data.survey?.concept || '' },
            survey: data.survey || {},
            scores: data.scores || {},
          },
          user: user || '',
        }),
      })
      const result = await res.json()
      if (result.ok) setLastSync(new Date().toLocaleTimeString('vi-VN'))
      else setSyncError(result.error)
    } catch (e) {
      setSyncError(e.message)
    }
    setSyncing(false)
  }, [cloudEnabled])

  const loadFromCloud = useCallback(async (locId) => {
    if (!cloudEnabled) return null
    try {
      const res = await fetch(`/api/sheets?action=full&locId=${locId}`)
      const data = await res.json()
      return data
    } catch { return null }
  }, [cloudEnabled])

  const loadLocations = useCallback(async () => {
    if (!cloudEnabled) return null
    try {
      const res = await fetch('/api/sheets?action=locations')
      const data = await res.json()
      return data.locations || []
    } catch { return null }
  }, [cloudEnabled])

  return { syncing, lastSync, syncError, cloudEnabled, syncToCloud, loadFromCloud, loadLocations }
}

export default function Home() {
  const [tab, setTab] = useState('survey')
  const [locs, setLocs] = useState([emptyLoc(1),emptyLoc(2),emptyLoc(3),emptyLoc(4),emptyLoc(5)])
  const [aLoc, setALoc] = useState(1)
  const [guide, setGuide] = useState(null)
  const [loaded, setLoaded] = useState(false)
  const [userName, setUserName] = useState('')
  const syncTimer = useRef(null)
  const { syncing, lastSync, syncError, cloudEnabled, syncToCloud, loadFromCloud, loadLocations } = useSheetSync()

  // Load from localStorage
  useEffect(() => {
    try {
      const d = localStorage.getItem('vietart-scorecard')
      if (d) { const p = JSON.parse(d); if (p.locs) setLocs(p.locs); if (p.aLoc) setALoc(p.aLoc); if (p.userName) setUserName(p.userName) }
    } catch(e) {}
    setLoaded(true)
  }, [])

  // Save to localStorage + debounced cloud sync
  useEffect(() => {
    if (!loaded) return
    try { localStorage.setItem('vietart-scorecard', JSON.stringify({locs,aLoc,userName})) } catch(e) {}

    // Debounced cloud sync (3 seconds after last change)
    if (cloudEnabled) {
      clearTimeout(syncTimer.current)
      syncTimer.current = setTimeout(() => {
        const loc = locs.find(l => l.id === aLoc)
        if (loc && (Object.keys(loc.survey||{}).length > 0 || Object.keys(loc.scores||{}).length > 0)) {
          syncToCloud(aLoc, loc, userName)
        }
      }, 3000)
    }
  }, [locs, aLoc, loaded, userName, cloudEnabled, syncToCloud])

  const loc = locs.find(l=>l.id===aLoc) || locs[0]
  const upLoc = (id, fn) => setLocs(p => p.map(l => l.id===id ? {...l,...fn(l)} : l))
  const upSurvey = (k,v) => upLoc(aLoc, l => ({survey:{...l.survey,[k]:v}}))
  const upScore = (idx,v) => upLoc(aLoc, l => ({scores:{...l.scores,[idx]:v}}))

  const results = useMemo(() => calcResults(locs), [locs])
  const activeResults = results.filter(r => r.answered > 0)

  const tabs = [
    {id:'survey', label:'T.A Survey', icon:'📋'},
    {id:'scoring', label:'Scoring', icon:'⭐'},
    {id:'dashboard', label:'Dashboard', icon:'📊'},
    {id:'export', label:'Export', icon:'💾'},
  ]

  // ── EXPORT XLSX ──
  const exportXLSX = () => {
    const wb = XLSX.utils.book_new()
    const today = new Date().toLocaleDateString('vi-VN')
    const fileName = `${new Date().toISOString().slice(2,10).replace(/-/g,'')}_OPS_NSO_SiteScorecard`

    // Sheet 1: Dashboard — tổng hợp
    const dashData = [
      ['VIETART F&B — SITE SCORECARD REPORT'],
      [`Ngày xuất: ${today}`],
      [],
      ['BẢNG TỔNG HỢP KẾT QUẢ'],
      ['Location', 'Địa chỉ', 'Diện tích (m²)', 'Mặt tiền (m)', 'Giá thuê', 'Tổng điểm', 'Điểm tối đa', 'Tỷ lệ (%)', 'Critical Fail', 'Kết luận'],
    ]
    activeResults.forEach(r => {
      const l = locs.find(x => x.id === r.locId)
      dashData.push([
        r.name, l.survey.address||'', l.survey.area||'', l.survey.frontage||'', l.survey.rent||'',
        parseFloat(r.totalW.toFixed(2)), parseFloat(r.totalMax.toFixed(2)),
        parseFloat((r.pct*100).toFixed(1)), r.totalCrit, r.verdict?.label||'—'
      ])
    })
    dashData.push([], ['ĐIỂM THEO NHÓM TIÊU CHÍ'])
    const grpHeader = ['Nhóm tiêu chí', 'Trọng số (%)']
    activeResults.forEach(r => grpHeader.push(r.name))
    dashData.push(grpHeader)
    GROUPS.forEach((g, gi) => {
      const row = [g.name, g.weight]
      activeResults.forEach(r => row.push(parseFloat(r.groupScores[gi].weighted.toFixed(2))))
      dashData.push(row)
    })
    const wsDash = XLSX.utils.aoa_to_sheet(dashData)
    wsDash['!cols'] = [{wch:30},{wch:35},{wch:12},{wch:12},{wch:15},{wch:10},{wch:10},{wch:10},{wch:12},{wch:18}]
    XLSX.utils.book_append_sheet(wb, wsDash, 'Dashboard')

    // Sheet 2: Scoring — chi tiết điểm từng location
    activeResults.forEach(r => {
      const l = locs.find(x => x.id === r.locId)
      const scoreData = [
        [`SCORING — ${r.name}`],
        [`Địa chỉ: ${l.survey.address||'—'}`],
        [`Tỷ lệ: ${(r.pct*100).toFixed(1)}% | Kết luận: ${r.verdict?.label||'—'}`],
        [],
        ['STT', 'Nhóm', 'Tiêu chí', 'Critical', 'W tiêu chí (%)', 'Điểm (1-5)', 'Điểm quy đổi'],
      ]
      CRITERIA.forEach((c, ci) => {
        const score = l.scores[ci] || ''
        const g = GROUPS.find(g => g.id === c.g)
        const weighted = score ? parseFloat((score * g.weight/100 * c.w/100).toFixed(3)) : ''
        scoreData.push([
          ci+1, g.name, c.n, c.c?'Yes':'No', c.w, score, weighted
        ])
      })
      scoreData.push([], ['', '', '', '', 'TỔNG:', '', parseFloat(r.totalW.toFixed(2))])
      const wsScore = XLSX.utils.aoa_to_sheet(scoreData)
      wsScore['!cols'] = [{wch:5},{wch:22},{wch:40},{wch:8},{wch:10},{wch:10},{wch:12}]
      const sheetName = r.name.slice(0, 28) // Excel max 31 chars
      XLSX.utils.book_append_sheet(wb, wsScore, sheetName)
    })

    // Sheet 3: Survey Data
    activeResults.forEach(r => {
      const l = locs.find(x => x.id === r.locId)
      const survData = [
        [`T.A SURVEY — ${r.name}`],
        [`Ngày: ${today}`],
        [],
        ['Hạng mục', 'Giá trị'],
      ]
      SURVEY_FIELDS.forEach(f => {
        if (l.survey[f.key]) survData.push([f.label, l.survey[f.key]])
      })
      // Traffic data
      survData.push([], ['BẢNG ĐẾM LƯU LƯỢNG'], ['Khung giờ', 'Đi bộ', 'Xe máy', 'Ô tô', 'Tổng/15p', 'Ước/giờ'])
      TRAFFIC_SLOTS.forEach((s, si) => {
        const w = parseInt(l.survey[`tf_w_${si}`])||0
        const b = parseInt(l.survey[`tf_b_${si}`])||0
        const c = parseInt(l.survey[`tf_c_${si}`])||0
        if (w||b||c) survData.push([`${s.label} (${s.time})`, w, b, c, w+b+c, (w+b+c)*4])
      })
      // Competitors
      survData.push([], ['ĐỐI THỦ CẠNH TRANH'], ['Tên', 'Khoảng cách', 'Giá TB'])
      for (let i=0;i<5;i++) {
        if (l.survey[`cp_n_${i}`]) survData.push([l.survey[`cp_n_${i}`], l.survey[`cp_d_${i}`]||'', l.survey[`cp_p_${i}`]||''])
      }
      // Other sections
      SURVEY_SECTIONS.forEach(sec => {
        survData.push([], [sec.title.toUpperCase()])
        sec.fields.forEach(f => {
          if (l.survey[f.key]) survData.push([f.label, l.survey[f.key]])
        })
      })
      // Summary
      const summaryFields = [['summary_gut','Cảm nhận'],['summary_pros','Ưu điểm'],['summary_cons','Rủi ro'],['summary_recommend','Đề xuất']]
      survData.push([], ['ĐÁNH GIÁ TỔNG QUAN'])
      summaryFields.forEach(([k,label]) => { if(l.survey[k]) survData.push([label, l.survey[k]]) })

      const wsSurv = XLSX.utils.aoa_to_sheet(survData)
      wsSurv['!cols'] = [{wch:30},{wch:20},{wch:12},{wch:12},{wch:12},{wch:12}]
      XLSX.utils.book_append_sheet(wb, wsSurv, `Survey ${r.name.slice(0,22)}`)
    })

    XLSX.writeFile(wb, `${fileName}.xlsx`)
  }

  // ── EXPORT PDF (Vietnamese-compatible) ──
  const exportPDF = async () => {
    const { default: jsPDF } = await import('jspdf')
    await import('jspdf-autotable')

    const doc = new jsPDF('p', 'mm', 'a4')
    const pageW = doc.internal.pageSize.getWidth()
    const pageH = doc.internal.pageSize.getHeight()
    const today = new Date().toLocaleDateString('vi-VN')
    const fileName = `${new Date().toISOString().slice(2,10).replace(/-/g,'')}_OPS_NSO_SiteScorecard`
    let y = 15

    // Vietnamese text helper — jsPDF default fonts don't support diacritics
    // We use helvetica which handles most Latin Extended chars in jsPDF v4+
    const addTitle = (text, size=16) => {
      doc.setFontSize(size); doc.setFont('helvetica','bold'); doc.setTextColor(27,42,74)
      doc.text(text, pageW/2, y, {align:'center'}); y += size*0.5 + 3
    }
    const addSubtitle = (text, size=10) => {
      doc.setFontSize(size); doc.setFont('helvetica','normal'); doc.setTextColor(100)
      doc.text(text, pageW/2, y, {align:'center'}); y += size*0.4 + 3
    }
    const addSectionTitle = (text, size=12) => {
      doc.setFontSize(size); doc.setFont('helvetica','bold'); doc.setTextColor(27,42,74)
      doc.setFillColor(236,239,241); doc.rect(14, y-4, pageW-28, 8, 'F')
      doc.text(text, 16, y); y += 10
    }
    const addLine = (label, value, indent=14) => {
      doc.setFontSize(9); doc.setFont('helvetica','bold'); doc.setTextColor(60)
      doc.text(label, indent, y)
      doc.setFont('helvetica','normal'); doc.setTextColor(30)
      doc.text(String(value||''), indent + 45, y)
      y += 5
    }
    const checkPage = (need=30) => {
      if (y + need > pageH - 20) { doc.addPage(); y = 15 }
    }

    // ═══ PAGE 1: COVER + SUMMARY ═══
    // Header bar
    doc.setFillColor(27,42,74); doc.rect(0, 0, pageW, 40, 'F')
    doc.setFontSize(22); doc.setFont('helvetica','bold'); doc.setTextColor(255)
    doc.text('SITE SCORECARD REPORT', pageW/2, 18, {align:'center'})
    doc.setFontSize(10); doc.setFont('helvetica','normal'); doc.setTextColor(200)
    doc.text('VietArt F&B — Danh gia mat bang mo moi', pageW/2, 27, {align:'center'})
    doc.text(today, pageW/2, 34, {align:'center'})
    y = 52

    // Summary table
    if (activeResults.length > 0) {
      addSectionTitle('TONG HOP KET QUA')
      doc.autoTable({
        startY: y,
        head: [['Location', 'Dia chi', 'Diem', 'Ty le', 'Crit Fail', 'Ket luan']],
        body: activeResults.map(r => {
          const l = locs.find(x=>x.id===r.locId)
          const verdictText = r.verdict?.label?.replace(/[^\w\s\-—]/g, '').trim() || '—'
          return [r.name, l.survey.address||'—', r.totalW.toFixed(2), `${(r.pct*100).toFixed(1)}%`, String(r.totalCrit), verdictText]
        }),
        styles: { fontSize: 9, cellPadding: 3, font: 'helvetica', lineWidth: 0.1, lineColor: [200,200,200] },
        headStyles: { fillColor: [27,42,74], textColor: 255, fontStyle: 'bold', fontSize: 8 },
        alternateRowStyles: { fillColor: [250,250,250] },
        columnStyles: { 0:{cellWidth:28}, 1:{cellWidth:50}, 2:{cellWidth:16}, 3:{cellWidth:16}, 4:{cellWidth:16}, 5:{cellWidth:32} },
        margin: { left: 14, right: 14 },
        didParseCell: (data) => {
          if (data.section==='body' && data.column.index===4) {
            const val = parseInt(data.cell.raw)
            if (val > 0) { data.cell.styles.textColor = [198,40,40]; data.cell.styles.fontStyle = 'bold' }
            else { data.cell.styles.textColor = [46,125,50] }
          }
        }
      })
      y = doc.lastAutoTable.finalY + 10
    }

    // Group scores table
    checkPage(80)
    addSectionTitle('DIEM THEO NHOM TIEU CHI')
    const grpHead = ['Nhom tieu chi', 'W (%)']
    activeResults.forEach(r => grpHead.push(r.name))
    const grpBody = GROUPS.map((g, gi) => {
      const row = [g.name, `${g.weight}%`]
      activeResults.forEach(r => row.push(r.groupScores[gi].weighted.toFixed(2)))
      return row
    })
    doc.autoTable({
      startY: y,
      head: [grpHead],
      body: grpBody,
      styles: { fontSize: 8, cellPadding: 2.5, font: 'helvetica', lineWidth: 0.1, lineColor: [200,200,200] },
      headStyles: { fillColor: [0,137,123], textColor: 255, fontStyle: 'bold' },
      alternateRowStyles: { fillColor: [250,250,250] },
      columnStyles: { 0: {cellWidth: 45}, 1: {cellWidth: 14} },
      margin: { left: 14, right: 14 },
    })
    y = doc.lastAutoTable.finalY + 10

    // Verdict legend
    checkPage(40)
    addSectionTitle('PHAN LOAI GO / NO-GO')
    const legendBody = [
      ['EXCELLENT', '>= 85%', 'Uu tien ky HD ngay'],
      ['GOOD', '70 - 84%', 'De xuat duyet'],
      ['ACCEPTABLE', '60 - 69%', 'Can khac phuc truoc'],
      ['REJECT', '< 60%', 'Khong de xuat'],
      ['CRITICAL FAIL', 'Critical <= 2', 'Tu dong FAIL'],
    ]
    doc.autoTable({
      startY: y,
      head: [['Phan loai', 'Nguong', 'Mo ta']],
      body: legendBody,
      styles: { fontSize: 8, cellPadding: 2.5, font: 'helvetica' },
      headStyles: { fillColor: [55,71,79], textColor: 255 },
      columnStyles: { 0:{cellWidth:30, fontStyle:'bold'}, 1:{cellWidth:25} },
      margin: { left: 14, right: 14 },
    })
    y = doc.lastAutoTable.finalY + 5

    // ═══ DETAIL PAGES PER LOCATION ═══
    activeResults.forEach(r => {
      doc.addPage(); y = 15
      const l = locs.find(x=>x.id===r.locId)

      // Location header bar
      doc.setFillColor(21,101,192); doc.rect(0, 0, pageW, 30, 'F')
      doc.setFontSize(16); doc.setFont('helvetica','bold'); doc.setTextColor(255)
      doc.text(r.name, pageW/2, 13, {align:'center'})
      doc.setFontSize(9); doc.setFont('helvetica','normal')
      doc.text(`Ty le: ${(r.pct*100).toFixed(1)}% | ${r.verdict?.label?.replace(/[^\w\s\-—]/g,'').trim()||'—'} | Critical Fail: ${r.totalCrit}`, pageW/2, 22, {align:'center'})
      y = 38

      // Survey info
      addSectionTitle('THONG TIN CHUNG')
      if (l.survey.address) addLine('Dia chi:', l.survey.address)
      if (l.survey.area) addLine('Dien tich:', `${l.survey.area} m2`)
      if (l.survey.frontage) addLine('Mat tien:', `${l.survey.frontage} m`)
      if (l.survey.rent) addLine('Gia thue:', l.survey.rent)
      if (l.survey.concept) addLine('Concept:', l.survey.concept)
      if (l.survey.landlord) addLine('Chu nha:', l.survey.landlord)
      y += 3

      // Traffic data
      const hasTraffic = TRAFFIC_SLOTS.some((s,si) => l.survey[`tf_w_${si}`] || l.survey[`tf_b_${si}`] || l.survey[`tf_c_${si}`])
      if (hasTraffic) {
        checkPage(40)
        addSectionTitle('LUU LUONG NGUOI')
        const tfBody = []
        TRAFFIC_SLOTS.forEach((s,si) => {
          const w=parseInt(l.survey[`tf_w_${si}`])||0, b=parseInt(l.survey[`tf_b_${si}`])||0, c=parseInt(l.survey[`tf_c_${si}`])||0
          if (w||b||c) tfBody.push([`${s.label} (${s.time})`, w, b, c, w+b+c, (w+b+c)*4])
        })
        if (tfBody.length > 0) {
          doc.autoTable({
            startY: y, head: [['Khung gio', 'Di bo', 'Xe may', 'O to', 'Tong/15p', 'Uoc/gio']],
            body: tfBody,
            styles: { fontSize: 8, cellPadding: 2, font: 'helvetica' },
            headStyles: { fillColor: [0,137,123], textColor: 255 },
            margin: { left: 14, right: 14 },
          })
          y = doc.lastAutoTable.finalY + 8
        }
      }

      // Scoring detail table
      checkPage(40)
      addSectionTitle('CHI TIET CHAM DIEM')
      const scoreBody = []
      CRITERIA.forEach((c, ci) => {
        const score = l.scores[ci]
        if (score) {
          const g = GROUPS.find(g => g.id === c.g)
          scoreBody.push([ci+1, g.name, c.n, c.c?'Yes':'', score, (score*g.weight/100*c.w/100).toFixed(3)])
        }
      })

      if (scoreBody.length > 0) {
        doc.autoTable({
          startY: y,
          head: [['#', 'Nhom', 'Tieu chi', 'Crit', 'Diem', 'Quy doi']],
          body: scoreBody,
          styles: { fontSize: 7, cellPadding: 2, font: 'helvetica', lineWidth: 0.1, lineColor: [220,220,220] },
          headStyles: { fillColor: [21,101,192], textColor: 255, fontStyle: 'bold' },
          alternateRowStyles: { fillColor: [250,250,250] },
          columnStyles: { 0:{cellWidth:8}, 1:{cellWidth:28}, 2:{cellWidth:68}, 3:{cellWidth:10}, 4:{cellWidth:10}, 5:{cellWidth:14} },
          margin: { left: 14, right: 14 },
          didParseCell: (data) => {
            if (data.section==='body' && data.column.index===3 && data.cell.raw==='Yes') {
              data.cell.styles.textColor = [198,40,40]; data.cell.styles.fontStyle = 'bold'
            }
          }
        })
        y = doc.lastAutoTable.finalY + 5
      }

      // Summary notes
      const summaryKeys = [['summary_gut','Cam nhan'],['summary_pros','Uu diem'],['summary_cons','Rui ro'],['summary_recommend','De xuat']]
      const hasSummary = summaryKeys.some(([k]) => l.survey[k])
      if (hasSummary) {
        checkPage(30)
        addSectionTitle('DANH GIA TONG QUAN')
        summaryKeys.forEach(([k,label]) => {
          if (l.survey[k]) {
            doc.setFontSize(8); doc.setFont('helvetica','bold'); doc.setTextColor(60)
            doc.text(label + ':', 14, y); y += 4
            doc.setFont('helvetica','normal'); doc.setTextColor(30)
            const lines = doc.splitTextToSize(l.survey[k], pageW - 32)
            doc.text(lines, 16, y); y += lines.length * 4 + 3
            checkPage(10)
          }
        })
      }
    })

    // Footer on all pages
    const pageCount = doc.internal.getNumberOfPages()
    for (let i=1; i<=pageCount; i++) {
      doc.setPage(i)
      doc.setDrawColor(200); doc.line(14, pageH-14, pageW-14, pageH-14)
      doc.setFontSize(7); doc.setTextColor(150); doc.setFont('helvetica','normal')
      doc.text(`VietArt F&B — Site Scorecard Report | NSO-D17 | Trang ${i}/${pageCount}`, pageW/2, pageH-9, {align:'center'})
    }

    doc.save(`${fileName}.pdf`)
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-8">
      {/* Header */}
      <div className="bg-gradient-to-br from-navy to-slate text-white p-5 rounded-b-2xl shadow-lg">
        <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight">SITE SCORECARD</h1>
        <p className="text-xs text-white/60 mt-1">VietArt F&B — Đánh giá mặt bằng mở mới</p>
        {/* Cloud sync status */}
        <div className="flex items-center gap-2 mt-2 r-text-xs">
          {cloudEnabled ? (
            <>
              <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
              <span className="text-green-300">Cloud Sync ON</span>
              {syncing && <span className="text-yellow-300">⟳ Đang đồng bộ...</span>}
              {lastSync && !syncing && <span className="text-white/50">✓ {lastSync}</span>}
              {syncError && <span className="text-red-300">✕ {syncError}</span>}
            </>
          ) : (
            <>
              <span className="w-2 h-2 rounded-full bg-gray-400" />
              <span className="text-white/40">Offline — dữ liệu lưu trên thiết bị</span>
            </>
          )}
        </div>
      </div>

      <div className="px-4 pt-4 max-w-4xl mx-auto">
        {/* User name */}
        <div className="mb-3">
          <input value={userName} onChange={e=>setUserName(e.target.value)}
            placeholder="👤 Tên người đánh giá..."
            className="w-full max-w-xs px-3 py-2 rounded-lg border border-gray-200 text-sm bg-white font-medium" />
        </div>
        {/* Location pills */}
        <div className="flex gap-2 overflow-x-auto no-scrollbar pb-2">
          {locs.map(l => (
            <button key={l.id} onClick={()=>setALoc(l.id)}
              className={`px-3 py-2 rounded-lg r-text-sm font-semibold whitespace-nowrap border-2 transition-all ${
                aLoc===l.id ? 'border-brand-blue bg-blue-50 text-brand-blue' : 'border-gray-200 bg-white text-gray-500'}`}>
              📍 {l.name}
            </button>
          ))}
        </div>

        {/* Rename */}
        <input value={loc.name} onChange={e=>upLoc(aLoc,()=>({name:e.target.value}))}
          className="mt-2 w-full max-w-xs px-3 py-2 rounded-lg border border-gray-200 text-sm bg-yellow-50 font-medium" />

        {/* Tabs */}
        <div className="flex border-b-2 border-navy mt-4 mb-4 overflow-x-auto no-scrollbar">
          {tabs.map(t => (
            <button key={t.id} onClick={()=>setTab(t.id)}
              className={`px-4 py-3 r-text-sm font-semibold whitespace-nowrap rounded-t-lg transition-all ${
                tab===t.id ? 'bg-navy text-white border-b-2 border-brand-gold' : 'text-gray-500 hover:text-navy'}`}>
              {t.icon} {t.label}
            </button>
          ))}
        </div>

        {/* ═══ SURVEY ═══ */}
        {tab==='survey' && (
          <div className="space-y-4 fade-in">
            <div className="card bg-white rounded-xl p-4 border border-gray-200 border-t-4 border-t-brand-blue">
              <h3 className="font-bold r-text-lg text-navy mb-3">A. Thông tin chung mặt bằng</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {SURVEY_FIELDS.map(f => (
                  <div key={f.key} className={f.key==='address'||f.key==='condition' ? 'sm:col-span-2' : ''}>
                    <label className="r-text-sm text-gray-500 font-semibold">{f.label}</label>
                    {f.type==='textarea' ? (
                      <textarea value={loc.survey[f.key]||''} onChange={e=>upSurvey(f.key,e.target.value)}
                        rows={2} className="w-full mt-1 px-3 py-2 border border-gray-200 rounded-lg r-text-base bg-yellow-50 resize-y" />
                    ) : (
                      <input value={loc.survey[f.key]||''} onChange={e=>upSurvey(f.key,e.target.value)}
                        className="w-full mt-1 px-3 py-2 border border-gray-200 rounded-lg r-text-base bg-yellow-50" />
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Traffic count */}
            <div className="card bg-white rounded-xl p-4 border border-gray-200 border-t-4 border-t-brand-teal">
              <h3 className="font-bold r-text-lg text-navy mb-3">B. Đếm lưu lượng (15 phút × 4 khung giờ)</h3>
              <div className="overflow-x-auto">
                <table className="w-full r-text-sm">
                  <thead>
                    <tr className="bg-navy text-white">
                      {['Khung giờ','Đi bộ','Xe máy','Ô tô','Tổng/15p','Ước/giờ','% TKH'].map(h=>
                        <th key={h} className="px-2 py-2 font-semibold text-center">{h}</th>)}
                    </tr>
                  </thead>
                  <tbody>
                    {TRAFFIC_SLOTS.map((s,si) => {
                      const w=parseInt(loc.survey[`tf_w_${si}`])||0, b=parseInt(loc.survey[`tf_b_${si}`])||0, c=parseInt(loc.survey[`tf_c_${si}`])||0
                      return (
                        <tr key={si} className={si%2?'bg-gray-50':''}>
                          <td className="px-2 py-2 font-semibold">{s.label}<br/><span className="text-gray-400">{s.time}</span></td>
                          {['w','b','c'].map(t=>
                            <td key={t} className="px-1 py-1">
                              <input type="number" value={loc.survey[`tf_${t}_${si}`]||''}
                                onChange={e=>upSurvey(`tf_${t}_${si}`,e.target.value)}
                                className="w-16 px-2 py-1 border border-gray-200 rounded text-center r-text-base bg-yellow-50" />
                            </td>)}
                          <td className="text-center font-bold">{(w+b+c)||'–'}</td>
                          <td className="text-center font-bold text-brand-blue">{((w+b+c)*4)||'–'}</td>
                          <td className="px-1">
                            <input value={loc.survey[`tf_p_${si}`]||''} onChange={e=>upSurvey(`tf_p_${si}`,e.target.value)}
                              placeholder="%" className="w-16 px-2 py-1 border border-gray-200 rounded text-center r-text-base bg-yellow-50" />
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Competitors */}
            <div className="card bg-white rounded-xl p-4 border border-gray-200 border-t-4 border-t-brand-orange">
              <h3 className="font-bold r-text-lg text-navy mb-3">C. Đối thủ cạnh tranh (300m)</h3>
              {[0,1,2,3,4].map(i=>(
                <div key={i} className="grid grid-cols-3 gap-2 mb-2 p-2 rounded-lg bg-gray-50">
                  <input placeholder={`Tên quán ${i+1}`} value={loc.survey[`cp_n_${i}`]||''}
                    onChange={e=>upSurvey(`cp_n_${i}`,e.target.value)}
                    className="col-span-3 px-2 py-1 border border-gray-200 rounded r-text-base" />
                  <input placeholder="Khoảng cách" value={loc.survey[`cp_d_${i}`]||''} onChange={e=>upSurvey(`cp_d_${i}`,e.target.value)}
                    className="px-2 py-1 border border-gray-200 rounded r-text-base" />
                  <input placeholder="Giá TB" value={loc.survey[`cp_p_${i}`]||''} onChange={e=>upSurvey(`cp_p_${i}`,e.target.value)}
                    className="px-2 py-1 border border-gray-200 rounded r-text-base" />
                  <input placeholder="Đông/Vắng" value={loc.survey[`cp_v_${i}`]||''} onChange={e=>upSurvey(`cp_v_${i}`,e.target.value)}
                    className="px-2 py-1 border border-gray-200 rounded r-text-base" />
                </div>
              ))}
            </div>

            {/* Survey sections */}
            {SURVEY_SECTIONS.map(sec=>(
              <div key={sec.key} className="card bg-white rounded-xl p-4 border border-gray-200 border-t-4"
                style={{borderTopColor:`var(--${sec.color})`}}>
                <h3 className="font-bold r-text-lg text-navy mb-3">{sec.title}</h3>
                {sec.fields.map(f=>(
                  <div key={f.key} className="mb-2">
                    <label className="r-text-sm text-gray-500 font-semibold">{f.label}</label>
                    <textarea value={loc.survey[f.key]||''} onChange={e=>upSurvey(f.key,e.target.value)}
                      rows={2} className="w-full mt-1 px-3 py-2 border border-gray-200 rounded-lg r-text-base bg-yellow-50 resize-y" />
                  </div>
                ))}
              </div>
            ))}

            {/* Summary */}
            <div className="card bg-white rounded-xl p-4 border border-gray-200 border-t-4 border-t-brand-gold">
              <h3 className="font-bold r-text-lg text-navy mb-3">Đánh giá tổng quan</h3>
              {[['summary_gut','Cảm nhận đầu tiên (gut feeling)'],['summary_pros','3 ƯU ĐIỂM nổi bật'],
                ['summary_cons','3 RỦI RO / NHƯỢC ĐIỂM'],['summary_recommend','Đề xuất: NÊN / KHÔNG / CẦN XEM']
              ].map(([k,l])=>(
                <div key={k} className="mb-2">
                  <label className="r-text-sm text-gray-500 font-semibold">{l}</label>
                  <textarea value={loc.survey[k]||''} onChange={e=>upSurvey(k,e.target.value)}
                    rows={3} className="w-full mt-1 px-3 py-2 border border-gray-200 rounded-lg r-text-base bg-yellow-50 resize-y" />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ═══ SCORING ═══ */}
        {tab==='scoring' && (
          <div className="space-y-4 fade-in">
            {GROUPS.map(g => {
              const gc = CRITERIA.map((c,i)=>({...c,idx:i})).filter(c=>c.g===g.id)
              const gs = results.find(r=>r.locId===aLoc)?.groupScores.find(gs=>gs.groupId===g.id)
              return (
                <div key={g.id} className="card bg-white rounded-xl border border-gray-200 border-t-4 border-t-brand-blue overflow-hidden">
                  <div className="px-4 py-3 bg-gray-50 border-b border-gray-200 flex justify-between items-center">
                    <h3 className="font-bold r-text-lg text-navy">{g.name}</h3>
                    <span className="text-xs bg-navy text-white px-2 py-1 rounded-full font-bold">{g.weight}%</span>
                  </div>
                  <div className="divide-y divide-gray-100">
                    {gc.map(c=>(
                      <div key={c.idx} className={`px-4 py-3 ${c.c ? 'bg-red-50' : ''}`}>
                        <div className="flex justify-between items-start gap-2 flex-wrap">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-1 flex-wrap">
                              <span className={`r-text-sm ${c.c?'font-bold text-brand-red':'text-gray-800'}`}>
                                {c.c&&'⚠ '}{c.n}
                              </span>
                              {c.c && <span className="r-text-xs bg-brand-red text-white px-1.5 py-0.5 rounded font-bold">CRITICAL</span>}
                              <span className="r-r-text-xs text-gray-400">w:{c.w}%</span>
                            </div>
                            <button onClick={()=>setGuide(guide===c.idx?null:c.idx)}
                              className="r-text-xs text-brand-blue mt-1 hover:underline">
                              {guide===c.idx?'▲ Ẩn':'▼ Thang đo'}
                            </button>
                          </div>
                          <div className="flex gap-1">
                            {[1,2,3,4,5].map(v=>(
                              <button key={v} onClick={()=>upScore(c.idx, v===loc.scores[c.idx]?null:v)}
                                className={`score-btn rounded-md r-text-base font-bold ${
                                  loc.scores[c.idx]===v
                                    ? `active text-white ${c.c&&v<=2?'bg-brand-red':v<=2?'bg-brand-orange':v<=3?'bg-brand-gold':'bg-brand-green'}`
                                    : `${c.c?'bg-red-100':'bg-gray-100'} text-gray-500`}`}>
                                {v}
                              </button>
                            ))}
                          </div>
                        </div>
                        {guide===c.idx && (
                          <div className="grid grid-cols-3 gap-2 mt-2 r-text-sm">
                            <div className="p-2 bg-red-100 rounded"><b>1:</b> {c.g1}</div>
                            <div className="p-2 bg-yellow-100 rounded"><b>3:</b> {c.g3}</div>
                            <div className="p-2 bg-green-100 rounded"><b>5:</b> {c.g5}</div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {/* ═══ DASHBOARD ═══ */}
        {tab==='dashboard' && (
          <div className="space-y-4 fade-in">
            {activeResults.length === 0 && (
              <div className="text-center py-12 text-gray-400">
                <p className="text-4xl mb-2">📊</p>
                <p className="text-sm">Chưa có dữ liệu. Hãy chấm điểm ít nhất 1 location.</p>
              </div>
            )}

            {/* Summary cards */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {activeResults.map((r,i) => (
                <div key={r.locId} className="bg-white rounded-xl p-4 text-center border-2 shadow-sm"
                  style={{borderColor:r.verdict?.color}}>
                  <div className="r-text-sm font-bold text-navy mb-1">{r.name}</div>
                  <div className="text-4xl sm:text-5xl font-extrabold" style={{color:r.verdict?.color}}>
                    {(r.pct*100).toFixed(1)}%
                  </div>
                  <div className="r-text-sm font-bold mt-1" style={{color:r.verdict?.color}}>{r.verdict?.label}</div>
                  <div className="r-r-text-xs text-gray-400 mt-1">{r.answered}/{CRITERIA.length} tiêu chí</div>
                  {r.totalCrit>0 && <div className="r-text-xs text-brand-red font-bold mt-1">⚠ {r.totalCrit} Critical Fail</div>}
                </div>
              ))}
            </div>

            {/* Radar */}
            {activeResults.length > 0 && (
              <div className="card bg-white rounded-xl p-4 border border-gray-200">
                <h3 className="font-bold r-text-lg text-navy mb-3">Radar — So sánh theo nhóm</h3>
                <ResponsiveContainer width="100%" height={300}>
                  <RadarChart data={GROUPS.map((g,gi)=>({
                    group: g.name.length>10 ? g.name.slice(0,10)+'…' : g.name,
                    ...Object.fromEntries(activeResults.map(r=>[r.name, r.groupScores[gi].weighted]))
                  }))}>
                    <PolarGrid stroke="#E0E0E0" />
                    <PolarAngleAxis dataKey="group" tick={{fontSize:9}} />
                    <PolarRadiusAxis tick={{fontSize:8}} />
                    {activeResults.map((r,i)=>
                      <Radar key={r.locId} name={r.name} dataKey={r.name}
                        stroke={COLORS[i]} fill={COLORS[i]} fillOpacity={0.15} strokeWidth={2} />
                    )}
                    <Legend iconSize={8} wrapperStyle={{fontSize:10}} />
                  </RadarChart>
                </ResponsiveContainer>
              </div>
            )}

            {/* Bar chart */}
            {activeResults.length > 0 && (
              <div className="card bg-white rounded-xl p-4 border border-gray-200">
                <h3 className="font-bold r-text-lg text-navy mb-3">Tổng điểm theo Location</h3>
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={activeResults.map(r=>({name:r.name, score:parseFloat(r.totalW.toFixed(2)), pct:parseFloat((r.pct*100).toFixed(1))}))}>
                    <XAxis dataKey="name" tick={{fontSize:10}} />
                    <YAxis tick={{fontSize:10}} />
                    <Tooltip />
                    <Bar dataKey="score" radius={[6,6,0,0]}>
                      {activeResults.map((r,i)=><Cell key={i} fill={COLORS[i]} />)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}

            {/* Ranking */}
            {activeResults.length > 0 && (
              <div className="card bg-white rounded-xl border border-gray-200 overflow-hidden">
                <h3 className="font-bold r-text-lg text-navy p-4 pb-2">Bảng xếp hạng</h3>
                <table className="w-full r-text-sm">
                  <thead>
                    <tr className="bg-navy text-white">
                      {['#','Location','Điểm','%','Crit','Kết luận'].map(h=>
                        <th key={h} className="px-3 py-2 text-center font-semibold">{h}</th>)}
                    </tr>
                  </thead>
                  <tbody>
                    {[...activeResults].sort((a,b)=>b.totalW-a.totalW).map((r,rank)=>(
                      <tr key={r.locId} className={rank===0?'bg-green-50':rank%2?'bg-gray-50':''}>
                        <td className="px-3 py-2 text-center text-base">{['🥇','🥈','🥉'][rank]||(rank+1)}</td>
                        <td className="px-3 py-2 font-semibold">{r.name}</td>
                        <td className="px-3 py-2 text-center font-bold">{r.totalW.toFixed(2)}</td>
                        <td className="px-3 py-2 text-center font-bold" style={{color:r.verdict?.color}}>{(r.pct*100).toFixed(1)}%</td>
                        <td className="px-3 py-2 text-center font-bold" style={{color:r.totalCrit>0?'#C62828':'#2E7D32'}}>{r.totalCrit||'✓'}</td>
                        <td className="px-3 py-2 text-center font-bold" style={{color:r.verdict?.color}}>{r.verdict?.label}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Legend */}
            <div className="card bg-white rounded-xl p-4 border border-gray-200">
              <h3 className="font-bold r-text-lg text-navy mb-2">Phân loại Go/No-Go</h3>
              {[
                {l:'🌟 EXCELLENT',t:'≥85%',d:'Ưu tiên ký HĐ ngay',c:'#2E7D32'},
                {l:'✅ GOOD',t:'70–84%',d:'Đề xuất duyệt',c:'#2E7D32'},
                {l:'⚠️ ACCEPTABLE',t:'60–69%',d:'Cần khắc phục trước',c:'#E65100'},
                {l:'❌ REJECT',t:'<60%',d:'Không đề xuất',c:'#C62828'},
                {l:'❌ CRITICAL FAIL',t:'Critical ≤2',d:'Tự động FAIL',c:'#C62828'},
              ].map(v=>(
                <div key={v.l} className="flex items-center gap-3 py-1.5 border-b border-gray-100 last:border-0">
                  <span className="r-text-sm font-bold w-36" style={{color:v.c}}>{v.l}</span>
                  <span className="r-text-xs text-gray-500 w-16">{v.t}</span>
                  <span className="r-text-xs text-gray-600">{v.d}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ═══ EXPORT ═══ */}
        {tab==='export' && (
          <div className="space-y-4 fade-in">
            <div className="card bg-white rounded-xl p-4 border border-gray-200 border-t-4 border-t-brand-green">
              <h3 className="font-bold r-text-lg text-navy mb-3">Xuất báo cáo</h3>
              <p className="r-text-sm text-gray-500 mb-4">
                Báo cáo chứa đầy đủ Dashboard, Scoring chi tiết và T.A Survey cho tất cả Location đã chấm điểm.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <button onClick={exportXLSX}
                  className="w-full py-4 bg-brand-green text-white rounded-xl font-bold r-text-base hover:opacity-90 transition flex items-center justify-center gap-2">
                  <span className="text-xl">📊</span> Tải file Excel (.xlsx)
                </button>
                <button onClick={exportPDF}
                  className="w-full py-4 bg-brand-red text-white rounded-xl font-bold r-text-base hover:opacity-90 transition flex items-center justify-center gap-2">
                  <span className="text-xl">📄</span> Tải file PDF
                </button>
              </div>
              <div className="mt-3 grid grid-cols-2 gap-2 r-text-xs text-gray-400">
                <p>Excel: đầy đủ dữ liệu, có nhiều sheet, chỉnh sửa được</p>
                <p>PDF: báo cáo đẹp, gửi sếp / đối tác, không chỉnh sửa</p>
              </div>
            </div>

            <div className="card bg-white rounded-xl p-4 border border-gray-200 border-t-4 border-t-brand-blue">
              <h3 className="font-bold r-text-lg text-navy mb-3">☁️ Google Sheets Sync</h3>
              {cloudEnabled ? (
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-xs">
                    <span className="w-2 h-2 rounded-full bg-green-500" />
                    <span className="text-green-700 font-semibold">Connected — dữ liệu đồng bộ tự động</span>
                  </div>
                  <p className="text-xs text-gray-500">
                    Dữ liệu được tự động sync lên Google Sheets sau mỗi 3 giây khi có thay đổi.
                    Tất cả team members đều thấy dữ liệu chung.
                  </p>
                  <button onClick={async () => {
                    const loc = locs.find(l=>l.id===aLoc)
                    if (loc) await syncToCloud(aLoc, loc, userName)
                  }}
                    className="w-full py-2 bg-brand-blue text-white rounded-lg r-text-sm font-semibold hover:opacity-90 transition"
                    disabled={syncing}>
                    {syncing ? '⟳ Đang sync...' : '☁️ Sync ngay bây giờ'}
                  </button>
                  <button onClick={async () => {
                    const data = await loadFromCloud(aLoc)
                    if (data) {
                      upLoc(aLoc, l => ({ survey: {...l.survey, ...data.survey}, scores: {...l.scores, ...data.scores} }))
                      alert('Đã tải dữ liệu từ Cloud!')
                    } else alert('Không tìm thấy dữ liệu trên Cloud cho location này.')
                  }}
                    className="w-full py-2 border-2 border-brand-blue text-brand-blue rounded-lg r-text-sm font-semibold hover:bg-blue-50 transition">
                    📥 Tải dữ liệu từ Cloud
                  </button>
                  {lastSync && <p className="r-r-text-xs text-gray-400 text-center">Sync gần nhất: {lastSync}</p>}
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-xs">
                    <span className="w-2 h-2 rounded-full bg-gray-400" />
                    <span className="text-gray-500 font-semibold">Chưa kết nối Google Sheets</span>
                  </div>
                  <p className="text-xs text-gray-500">
                    Dữ liệu đang lưu trên thiết bị (offline). Để bật Cloud Sync, cần setup Google Sheets API — liên hệ anh Ba hoặc IT.
                  </p>
                </div>
              )}
            </div>

            <div className="card bg-white rounded-xl p-4 border border-gray-200 border-t-4 border-t-brand-blue">
              <h3 className="font-bold r-text-lg text-navy mb-3">Chia sẻ link cho team</h3>
              <p className="r-text-sm text-gray-500 mb-3">
                Sau khi deploy lên Vercel, team truy cập bằng URL. Mỗi người lưu dữ liệu riêng trên thiết bị của mình.
              </p>
              <button onClick={()=>{navigator.clipboard?.writeText(window.location.href); alert('Đã copy URL!')}}
                className="w-full py-3 bg-brand-blue text-white rounded-xl font-bold r-text-base hover:opacity-90 transition">
                🔗 Copy URL chia sẻ
              </button>
            </div>

            <div className="card bg-white rounded-xl p-4 border border-gray-200 border-t-4 border-t-brand-red">
              <h3 className="font-bold r-text-lg text-navy mb-3">Reset dữ liệu</h3>
              <button onClick={()=>{
                if(confirm('Xóa toàn bộ dữ liệu? Không thể hoàn tác.')){
                  localStorage.removeItem('vietart-scorecard'); location.reload()
                }}}
                className="py-2 px-4 border-2 border-brand-red text-brand-red rounded-lg r-text-sm font-semibold hover:bg-red-50 transition">
                🗑️ Xóa & bắt đầu lại
              </button>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="text-center py-6 r-r-text-xs text-gray-400">
          VietArt F&B — Site Scorecard v2.0 | NSO-D17 | {CRITERIA.length} tiêu chí · {GROUPS.length} nhóm
        </div>
      </div>
    </div>
  )
}
