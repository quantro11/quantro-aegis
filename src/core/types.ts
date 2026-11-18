export interface NeoScenario {
  name: string;
  diameterM: number; // metre
  velocityKmS: number; // Dünya'ya göre bağıl hız (km/s)
  densityKgM3: number; // kg/m^3
  timeToEncounterYears: number; // tespit anından nominal karşılaşmaya
  nominalMissKm: number; // nominal kaçırma mesafesi (+ güvenli taraf varsayımı), km
  initialSigmaKm: number; // başlangıç yörünge belirsizliği (1σ, km)
}

export type StrategyId = 'kinetic' | 'gravity' | 'ion';

export interface DeflectionStrategy {
  id: StrategyId;
  name: string;
  description: string;
  buildTimeYears: number; // geliştirme/fırlatma hazırlık süresi
  minLeadYears: number; // etkin olması için gereken minimum öncü süre
  reliability: number; // 0-1 başarı güvenilirliği (teknik)
  relativeCost: number; // 1-10 bağıl maliyet/karmaşıklık
  techReadiness: number; // 1-10
  // hedef kütlesine göre etkin delta-v (mm/s) tahmini için parametreler
  baseDeltaVMmS: number; // referans (~140m, ~1e10kg) hedef için
  massExponent: number; // deltaV ölçeklenmesi: (m_ref/m_target)^exp
}

export interface ObservationStage {
  label: string;
  yearsFromDetection: number; // tespitten itibaren geçen süre
  sigmaKm: number; // bu aşamada kalan 1σ belirsizlik
  note: string;
}

export interface StrategyAssessment {
  strategy: DeflectionStrategy;
  available: boolean;
  reason?: string;
  leadTimeYears: number; // müdahale anından karşılaşmaya kalan süre
  effectiveDeltaVMmS: number;
  deflectionKm: number; // beklenen sapma (km)
  resultingMissKm: number; // müdahale sonrası beklenen kaçırma
  resultingSigmaKm: number; // belirsizlik (müdahale belirsizliği dahil basit)
  impactProbabilityBefore: number; // 0-1
  impactProbabilityAfter: number; // 0-1
  avoidanceMarginKm: number; // R_impact üzerindeki marj
  successScore: number; // 0-100 karşılaştırma skoru
}

export interface SimulationState {
  scenario: NeoScenario;
  observationIndex: number; // seçili gözlem aşaması
  interventionDelayYears: number; // gözlemden sonra müdahale kararı/fırlatma gecikmesi
  geometryFactor: number; // sapma katsayısı (km / (mm/s * yıl)) - yörünge geometrisi basitleştirmesi
}
