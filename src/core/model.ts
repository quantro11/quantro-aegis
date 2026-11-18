import { DeflectionStrategy, NeoScenario, ObservationStage, SimulationState, StrategyAssessment } from './types';

export const EARTH_RADIUS_KM = 6371;
// Yerçekimi odaklanması ve atmosfer etkisi için basitleştirilmiş etkin çarpma yarıçapı katsayısı
export const GRAV_FOCUS_FACTOR = 1.15;
export const IMPACT_RADIUS_KM = EARTH_RADIUS_KM * GRAV_FOCUS_FACTOR;

export const DEFAULT_STRATEGIES: DeflectionStrategy[] = [
  {
    id: 'kinetic',
    name: 'Kinetik Çarpıcı',
    description: 'Yüksek hızlı uzay aracının çarpma impulsu ile yörünge değiştirme (DART benzeri). Kısa-orta öncü sürede yüksek etki.',
    buildTimeYears: 2.5,
    minLeadYears: 1.5,
    reliability: 0.78,
    relativeCost: 6,
    techReadiness: 8,
    baseDeltaVMmS: 2.2, // referans hedef için mm/s
    massExponent: 0.85,
  },
  {
    id: 'gravity',
    name: 'Kütleçekim Traktörü',
    description: 'Uzay aracının kütleçekim çekimiyle uzun süreli, hassas ve yavaş sapma. Çok uzun öncü süre gerektirir.',
    buildTimeYears: 4,
    minLeadYears: 8,
    reliability: 0.86,
    relativeCost: 8,
    techReadiness: 5,
    baseDeltaVMmS: 0.35,
    massExponent: 0.7,
  },
  {
    id: 'ion',
    name: 'İyon Işını Sapması (Standoff)',
    description: 'Uzay aracından hedefe yöneltilen iyon demetiyle sürekli itki/ablasyon etkisi. Orta-uzun öncü sürede kademeli sapma.',
    buildTimeYears: 4.5,
    minLeadYears: 5,
    reliability: 0.62,
    relativeCost: 9,
    techReadiness: 4,
    baseDeltaVMmS: 0.9,
    massExponent: 0.75,
  },
];

export const DEFAULT_SCENARIO: NeoScenario = {
  name: 'Varsayımsal NEO-2026-AEGIS',
  diameterM: 180,
  velocityKmS: 18,
  densityKgM3: 2600,
  timeToEncounterYears: 12,
  nominalMissKm: 0, // nominal yörünge Dünya-merkezli (belirsizlik altında risk var)
  initialSigmaKm: 18000,
};

export function defaultObservationStages(s: NeoScenario): ObservationStage[] {
  const E = s.timeToEncounterYears;
  const clampT = (t: number) => Math.min(Math.max(t, 0), E * 0.95);
  return [
    { label: 'İlk tespit (kısa yay)', yearsFromDetection: 0, sigmaKm: s.initialSigmaKm, note: 'Az sayıda gözlem, yüksek yörünge belirsizliği' },
    { label: 'Takip gözlemleri', yearsFromDetection: clampT(E * 0.08), sigmaKm: s.initialSigmaKm * 0.32, note: 'Yay uzadı, belirsizlik belirgin azaldı' },
    { label: 'Radar / önkeşif verisi', yearsFromDetection: clampT(E * 0.22), sigmaKm: s.initialSigmaKm * 0.09, note: 'Mesafe/hız kısıtı güçlendi' },
    { label: 'Yüksek hassasiyet astrometri', yearsFromDetection: clampT(E * 0.45), sigmaKm: s.initialSigmaKm * 0.03, note: 'Belirsizlik daraldı, risk penceresi netleşiyor' },
  ];
}

export function targetMassKg(s: NeoScenario): number {
  const r = s.diameterM / 2;
  const volume = (4 / 3) * Math.PI * r * r * r;
  return volume * s.densityKgM3;
}

// Standart normal CDF (Abramowitz & Stegun yaklaşımı)
export function normalCdf(x: number): number {
  const sign = x < 0 ? -1 : 1;
  const z = Math.abs(x) / Math.sqrt(2);
  const t = 1 / (1 + 0.3275911 * z);
  const a1 = 0.254829592, a2 = -0.284496736, a3 = 1.421413741, a4 = -1.453152027, a5 = 1.061405429;
  const erf = 1 - (((((a5 * t + a4) * t + a3) * t + a2) * t + a1) * t) * Math.exp(-z * z);
  return 0.5 * (1 + sign * erf);
}

// 1D basitleştirme: nominal kaçırma mu, belirsizlik sigma iken |X| < R olasılığı
export function impactProbability(muKm: number, sigmaKm: number, radiusKm = IMPACT_RADIUS_KM): number {
  if (sigmaKm <= 1e-6) return Math.abs(muKm) < radiusKm ? 1 : 0;
  const p = normalCdf((radiusKm - muKm) / sigmaKm) - normalCdf((-radiusKm - muKm) / sigmaKm);
  return Math.min(1, Math.max(0, p));
}

export function effectiveDeltaV(strategy: DeflectionStrategy, scenario: NeoScenario): number {
  const refMass = (4 / 3) * Math.PI * Math.pow(70, 3) * 2600; // ~140m çap referans
  const m = targetMassKg(scenario);
  const scale = Math.pow(refMass / Math.max(m, 1e6), strategy.massExponent);
  // çok büyük hedeflerde doyum, çok küçüklerde üst sınır
  const dv = strategy.baseDeltaVMmS * Math.min(6, Math.max(0.15, scale));
  return dv;
}

export function assessStrategy(
  strategy: DeflectionStrategy,
  state: SimulationState,
  observation: ObservationStage,
): StrategyAssessment {
  const { scenario, interventionDelayYears, geometryFactor } = state;
  const pBefore = impactProbability(scenario.nominalMissKm, observation.sigmaKm);

  const timeAvailable = scenario.timeToEncounterYears - observation.yearsFromDetection;
  const prep = strategy.buildTimeYears + interventionDelayYears;
  const leadTimeYears = timeAvailable - prep;
  const available = leadTimeYears >= strategy.minLeadYears;

  if (!available) {
    return {
      strategy,
      available: false,
      reason: `Yetersiz öncü süre (gereken ≥ ${strategy.minLeadYears}y, kullanılabilir ${Math.max(0, leadTimeYears).toFixed(1)}y)`,
      leadTimeYears: Math.max(0, leadTimeYears),
      effectiveDeltaVMmS: 0,
      deflectionKm: 0,
      resultingMissKm: scenario.nominalMissKm,
      resultingSigmaKm: observation.sigmaKm,
      impactProbabilityBefore: pBefore,
      impactProbabilityAfter: pBefore,
      avoidanceMarginKm: Math.abs(scenario.nominalMissKm) - IMPACT_RADIUS_KM,
      successScore: 0,
    };
  }

  const dv = effectiveDeltaV(strategy, scenario);
  // Basitleştirilmiş sapma: km ~ katsayı * (mm/s) * yıl (yörünge geometrisi tek faktöre indirgenmiş)
  const deflectionKm = geometryFactor * dv * leadTimeYears;

  // Nominal kaçırma sapma yönünde artar (en iyi durum senaryosu); yön belirsizliği basitçe güvenilirliğe yansıtılır
  const resultingMissKm = Math.abs(scenario.nominalMissKm) + deflectionKm;
  // Müdahale uygulama belirsizliği: küçük sigma katkısı
  const sigmaAfter = Math.sqrt(observation.sigmaKm * observation.sigmaKm + Math.pow(deflectionKm * 0.12, 2));
  const pAfterRaw = impactProbability(resultingMissKm, sigmaAfter);
  // Teknik güvenilirlik: başarısızlıkta risk azalmaz (basit harman)
  const pAfter = pBefore * (1 - strategy.reliability) + pAfterRaw * strategy.reliability;
  const margin = resultingMissKm - IMPACT_RADIUS_KM;

  // Karşılaştırma skoru: risk azaltımı, marj, süre güvenliği, maliyet/olgunluk dengesi
  const riskReduction = pBefore <= 1e-9 ? 1 : Math.max(0, (pBefore - pAfter) / Math.max(pBefore, 1e-9));
  const marginScore = 1 / (1 + Math.exp(-margin / Math.max(IMPACT_RADIUS_KM, 1)));
  const leadBuffer = Math.min(1, (leadTimeYears - strategy.minLeadYears + 0.5) / 6);
  const costPenalty = 1 - (strategy.relativeCost - 1) / 18;
  const readiness = strategy.techReadiness / 10;
  const successScore = Math.round(
    100 * (0.45 * riskReduction + 0.25 * marginScore + 0.12 * leadBuffer + 0.1 * readiness + 0.08 * costPenalty) *
      (0.6 + 0.4 * strategy.reliability)
  );

  return {
    strategy,
    available: true,
    leadTimeYears,
    effectiveDeltaVMmS: dv,
    deflectionKm,
    resultingMissKm,
    resultingSigmaKm: sigmaAfter,
    impactProbabilityBefore: pBefore,
    impactProbabilityAfter: pAfter,
    avoidanceMarginKm: margin,
    successScore: Math.min(100, Math.max(0, successScore)),
  };
}

export function runSimulation(state: SimulationState, strategies = DEFAULT_STRATEGIES): StrategyAssessment[] {
  const obs = defaultObservationStages(state.scenario)[state.observationIndex];
  return strategies
    .map((st) => assessStrategy(st, state, obs))
    .sort((a, b) => b.successScore - a.successScore);
}

export function riskTimeline(state: SimulationState, points = 24): { t: number; label: string; sigma: number; p: number }[] {
  const stages = defaultObservationStages(state.scenario);
  const E = state.scenario.timeToEncounterYears;
  const out: { t: number; label: string; sigma: number; p: number }[] = [];
  for (let i = 0; i <= points; i++) {
    const t = (E * i) / points;
    // t anındaki sigma: o ana kadar ulaşılmış en iyi aşama
    let sigma = state.scenario.initialSigmaKm;
    let label = 'Tespit';
    for (const st of stages) {
      if (st.yearsFromDetection <= t) { sigma = st.sigmaKm; label = st.label; }
    }
    out.push({ t, label, sigma, p: impactProbability(state.scenario.nominalMissKm, sigma) });
  }
  return out;
}

export function formatProb(p: number): string {
  if (p <= 0) return '0%';
  if (p < 1e-4) return `${(p * 100).toExponential(1)}%`;
  if (p < 0.01) return `${(p * 100).toFixed(3)}%`;
  return `${(p * 100).toFixed(2)}%`;
}

export function formatNum(n: number, digits = 0): string {
  return n.toLocaleString('tr-TR', { maximumFractionDigits: digits, minimumFractionDigits: digits });
}
