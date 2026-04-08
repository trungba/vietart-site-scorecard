'use client'
import { useState, useEffect, useMemo, useCallback, useRef } from 'react'
import { GROUPS, CRITERIA, TRAFFIC_SLOTS, SURVEY_FIELDS, SURVEY_SECTIONS, calcResults, getVerdict } from '@/lib/data'
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Legend, Cell } from 'recharts'

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

  const exportCSV = () => {
    const lines = ['VIETART F&B — SITE SCORECARD REPORT',`Ngày: ${new Date().toLocaleDateString('vi-VN')}`,'']
    activeResults.forEach(r => {
      const l = locs.find(x=>x.id===r.locId)
      lines.push(`=== ${r.name} ===`)
      lines.push(`Địa chỉ: ${l.survey.address||'—'}`)
      lines.push(`Diện tích: ${l.survey.area||'—'} m² | Mặt tiền: ${l.survey.frontage||'—'} m`)
      lines.push(`Giá thuê: ${l.survey.rent||'—'}`)
      lines.push(`Tổng điểm: ${r.totalW.toFixed(2)} / ${r.totalMax.toFixed(2)}`)
      lines.push(`Tỷ lệ: ${(r.pct*100).toFixed(1)}% | Critical Fail: ${r.totalCrit}`)
      lines.push(`Kết luận: ${r.verdict?.label||'—'}`)
      lines.push('')
      lines.push('Nhóm,Trọng số,Điểm,Max')
      r.groupScores.forEach((gs,gi) => lines.push(`"${GROUPS[gi].name}",${GROUPS[gi].weight}%,${gs.weighted.toFixed(2)},${gs.maxW.toFixed(2)}`))
      lines.push('')
      lines.push('STT,Tiêu chí,Critical,Điểm')
      CRITERIA.forEach((c,ci) => { if(l.scores[ci]) lines.push(`${ci+1},"${c.n}",${c.c?'Yes':'No'},${l.scores[ci]}`) })
      lines.push('','---','')
    })
    const blob = new Blob(['\uFEFF'+lines.join('\n')], {type:'text/csv;charset=utf-8'})
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `${new Date().toISOString().slice(2,10).replace(/-/g,'')}_OPS_NSO_SiteScorecard.csv`
    a.click()
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
              <h3 className="font-bold r-text-lg text-navy mb-3">Tải báo cáo</h3>
              <p className="r-text-sm text-gray-500 mb-4">File CSV chứa đầy đủ dữ liệu Survey, Scoring & Dashboard cho tất cả Location đã chấm điểm.</p>
              <button onClick={exportCSV}
                className="w-full py-3 bg-brand-green text-white rounded-xl font-bold r-text-base hover:opacity-90 transition">
                📥 Tải báo cáo CSV
              </button>
              <p className="r-r-text-xs text-gray-400 mt-2">Mở bằng Excel / Google Sheets / Numbers</p>
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
