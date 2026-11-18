# AEGIS Metodoloji ve Varsayımlar

Bu belge, AEGIS MVP’sinde kullanılan hesaplama yaklaşımını, formülleri ve sınırları şeffaf biçimde açıklar.

## 1. Senaryo ve fiziksel büyüklükler
- **Hedef kütlesi (tahmini):** Küresel geometri varsayımı
  - `V = (4/3) π r^3`, `m = ρ V`, `r = D/2`
- **Etkin çarpma yarıçapı:** `R_eff = R_Dünya × f_g`
  - `R_Dünya = 6371 km`, `f_g = 1.15` (yerçekimi odaklanması ve basitleştirilmiş marj katsayısı)
  - Amaç: karşılaştırmalı olasılık hesabı için tutarlı bir eşik; gerçek değer karşılaşma geometrisine bağlıdır.

## 2. Yörünge belirsizliği ve çarpma olasılığı
- Gözlem aşamaları, tespitten itibaren geçen süreye bağlı **1σ belirsizlik** (`σ`) değerleri üretir (kısa yay → takip → radar/önkeşif → yüksek hassasiyet).
- **1D basitleştirme:** Nominal kaçırma mesafesi `μ` (km) ve belirsizlik `σ` (km) için, Dünya’ya çarpma (etkin yarıçap `R_eff` içinde kalma) olasılığı:
  - `P = Φ((R_eff - μ)/σ) - Φ((-R_eff - μ)/σ)`
  - `Φ`: standart normal kümülatif dağılım fonksiyonu (CDF)
- Bu yaklaşım, B-düzlemi/kovaryansın tek eksene indirgenmiş bir temsilidir; gerçek analiz 2B/3B kovaryans ve zamanla yayılan belirsizlik gerektirir.

## 3. Müdahale ve sapma modeli
- **Etkin Δv (mm/s):** Strateji taban değeri hedef kütlesine göre ölçeklenir
  - `Δv_eff = Δv_base × clamp((m_ref / m_hedef)^p, 0.15, 6)`
  - `m_ref`: ~140 m, 2600 kg/m³ referans hedef kütlesi
  - `p`: stratejiye özgü kütle üssü (itki aktarım karakteristiği temsili)
- **Kullanılabilir öncü süre:** `t_lead = t_kalan - (t_hazırlık + t_gecikme)`
  - `t_lead < t_min` ise strateji uygulanamaz.
- **Beklenen sapma (basitleştirilmiş):** `d = k_g × Δv_eff × t_lead`
  - `k_g`: yörünge/geometri faktörü, `km / (mm/s·yıl)` (kullanıcı ayarlı duyarlılık parametresi)
  - Bu ifade, gerçek sapmanın yörünge geometrisi, uygulama yönü ve karşılaşma dinamiğine bağlı karmaşık bağımlılığını tek katsayıya indirger; **karşılaştırmalı** amaçlıdır.
- **Müdahale sonrası durum:**
  - Beklenen kaçırma: `μ' = |μ| + d` (sapmanın kaçırmayı artırdığı en iyi durum yönelimi; yön belirsizliği güvenilirliğe yansıtılır)
  - Bileşik belirsizlik: `σ' = sqrt(σ^2 + (0.12·d)^2)` (uygulama/aktarım belirsizliği temsili katkı)
  - Ham sonrası olasılık: `P_raw = P(μ', σ', R_eff)`
  - Teknik güvenilirlik harmanı: `P_sonra = P_önce·(1-r) + P_raw·r`, `r = güvenilirlik`

## 4. Karşılaştırma skoru (0–100)
Skor; tek bir “doğru” seçimi değil, çok ölçütlü karşılaştırmayı özetler:
- Risk azaltım oranı (en yüksek ağırlık)
- Kaçırma marjı (`μ' - R_eff`)
- Öncü süre tamponu
- Teknoloji olgunluğu
- Bağıl maliyet/karmaşıklık cezası
- Teknik güvenilirlik etkisi

## 5. Strateji parametreleri (MVP, temsili)
| Strateji | Hazırlık | Min. öncü | Taban Δv (ref) | Güvenilirlik | Maliyet | Olgunluk |
|---|---:|---:|---:|---:|---:|---:|
| Kinetik Çarpıcı | 2.5 yıl | 1.5 yıl | 2.2 mm/s | 0.78 | 6/10 | 8/10 |
| Kütleçekim Traktörü | 4.0 yıl | 8.0 yıl | 0.35 mm/s | 0.86 | 8/10 | 5/10 |
| İyon Işını Sapması | 4.5 yıl | 5.0 yıl | 0.9 mm/s | 0.62 | 9/10 | 4/10 |

Parametreler karşılaştırmalı demo içindir; belirli uzay aracı/hedef konfigürasyonuna dayalı mühendislik doğrulaması içermez.

## 6. Sınırlar ve doğru kullanım
- Operasyonel karar/sertifikasyon aracı değildir.
- Gerçek risk değerlendirmesi; çoklu gözlem kaynağı, yüksek doğruluklu yörünge belirleme, tam kovaryans, hedef karakterizasyonu (kütle, yapı, dönü) ve görev düzeyi analiz gerektirir.
- Model; belirsizlik ve seçenekler arasındaki **trade-off’ları görünür kılmayı** hedefler. Girdi/varsayım değiştiğinde sonuçlar yeniden üretilmelidir.
