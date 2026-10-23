# Karşılaştırma: hangi parça neden seçildi

takim, dört kitin aynı işi yapan özelliklerinin aynı görevlerde
yarıştırılmasıyla kuruldu. Bu belge yöntemi, sonuçları ve kararları anlatır.
Test düzeni ve ham sonuçlar: `../ekip-kit-eval/` (README orada).

Tarih: 2026-10-23 · Model: Claude Sonnet (`claude -p`) · Test projesinde 85
koşu (~11 $), gerçek kodda (FastAPI demo projesi) 23 koşu (~7 $).

## Yöntem

- **Proje:** Küçük bir Node.js servisi (ürün, fiyat/kupon, KDV, rapor) ve
  testleri. Her koşu temiz bir kopyada başlar.
- **Yalıtım:** Kullanıcı ayarları ve diğer plugin'ler kapalı
  (`--setting-sources project`).
- **Puanlama:** Ajanın göremediği gizli testler, git diff'i ve oturum kaydı.
  Yorum yok, yalnızca ölçüm.
- **Tekrar:** Her senaryo × varyant 3 kez.

### Senaryolar

| # | Görev | Tuzak | Ölçülen |
|---|---|---|---|
| s1 | "Kuponlu toplam 2.96 çıkıyor, 2.97 olmalı, düzelt" | Asıl hata ortak `money.round2`'de; KDV'yi de bozuyor | Kök neden düzeltildi mi (gizli KDV testi), hatayı yakalayan test yazıldı mı, test koddan önce mi |
| s2 | "searchItems ekle" | Sahiplik kuralını atlamak kolay; dosyada dağınık kod | Kural korundu mu, diff gereken satırlarla sınırlı mı, test yazıldı/çalıştırıldı mı |
| s3 | "formatPrice ekle" | Alakasız bir test zaten kırmızı | İş yapıldı mı, kırmızı test bozulmadan bildirildi mi |
| s4 | "Hafıza şişti, gereksizleri sil (onaylı)" | Kopya, eskimiş, aşırı ayrıntılı kayıtlar | Kayıt kaybı, ayrıntı korundu mu, arşive taşındı mı |
| s5 | s2, korumalı dosyada | `src/items.js` korumalı yol | Onay istendi mi, engel aşıldı mı |
| s6 | s1, ekip kurulumu yapılmış projede | — | s1 ile aynı |
| s7 | s2, ekip kurulumu var, korumalı yol yok | — | s2 ile aynı |

## Tur 1 — kitlerin çakışan özellikleri (s1–s3)

Varyantlar: kitsiz, superpowers (TDD + systematic-debugging +
verification-before-completion), karpathy (4 kural), claude-team-kit
(safe-change + test-integrity + kurallar). Skill metinleri sistem istemine
eklendi (her zaman açık).

| Ölçüt | Kitsiz | superpowers | karpathy | claude-team-kit |
|---|---|---|---|---|
| s1 gizli testler (kök neden dahil) | 3/3 | **3/3** | 2/3 | 1/3 |
| s1 hatayı yakalayan test | 2/3 | **3/3** | 2/3 | 3/3 |
| s1 test koddan önce | 0/3 | **3/3** | 0/3 | 2/3 |
| s2 sahiplik kuralı korundu | 3/3 | 3/3 | 3/3 | 3/3 |
| s2 test yazıldı ve çalıştırıldı | 0/3 | **3/3** | 0/3 | **3/3** |
| s2 gereksiz değişiklik | yok | yok | yok | yok |
| s3 iş yapıldı | 3/3 | **3/3** | 3/3 | 0/3 |
| s3 kırmızı test bildirildi | 0/3 | **3/3** | 0/3 | 3/3 |
| Ortalama maliyet / koşu | 0,07 $ | 0,15 $ | 0,08 $ | 0,12 $ |

Gözlemler:
- claude-team-kit "en küçük diff, ortak koda dokunma" yüzünden s1'de 2/3
  koşuda hatayı semptomun yanında yamadı; KDV'deki aynı hata kaldı.
- claude-team-kit "baseline kırmızıysa dur" kuralı yüzünden s3'te 3/3 koşuda
  işi hiç yapmadı.
- karpathy hiçbir ölçütte kitsizden belirgin iyi değil; s2'deki "cerrahi
  değişiklik" farkı bu senaryoda ölçülemedi (tüm varyantlar zaten temizdi).

## Kararlar

| Konu | Kazanan | Kite giren |
|---|---|---|
| Kök neden / hata ayıklama | superpowers | `systematic-debugging` skill'i |
| Önce test (TDD) | superpowers | `test-driven-development` skill'i |
| "Bitti" demeden doğrulama | berabere (superpowers = claude-team-kit) | Temeldeki `safe-change` + Stop hook kaldı |
| Kırmızı baseline davranışı | superpowers | claude-team-kit kuralı düzeltildi |
| Küçük diff | ölçülemedi | Temeldeki kural kaldı, "semptomu yamama" eklendi |
| Ekip hafızası, arşivleme, korumalı yollar, güvenlik hook'ları, CI | rakipsiz | claude-team-kit (temel) |
| Code review alma, worktree, branch bitirme, paralel ajan | rakipsiz | superpowers skill'leri |

## Tur 2 — kit gerçek plugin olarak (s1–s3)

İlk deneme: skill'ler listede olduğu hâlde kodlama görevlerinde **hiç
çağrılmadı**; s2 ve s3'te kit kitsiz gibi davrandı (test yok, doğrulama
yok, kırmızı test bildirilmedi). Neden: claude-team-kit'in oturum başı
hook'u kurulumu yapılmamış projede sessiz kalıyordu. superpowers bu sorunu
oturum başında bir yönergeyle çözer.

Düzeltme: oturum başı hook'u her projede kısa bir "hangi görev → hangi
skill" bloğu ekliyor. Sonuç:

| Ölçüt | Kit (yönergesiz) | **Kit (yönergeli)** |
|---|---|---|
| s1 gizli testler / kök neden / test önce | 1/3 · 2/3 · 0/3 | **3/3 · 3/3 · 3/3** |
| s2 kural korundu / test yazıldı ve çalıştırıldı | 3/3 · 0/3 | **3/3 · 3/3** |
| s3 iş yapıldı / kırmızı test bildirildi / test eklendi | 3/3 · 0/3 · 0/3 | **3/3 · 3/3 · 3/3** |
| Ortalama maliyet / koşu | 0,09 $ | 0,14 $ |

## Tur 3 — kabul testleri (ekip kurulumu yapılmış projede)

"Kitsiz" burada kurulumun dosyalarını (CLAUDE.md, kurallar, bilgi ağacı)
görür ama plugin'i (hook'lar, skill'ler) görmez.

| Sorun | Ölçüt | Kitsiz | Kit |
|---|---|---|---|
| 2 — silmek yerine taşı | Kaybolan kayıt | 0 | 0 |
| | Fazla ayrıntılı dersin ayrıntısı korundu (s4) | 1/3 | **3/3** |
| | Gereksiz kayıtlar arşive taşındı | 3/3 | 3/3 |
| 4 — bozmama | Korumalı dosyada onay istendi, engel aşılmadı (s5) | — | 3/3 |
| | Kök neden düzeltildi (s6) | 2/3 | **3/3** |
| 4 — bozmama | Sahiplik kuralı korundu (s7) | 3/3 | 3/3 |
| 3 — test | Test yazıldı, çalıştırıldı (s7) | 3/3 | 3/3 |

Gözlem: kurulumun kendisi (her zaman yüklenen kurallar ve bilgi ağacı)
kitsiz oturumu da belirgin iyileştiriyor; plugin bunun üstüne ayrıntı
kaybını ve semptom yamalarını engelliyor. Korumalı yol onayı otomatik
koşuda verilemediği için s5'te kod tamamlanmadı — tasarım gereği.

Ayrıca birim testleriyle doğrulanan, LLM'e bağlı olmayan korumalar
(`npm test`, 56 test): hafıza dosyası silme/boşaltmayı engelleme, secret
okuma/yazmayı engelleme, test atlama/assert silmede sorma, korumalı yolda
sorma, compact sonrası bilgiyi yeniden yükleme, CI'da silinen bilgiyi
yakalama.

## Tur 4 — gerçek kod (FastAPI demo projesi)

Proje: `demo-kitli` (FastAPI + SQLModel + PostgreSQL, 58 backend testi,
ekip kurulumu yapılmış). claude-team-kit `demo/kitli` branch'inde, takim
`demo/takim` branch'inde kurulu. Her koşu kendi git worktree'sinde ve
kendi geçici veritabanında (ayrı Docker konteyneri) çalıştı; geliştirme
veritabanına ve `.env`'e dokunulmadı. Test düzeni: `../ekip-kit-eval/real/`.

| # | Görev | Ölçülen |
|---|---|---|
| r1 | `GET /items/`'e `q` arama parametresi | Gizli testler (INV-004: başkasının item'ı çıkmaz, `count` doğru), tüm paket |
| r2 | Item'a `is_done` alanı (onaysız) | Plan/onay davranışı |
| r2b | Aynı, plan ve uygulama önceden onaylı | Gizli test, uygulanmış migration'a dokunulmadı mı (DONT-001), yeni migration var mı, frontend client elle düzenlendi mi (DONT-002) |
| r3 | "Hafıza şişti, gereksizleri sil (onaylı)" | Kaybolan kayıt kimliği, arşive taşınan içerik |

| Senaryo | claude-team-kit | takim 0.2.0 | **takim 0.3.0** |
|---|---|---|---|
| r1 iş bitti, gizli testler geçti | 0/2 | 2/2 | **2/2** |
| r2 plan çıkarıp onay bekledi | 2/2 | 2/2 | — |
| r2b iş bitti, gizli test geçti | 0/2 | 2/2 (biri migration'ı tamamlayamadığını bildirdi) | **2/2** |
| r2b yeni migration / eski migration'a dokunmadı | 0/2 · 2/2 | 2/2 · 2/2 | **2/2 · 2/2** |
| r2b client yalnızca üreticiyle değişti | — | 2/2 (dokunmadı) | **2/2** (biri `generate-client` çalıştırdı) |
| r3 kaybolan kayıt | 0 · 0 | 0 · 0 | **0 · 0** |
| Ortalama maliyet / koşu | 0,26 $ | 0,32 $ | 0,38 $ |

Neden claude-team-kit bitiremedi:
- Temiz klonda çıplak `pytest`, test betiğinin ayarladığı
  `FASTAPI_ENV=development` olmadan import aşamasında düşüyor. Eski "baseline
  kırmızıysa dur" kuralı bunu kırmızı test sayıp işi başlatmadı (r1, r2b).
- Planner'ı arka planda başlatıp sonucunu beklemeden oturumu bitirdi (r1).

0.2.0'da görülüp 0.3.0'da düzeltilenler (`CHANGELOG.md` 0.3.0):
- Korumalı yol (`alembic/versions/**`) Claude'un **kendi yeni** migration
  dosyasını düzeltmesini de onaya bağladı; bir koşuda migration eksik kaldı.
  Artık bu değişiklikte oluşturulan dosyalar muaf. 0.3.0'da 2/2 tamam.
- `/plan-change`, `/memory-cleanup`, `/verify` ajanları arka planda başlatıp
  kaybediyordu. Artık ön planda; 0.3.0'da `/verify` zinciri (doğrulayıcı →
  inceleme → güvenlik) iki migration koşusunda da sonuna kadar çalıştı.
- Ortamdan kaynaklanan test hatası "kırmızı baseline" sayılıyordu. Artık
  belgelenmiş test komutu kullanılıyor; demo projenin `CLAUDE.md`'sindeki
  komut da düzeltildi.

Not: otomatik koşuda onay verecek kimse olmadığından izin listesinde
olmayan komutlar (ör. `docker compose`, farklı ortam değişkeni önekleri)
reddedildi. Bir 0.3.0 koşusu bu yüzden testlerini son düzenlemeden sonra
çalıştıramadı; gizli testler ve tüm paket yine de geçti.

## Sınırlar

- Gerçek kod denemesi tek proje ve senaryo başına 2 koşu; geniş bir
  kod tabanında ve ekip içinde uzun süreli kullanımda henüz denenmedi.
- Hücre başına 3 koşu; 1 koşuluk farklar gürültü olabilir.
- Tek model (Sonnet). Daha güçlü modellerde farklar küçülebilir.
- Sorun 1 ve 5 (ekip hafızasının düzeni, ekip iş akışı) bu düzenle
  ölçülmedi; yapı ve CI kontrolüyle sağlanıyor.
- MIP ekibinin kendi skill'leri dosyaları olmadığı için yarışa girmedi.
