# AEGIS — Uçtan Uca Gezegen Savunma Karar Sistemi

**AEGIS**, varsayımsal bir Dünya’ya yakın cisim (NEO) tehdidi senaryosunda **tespit → yörünge belirsizliği/çarpma olasılığı evrimi → müdahale stratejisi tasarımı ve karşılaştırması → karar brifingi** akışını tek bir etkileşimli platformda birleştiren, bağımsız bir Quantro Ar-Ge projesidir.

> Konumlandırma: Ön-tasarım ve **karar-destek simülasyonu** (eğitim/araştırma/vitrin). Operasyonel görev kararı veya sertifikasyon yerine geçmez; tüm varsayımlar ve belirsizlikler görünürdür.

## Çözülen sorun
Asteroit/kuyruklu yıldız çarpması düşük olasılıklı ancak küresel ve varoluşsal sonuçlu bir risktir. Mevcut süreçler parçalıdır: risk/olasılık değerlendirmesi, yörünge belirsizliğinin zamanla daralması ve sapma görevi seçenekleri (kinetik çarpıcı, kütleçekim traktörü, iyon ışını vb.) çoğu zaman ayrı araçlarda ele alınır.

**AEGIS’in ele aldığı açık problem:** “Bir cisim tespit edildiğinde, belirsizlik güncellemeleri altında çarpma olasılığı nasıl evrilir ve hangi müdahale seçeneği, ne zaman, hangi başarı marjı/süre/maliyet/olgunluk dengesiyle uygulanmalıdır?” sorusuna uçtan uca, şeffaf ve senaryo karşılaştırmalı yanıt üretmek.

## Özellikler (MVP)
- **Senaryo modeli:** Çap, hız, yoğunluk → kütle tahmini; nominal kaçırma, karşılaşma süresi, başlangıç belirsizliği (1σ)
- **Gözlem güncellemeleri:** Aşamalı gözlem (ilk tespit, takip, radar/önkeşif, yüksek hassasiyet) ile belirsizlik daralması ve olasılık evrimi
- **Çarpma olasılığı:** Etkin çarpma yarıçapı ve 1D normal belirsizlik yaklaşımıyla şeffaf hesap
- **Müdahale stratejileri (3):** Kinetik Çarpıcı, Kütleçekim Traktörü, İyon Işını Sapması — öncü süre, Δv/sapma, güvenilirlik, maliyet, teknoloji olgunluğu
- **Karşılaştırma ve brifing:** Risk azaltımı, kaçırma marjı, kullanılabilirlik ve karşılaştırma skoru; karar özeti
- **Duyarlılık:** Yörünge/geometri faktörü ve karar gecikmesi ile etkileşimli analiz

## Proje yapısı
```
quantro-aegis/
├─ src/
│  ├─ core/           # türler, senaryo/olasılık/sapma modeli
│  │  ├─ types.ts
│  │  └─ model.ts
│  ├─ components/     # (genişlemeye hazır)
│  ├─ App.tsx         # ana arayüz ve görselleştirme
│  ├─ main.tsx
│  └─ styles.css
├─ docs/
│  ├─ METHODOLOGY.md  # yöntem, formüller, varsayımlar
│  └─ ROADMAP.md      # yol haritası
├─ index.html
├─ package.json
├─ tsconfig.json
└─ vite.config.ts
```

## Kurulum ve çalıştırma
```bash
npm install
npm run dev      # geliştirme sunucusu
npm run build    # üretim derlemesi
npm run preview  # derleme önizleme
```

## Varsayımlar ve sınırlar
- Çarpma olasılığı ve sapma, karşılaştırmalı karar demosu için **basitleştirilmiş** analitik modellerle hesaplanır (1D belirsizlik, tek geometri faktörü). Gerçek görev tasarımı; yüksek doğruluklu yörünge propagasyonu, 3B/kovaryans analizi, hedefin fiziksel yapısı (rubble pile vb.) ve β (momentum aktarımı) gibi parametreleri gerektirir.
- Strateji parametreleri temsili/karşılaştırma amaçlıdır; belirli bir görev veya cisme özgü doğrulama içermez.
- Araç, operasyonel erken uyarı/karar sistemlerinin yerine geçmez.

## Yol haritası (özet)
- [ ] Gerçek/örnek NEO parametre setleri ve senaryo kitaplığı
- [ ] 2B b-düzlemi ve kovaryans evrimi görselleştirmesi (basitleştirilmiş)
- [ ] Monte Carlo duyarlılık (geometri, β, kütle belirsizliği)
- [ ] Dışa aktarım: senaryo JSON ve karar brifingi (PDF/Markdown)
- [ ] Çoklu tehdit ve zaman penceresi optimizasyonu

## Lisans
TBD (Quantro Ar-Ge)

---
*AEGIS — Quantro bağımsız yeni proje. Mevcut Quantro/Martiap projeleri bu çalışmadan etkilenmez.*
