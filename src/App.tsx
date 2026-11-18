import { useMemo, useState } from 'react'
import {
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, ReferenceLine, Legend
} from 'recharts'
import {
  Shield, Radar, Activity, AlertTriangle, CheckCircle2, Crosshair, Gauge,
  Rocket, Target, Clock, Info, Satellite, Orbit, SlidersHorizontal
} from 'lucide-react'
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

function probLabel(p: number) {
  if (p >= 0.01) return 'YÜKSEK RİSK'
  if (p >= 0.001) return 'İZLEME'
  return 'KONTROL ALTINDA'
}

function threatScale(p: number) {
  // log-ish visual scaling so small probabilities still show presence
  if (p <= 0) return 0
  const scaled = Math.min(1, Math.log10(p * 10000 + 1) / Math.log10(10000 + 1))
  return Math.max(0.04, scaled)
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
  const pClass = probClass(pNow)

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

  const BriefIcon = brief.level === 'ok' ? CheckCircle2 : AlertTriangle

  return (
    <div className="app">
      <div className="topbar">
        <header className="hero">
          <div className="hero-head">
            <div className="emblem" aria-hidden="true"><Shield size={26} strokeWidth={1.8} /></div>
            <div>
              <p className="eyebrow">Quantro Ar-Ge · Gezegen Savunma</p>
              <h1>AEGIS <span>Karar Komuta Sistemi</span></h1>
              <p className="subtitle">
                Tespit → yörünge belirsizliği ve çarpma olasılığı evrimi → müdahale görev tasarımı ve strateji karşılaştırması.
                Şeffaf varsayımlarla karar-destek simülasyonu.
              </p>
              <div className="meta-row">
                <span className="chip live">Sistem Aktif</span>
                <span className="chip"><Satellite size={12} /> {scenario.name}</span>
                <span className="chip"><Clock size={12} /> T-{scenario.timeToEncounterYears} yıl</span>
              </div>
            </div>
          </div>
        </header>

        <aside className="threat-panel" aria-label="Tehdit durumu">
          <div>
            <div className="threat-label">Tahmini Çarpma Olasılığı</div>
            <div className={`threat-value ${pClass}`}>{formatProb(pNow)}</div>
            <div className="threat-sub">{probLabel(pNow)} · {obs.label}</div>
          </div>
          <div className="threat-bar" aria-hidden="true">
            <span className={pClass} style={{ width: `${threatScale(pNow) * 100}%` }} />
          </div>
        </aside>
      </div>

      <div className="workspace">
        <aside className="stack">
          <section className="panel">
            <div className="panel-head">
              <h2><Orbit size={16} /> Senaryo Özeti</h2>
              <span className="panel-tag">NEO</span>
            </div>
            <div className="kv">
              <div className="k">Hedef</div><div className="v">{scenario.name}</div>
              <div className="k">Çap / hız</div><div className="v">{scenario.diameterM} m · {scenario.velocityKmS} km/s</div>
              <div className="k">Yoğunluk</div><div className="v">{formatNum(scenario.densityKgM3, 0)} kg/m³</div>
              <div className="k">Kütle (tah.)</div><div className="v">{mass.toExponential(2)} kg</div>
              <div className="k">Nominal kaçırma</div><div className="v">{formatNum(scenario.nominalMissKm, 0)} km</div>
              <div className="k">Etkin çarpma yarıçapı</div><div className="v">~{formatNum(IMPACT_RADIUS_KM, 0)} km</div>
              <div className="k">Başlangıç belirsizliği (1σ)</div><div className="v">{formatNum(scenario.initialSigmaKm, 0)} km</div>
            </div>
            <div className="note">Kütle küresel geometri varsayımıyla; çarpma yarıçapı yerçekimi odaklanması katsayısı içeren basitleştirilmiş etkin değerdir.</div>
          </section>

          <section className="panel">
            <div className="panel-head">
              <h2><SlidersHorizontal size={16} /> Gözlem ve Karar</h2>
              <span className="panel-tag">Parametreler</span>
            </div>
            <div className="control">
              <label><strong>Gözlem aşaması</strong><span className="val">{obs.label}</span></label>
              <select value={observationIndex} onChange={e => setObservationIndex(Number(e.target.value))}>
                {stages.map((s, i) => (
                  <option key={i} value={i}>
                    {s.label} (t+{s.yearsFromDetection.toFixed(1)}y, σ={formatNum(s.sigmaKm, 0)} km)
                  </option>
                ))}
              </select>
              <div className="note">{obs.note}</div>
            </div>
            <div className="control">
              <label><strong>Karar / fırlatma gecikmesi</strong><span className="val">{interventionDelayYears.toFixed(1)} yıl</span></label>
              <input type="range" min={0} max={4} step={0.1} value={interventionDelayYears} onChange={e => setInterventionDelayYears(Number(e.target.value))} />
            </div>
            <div className="control">
              <label><strong>Yörünge / geometri faktörü</strong><span className="val">{geometryFactor} km/(mm/s·yıl)</span></label>
              <input type="range" min={10} max={60} step={1} value={geometryFactor} onChange={e => setGeometryFactor(Number(e.target.value))} />
              <div className="note">Sapma hesabını tek katsayıya indirgeyen basitleştirme (gerçek değer yörünge geometrisine bağlıdır); duyarlılık analizi için değiştirilebilir.</div>
            </div>
          </section>

          <section className="panel">
            <div className="panel-head">
              <h2><Gauge size={16} /> Anlık Risk Durumu</h2>
              <span className="panel-tag">Canlı</span>
            </div>
            <div className="kv">
              <div className="k">Seçili aşama belirsizliği (1σ)</div><div className="v accent">{formatNum(obs.sigmaKm, 0)} km</div>
              <div className="k">Tahmini çarpma olasılığı</div><div className={`v ${pClass}`}>{formatProb(pNow)}</div>
              <div className="k">Karşılaşmaya kalan</div><div className="v">{(scenario.timeToEncounterYears - obs.yearsFromDetection).toFixed(1)} yıl</div>
              <div className="k">Önerilen strateji</div><div className="v">{best?.available ? best.strategy.name : 'Yok'}</div>
            </div>
          </section>
        </aside>

        <main className="stack">
          <section className="panel chart-panel">
            <div className="panel-head">
              <h2><Activity size={16} /> Belirsizlik ve Çarpma Olasılığı Evrimi</h2>
              <span className="panel-tag">Zaman Serisi</span>
            </div>
            <div className="chart-wrap">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={timeline} margin={{ top: 10, right: 18, left: 4, bottom: 0 }}>
                  <CartesianGrid stroke="rgba(148,163,184,0.08)" strokeDasharray="3 4" />
                  <XAxis dataKey="t" tickFormatter={(v) => `${v.toFixed(0)}y`} stroke="#60708f" tick={{ fill: '#8494b3', fontSize: 11 }} />
                  <YAxis yAxisId="left" stroke="#60708f" tick={{ fill: '#8494b3', fontSize: 11 }} tickFormatter={(v) => formatNum(v, 0)} width={64} />
                  <YAxis yAxisId="right" orientation="right" stroke="#60708f" tick={{ fill: '#8494b3', fontSize: 11 }} tickFormatter={(v) => `${(v * 100).toFixed(2)}%`} width={72} />
                  <Tooltip
                    formatter={(value: any, name: any) => name === 'Çarpma olasılığı' ? [formatProb(Number(value)), name] : [formatNum(Number(value), 0) + ' km', name]}
                    labelFormatter={(l) => `t+${Number(l).toFixed(1)} yıl`}
                    contentStyle={{ background: 'rgba(12,20,38,0.96)', border: '1px solid rgba(148,163,184,0.22)', borderRadius: 10, color: '#e6edf7', boxShadow: '0 10px 30px rgba(0,0,0,0.4)' }}
                    itemStyle={{ color: '#e6edf7' }}
                    labelStyle={{ color: '#b6c2d9', fontFamily: 'var(--font-mono)' }}
                  />
                  <Legend wrapperStyle={{ paddingTop: 6 }} />
                  <ReferenceLine x={obs.yearsFromDetection} yAxisId="left" stroke="#22d3ee" strokeDasharray="4 4" strokeOpacity={0.8} label={{ value: 'seçili aşama', fill: '#22d3ee', fontSize: 11, position: 'insideTopLeft' }} />
                  <Line yAxisId="left" type="stepAfter" dataKey="sigma" name="Belirsizlik σ (km)" stroke="#60a5fa" dot={false} strokeWidth={2.5} activeDot={{ r: 4, fill: '#60a5fa' }} />
                  <Line yAxisId="right" type="stepAfter" dataKey="p" name="Çarpma olasılığı" stroke="#f43f5e" dot={false} strokeWidth={2.5} activeDot={{ r: 4, fill: '#f43f5e' }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
            <div className="chart-legend-note">
              Gözlem güncellemeleri belirsizliği kademeli düşürür; olasılık, nominal kaçırma ve 1σ dağılımının etkin çarpma yarıçapıyla kesişimine göre (1D basitleştirme) hesaplanır.
            </div>
          </section>

          <section className="panel">
            <div className="panel-head">
              <h2><Rocket size={16} /> Müdahale Stratejisi Karşılaştırması</h2>
              <span className="panel-tag">{assessments.filter(a => a.available).length}/{assessments.length} uygun</span>
            </div>
            <div className="cards">
              {assessments.map((a, i) => (
                <div key={a.strategy.id} className={`card ${i === 0 && a.available ? 'top' : ''}`}>
                  <div className="card-head">
                    <h4>{a.strategy.name}</h4>
                    {i === 0 && a.available && <span className="tag">Önerilen</span>}
                  </div>
                  <div className="desc">{a.strategy.description}</div>
                  {!a.available ? (
                    <div className="callout danger">Uygun değil: {a.reason}</div>
                  ) : (
                    <>
                      <div className="metric"><span className="k">Öncü süre (kullanılabilir)</span><span className="v">{a.leadTimeYears.toFixed(1)} yıl</span></div>
                      <div className="metric"><span className="k">Etkin Δv / sapma</span><span className="v">{a.effectiveDeltaVMmS.toFixed(2)} mm/s · {formatNum(a.deflectionKm, 0)} km</span></div>
                      <div className="metric"><span className="k">Olasılık (önce → sonra)</span><span className={`v ${probClass(a.impactProbabilityAfter)}`}>{formatProb(a.impactProbabilityBefore)} → {formatProb(a.impactProbabilityAfter)}</span></div>
                      <div className="metric"><span className="k">Kaçırma marjı</span><span className={`v ${a.avoidanceMarginKm > 0 ? 'ok' : 'danger'}`}>{formatNum(a.avoidanceMarginKm, 0)} km</span></div>
                      <div className="metric"><span className="k">Güvenilirlik / maliyet / olgunluk</span><span className="v">%{Math.round(a.strategy.reliability * 100)} · {a.strategy.relativeCost}/10 · {a.strategy.techReadiness}/10</span></div>
                      <div className="bar" aria-label={`Skor ${a.successScore}`}><span style={{ width: `${a.successScore}%` }} /></div>
                      <div className="metric"><span className="k">Karşılaştırma skoru</span><span className="v accent">{a.successScore}/100</span></div>
                    </>
                  )}
                </div>
              ))}
            </div>
          </section>

          <div className="row">
            <section className="panel">
              <div className="panel-head">
                <h2><Crosshair size={16} /> Karşılaştırma Tablosu</h2>
                <span className="panel-tag">Metrikler</span>
              </div>
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Strateji</th><th>Durum</th><th>Öncü</th><th>Sapma</th><th>P(önce)</th><th>P(sonra)</th><th>Marj</th><th>Skor</th>
                    </tr>
                  </thead>
                  <tbody>
                    {assessments.map(a => (
                      <tr key={a.strategy.id}>
                        <td>{a.strategy.name}</td>
                        <td className={a.available ? 'ok' : 'danger'}>{a.available ? 'Uygun' : 'Uygun değil'}</td>
                        <td className="num">{a.leadTimeYears.toFixed(1)}y</td>
                        <td className="num">{formatNum(a.deflectionKm, 0)} km</td>
                        <td className="num">{formatProb(a.impactProbabilityBefore)}</td>
                        <td className={`num ${probClass(a.impactProbabilityAfter)}`}>{formatProb(a.impactProbabilityAfter)}</td>
                        <td className={`num ${a.avoidanceMarginKm > 0 ? 'ok' : 'danger'}`}>{formatNum(a.avoidanceMarginKm, 0)} km</td>
                        <td className="num accent">{a.successScore}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>

            <section className="panel">
              <div className="panel-head">
                <h2><Target size={16} /> Karar Brifingi</h2>
                <span className="panel-tag">Özet</span>
              </div>
              <div className="brief">
                <div className={`brief-head ${brief.level}`}>
                  <BriefIcon size={18} />
                  <span>{brief.title}</span>
                </div>
                <ul>{brief.lines.map((l, i) => <li key={i}>{l}</li>)}</ul>
              </div>
              <div className="callout">
                <b><Info size={13} style={{ verticalAlign: 'text-bottom', marginRight: 6 }} />Yorum:</b> Çarpma olasılığı yalnızca mevcut yörünge belirsizliğine bağlı değildir; hedefin fiziksel özellikleri, müdahale sapması ve yön belirsizliği sonuca etki eder. Bu ekran karar-destek amaçlı, basitleştirilmiş ve şeffaf bir model sunar.
              </div>
            </section>
          </div>
        </main>
      </div>

      <footer className="footer">
        <b>Varsayımlar ve sınırlar (şeffaflık):</b> (1) Çarpma olasılığı, nominal kaçırma ve 1σ belirsizlik üzerinden 1D normal yaklaşımıyla (etkin çarpma yarıçapı içinde kalma) hesaplanır. (2) Sapma, <code>sapma_km = geometri_faktörü × Δv(mm/s) × öncü_süre(yıl)</code> basitleştirmesiyle modellenir; gerçek değer yörünge geometrisi, karşılaşma koşulları ve momentum aktarım katsayısına (β) bağlıdır. (3) Strateji parametreleri (Δv, hazırlık süresi, güvenilirlik, maliyet) karşılaştırmalı demo amaçlı temsili değerlerdir. (4) Bu araç operasyonel görev kararı/sertifikasyon yerine geçmez; gözlem güncellemeleri ve yüksek doğruluklu yörünge analizi gerektirir.
      </footer>
    </div>
  )
}
