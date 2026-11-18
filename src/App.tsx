import { useMemo, useState } from 'react'
import {
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, ReferenceLine, Legend
} from 'recharts'
import {
  DEFAULT_SCENARIO, DEFAULT_STRATEGIES, defaultObservationStages, runSimulation,
  riskTimeline, targetMassKg, formatProb, formatNum, IMPACT_RADIUS_KM
} from './core/model'
import { NeoScenario, SimulationState } from './core/types'

function probClass(p: number) {
  if (p >= 0.01) return 'danger'
  if (p >= 0.001) return 'warn'
  return 'ok'
}

export default function App() {
  const [scenario] = useState<NeoScenario>(DEFAULT_SCENARIO)
  const stages = useMemo(() => defaultObservationStages(scenario), [scenario])
  const [observationIndex, setObservationIndex] = useState(1)
  const [interventionDelayYears, setInterventionDelayYears] = useState(0.5)
  const [geometryFactor, setGeometryFactor] = useState(30) // km / (mm/s*yıl)

  const state: SimulationState = { scenario, observationIndex, interventionDelayYears, geometryFactor }
  const obs = stages[observationIndex]
  const assessments = useMemo(() => runSimulation(state, DEFAULT_STRATEGIES), [state.scenario, observationIndex, interventionDelayYears, geometryFactor])
  const timeline = useMemo(() => riskTimeline(state, 28), [state.scenario, observationIndex])
  const best = assessments[0]
  const mass = targetMassKg(scenario)
  const pNow = assessments[0]?.impactProbabilityBefore ?? 0

  const brief = useMemo(() => {
    const avail = assessments.filter(a => a.available)
    if (avail.length === 0) {
      return {
        level: 'danger' as const,
        title: 'Uygun müdahale penceresi yok',
        lines: [
          'Mevcut gözlem ve hazırlık süreleriyle değerlendirilen stratejilerin hiçbiri minimum öncü süre koşulunu sağlamıyor.',
          'Öncelik: yörünge belirsizliğini hızla daraltmak (ek gözlem/radar) ve en erken uygulanabilir müdahale seçeneği için hazırlığı öne çekmek.',
        ]
      }
    }
    const b = avail[0]
    const pDrop = b.impactProbabilityBefore > 0 ? (1 - b.impactProbabilityAfter / b.impactProbabilityBefore) * 100 : 100
    return {
      level: b.impactProbabilityAfter < 0.001 ? 'ok' as const : b.impactProbabilityAfter < 0.01 ? 'warn' as const : 'danger' as const,
      title: `Önerilen seçenek: ${b.strategy.name}`,
      lines: [
        `Beklenen sapma ~${formatNum(b.deflectionKm, 0)} km, müdahale sonrası kaçırma ~${formatNum(b.resultingMissKm, 0)} km (etkin çarpma yarıçapı ~${formatNum(IMPACT_RADIUS_KM, 0)} km).`,
        `Çarpma olasılığı ${formatProb(b.impactProbabilityBefore)} → ${formatProb(b.impactProbabilityAfter)} (tahmini azalma ~%${formatNum(Math.max(0, pDrop), 1)}; teknik güvenilirlik dahil).`,
        `Kullanılabilir öncü süre ${b.leadTimeYears.toFixed(1)} yıl. Karar, gözlem güncellemeleriyle yeniden değerlendirilmeli (belirsizlik dinamik).`,
      ]
    }
  }, [assessments])

  return (
    <div className="app">
      <header className="hero">
        <div>
          <div className="brand">
            <div className="logo">A</div>
            <div>
              <h1>AEGIS — Uçtan Uca Gezegen Savunma Karar Sistemi</h1>
              <p className="subtitle">NEO tehdit senaryosunda tespit → yörünge belirsizliği/çarpma olasılığı → müdahale görev tasarımı ve strateji karşılaştırması (yeni, bağımsız Quantro projesi).</p>
            </div>
          </div>
          <div className="badges">
            <span className="badge">Karar-destek simülasyonu</span>
            <span className="badge">Açıklanabilir varsayımlar</span>
            <span className="badge">Uzay · Gezegen Savunma</span>
          </div>
        </div>
        <div style={{textAlign:'right'}}>
          <div className="pill">Senaryo: {scenario.name}</div>
          <div style={{marginTop:8, fontSize:12, color:'var(--muted)'}}>Karşılaşmaya kalan: <b style={{color:'var(--text)'}}>{scenario.timeToEncounterYears} yıl</b></div>
        </div>
      </header>

      <div className="grid">
        <aside className="stack">
          <section className="panel">
            <h2>Senaryo Özeti</h2>
            <div className="kv">
              <div className="k">Çap / hız</div><div className="v">{scenario.diameterM} m · {scenario.velocityKmS} km/s</div>
              <div className="k">Yoğunluk / kütle (tah.)</div><div className="v">{formatNum(scenario.densityKgM3,0)} kg/m³ · {mass.toExponential(2)} kg</div>
              <div className="k">Nominal kaçırma</div><div className="v">{formatNum(scenario.nominalMissKm,0)} km</div>
              <div className="k">Etkin çarpma yarıçapı</div><div className="v">~{formatNum(IMPACT_RADIUS_KM,0)} km</div>
              <div className="k">Başlangıç belirsizliği (1σ)</div><div className="v">{formatNum(scenario.initialSigmaKm,0)} km</div>
            </div>
            <div className="note">Kütle küresel geometri varsayımıyla; çarpma yarıçapı yerçekimi odaklanması katsayısı içeren basitleştirilmiş etkin değerdir.</div>
          </section>

          <section className="panel">
            <h2>Gözlem ve Karar Parametreleri</h2>
            <div className="control">
              <label>Gözlem aşaması <span className="v" style={{fontFamily:'var(--mono)'}}>{obs.label}</span></label>
              <select value={observationIndex} onChange={e => setObservationIndex(Number(e.target.value))}>
                {stages.map((s, i) => <option key={i} value={i}>{s.label} (t+{s.yearsFromDetection.toFixed(1)}y, σ={formatNum(s.sigmaKm,0)} km)</option>)}
              </select>
              <div className="note">{obs.note}</div>
            </div>
            <div className="control">
              <label>Karar/fırlatma gecikmesi <span>{interventionDelayYears.toFixed(1)} yıl</span></label>
              <input type="range" min={0} max={4} step={0.1} value={interventionDelayYears} onChange={e => setInterventionDelayYears(Number(e.target.value))} />
            </div>
            <div className="control">
              <label>Yörünge/geometri faktörü <span>{geometryFactor} km/(mm/s·yıl)</span></label>
              <input type="range" min={10} max={60} step={1} value={geometryFactor} onChange={e => setGeometryFactor(Number(e.target.value))} />
              <div className="note">Sapma hesabını tek katsayıya indirgeyen basitleştirme (gerçek değer yörünge geometrisine bağlıdır); duyarlılık analizi için değiştirilebilir.</div>
            </div>
          </section>

          <section className="panel">
            <h2>Anlık Risk Durumu</h2>
            <div className="kv">
              <div className="k">Seçili aşama belirsizliği (1σ)</div><div className="v">{formatNum(obs.sigmaKm,0)} km</div>
              <div className="k">Tahmini çarpma olasılığı</div><div className={`v ${probClass(pNow)}`}>{formatProb(pNow)}</div>
              <div className="k">Karşılaşmaya kalan</div><div className="v">{(scenario.timeToEncounterYears - obs.yearsFromDetection).toFixed(1)} yıl</div>
            </div>
          </section>
        </aside>

        <main className="stack">
          <section className="panel">
            <h2>Belirsizlik ve Çarpma Olasılığı Evrimi</h2>
            <div className="chartWrap">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={timeline} margin={{top:10,right:20,left:0,bottom:0}}>
                  <CartesianGrid stroke="#24325f" strokeDasharray="3 3" />
                  <XAxis dataKey="t" tickFormatter={(v)=>`${v.toFixed(0)}y`} stroke="#9fb0de" fontSize={12} />
                  <YAxis yAxisId="left" stroke="#9fb0de" fontSize={12} tickFormatter={(v)=> formatNum(v,0)} />
                  <YAxis yAxisId="right" orientation="right" stroke="#9fb0de" fontSize={12} tickFormatter={(v)=> `${(v*100).toFixed(2)}%`} />
                  <Tooltip formatter={(value:any, name:any)=> name==='p' ? [formatProb(Number(value)), 'Çarpma olasılığı'] : [formatNum(Number(value),0)+' km', 'Belirsizlik σ']} labelFormatter={(l)=>`t+${Number(l).toFixed(1)} yıl`} contentStyle={{background:'#141d3a', border:'1px solid #24325f', color:'#e7ecff'}} />
                  <Legend />
                  <ReferenceLine x={obs.yearsFromDetection} yAxisId="left" stroke="#4fd1c5" strokeDasharray="4 4" label={{value:'seçili aşama', fill:'#4fd1c5', fontSize:11}} />
                  <Line yAxisId="left" type="stepAfter" dataKey="sigma" name="Belirsizlik σ (km)" stroke="#7aa2ff" dot={false} strokeWidth={2} />
                  <Line yAxisId="right" type="stepAfter" dataKey="p" name="Çarpma olasılığı" stroke="#fc8181" dot={false} strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
            </div>
            <div className="note">Gözlem güncellemeleri belirsizliği kademeli düşürür; olasılık, nominal kaçırma ve 1σ dağılımının etkin çarpma yarıçapıyla kesişimine göre (1D basitleştirme) hesaplanır.</div>
          </section>

          <section className="panel">
            <h2>Müdahale Stratejisi Karşılaştırması</h2>
            <div className="cards">
              {assessments.map((a, i) => (
                <div key={a.strategy.id} className={`card ${i===0 && a.available ? 'top':''}`}>
                  {i===0 && a.available && <span className="tag">Önerilen</span>}
                  <h4>{a.strategy.name}</h4>
                  <div className="desc">{a.strategy.description}</div>
                  {!a.available ? (
                    <div className="callout" style={{borderColor:'#5a2a2a', color:'#f0b3b3'}}>Uygun değil: {a.reason}</div>
                  ) : (
                    <>
                      <div className="metric"><span className="k">Öncü süre (kullanılabilir)</span><span className="v">{a.leadTimeYears.toFixed(1)} yıl</span></div>
                      <div className="metric"><span className="k">Etkin Δv / sapma</span><span className="v">{a.effectiveDeltaVMmS.toFixed(2)} mm/s · {formatNum(a.deflectionKm,0)} km</span></div>
                      <div className="metric"><span className="k">Olasılık (önce → sonra)</span><span className={`v ${probClass(a.impactProbabilityAfter)}`}>{formatProb(a.impactProbabilityBefore)} → {formatProb(a.impactProbabilityAfter)}</span></div>
                      <div className="metric"><span className="k">Kaçırma marjı</span><span className={`v ${a.avoidanceMarginKm>0?'ok':'danger'}`}>{formatNum(a.avoidanceMarginKm,0)} km</span></div>
                      <div className="metric"><span className="k">Güvenilirlik / maliyet / olgunluk</span><span className="v">%{Math.round(a.strategy.reliability*100)} · {a.strategy.relativeCost}/10 · {a.strategy.techReadiness}/10</span></div>
                      <div className="bar"><span style={{width:`${a.successScore}%`}} /></div>
                      <div className="metric"><span className="k">Karşılaştırma skoru</span><span className="v accent">{a.successScore}/100</span></div>
                    </>
                  )}
                </div>
              ))}
            </div>
          </section>

          <div className="row">
            <section className="panel">
              <h2>Karşılaştırma Tablosu</h2>
              <table>
                <thead><tr><th>Strateji</th><th>Durum</th><th>Öncü</th><th>Sapma</th><th>P(önce)</th><th>P(sonra)</th><th>Marj</th><th>Skor</th></tr></thead>
                <tbody>
                  {assessments.map(a => (
                    <tr key={a.strategy.id}>
                      <td>{a.strategy.name}</td>
                      <td className={a.available?'ok':'danger'}>{a.available?'Uygun':'Uygun değil'}</td>
                      <td className="num">{a.leadTimeYears.toFixed(1)}y</td>
                      <td className="num">{formatNum(a.deflectionKm,0)} km</td>
                      <td className="num">{formatProb(a.impactProbabilityBefore)}</td>
                      <td className={`num ${probClass(a.impactProbabilityAfter)}`}>{formatProb(a.impactProbabilityAfter)}</td>
                      <td className={`num ${a.avoidanceMarginKm>0?'ok':'danger'}`}>{formatNum(a.avoidanceMarginKm,0)} km</td>
                      <td className="num accent">{a.successScore}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </section>

            <section className="panel">
              <h2>Karar Brifingi</h2>
              <div className="brief">
                <div className={brief.level}><b>{brief.title}</b></div>
                <ul>{brief.lines.map((l,i)=><li key={i}>{l}</li>)}</ul>
              </div>
              <div className="callout">
                <b>Yorum:</b> Çarpma olasılığı yalnızca mevcut yörünge belirsizliğine bağlı değildir; hedefin fiziksel özellikleri, müdahale sapması ve yön belirsizliği sonuca etki eder. Bu ekran karar-destek amaçlı, basitleştirilmiş ve şeffaf bir model sunar.
              </div>
            </section>
          </div>
        </main>
      </div>

      <footer className="panel">
        <b>Varsayımlar ve sınırlar (şeffaflık):</b> (1) Çarpma olasılığı, nominal kaçırma ve 1σ belirsizlik üzerinden 1D normal yaklaşımıyla (etkin çarpma yarıçapı içinde kalma) hesaplanır. (2) Sapma, <code>sapma_km = geometri_faktörü × Δv(mm/s) × öncü_süre(yıl)</code> basitleştirmesiyle modellenir; gerçek değer yörünge geometrisi, karşılaşma koşulları ve momentum aktarım katsayısına (β) bağlıdır. (3) Strateji parametreleri (Δv, hazırlık süresi, güvenilirlik, maliyet) karşılaştırmalı demo amaçlı temsili değerlerdir. (4) Bu araç operasyonel görev kararı/sertifikasyon yerine geçmez; gözlem güncellemeleri ve yüksek doğruluklu yörünge analizi gerektirir.
      </footer>
    </div>
  )
}
