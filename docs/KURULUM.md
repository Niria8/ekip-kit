# Kurulum ve kullanım (Türkçe)

## 1. Kiti ekibe dağıtmak

Kit bir Claude Code plugin'i ve kendi marketplace'i olan bir git deposudur.

- **Ekip için (önerilen):** Depoyu şirketin GitHub'ına (veya iç git
  sunucusuna) gönderin, örn. `ORG/ekip-kit`. Sonra
  `skills/team-project-setup/templates/.claude/settings.json` içindeki
  `ORG/ekip-kit` değerini gerçek depo adıyla değiştirin. Ekip üyelerinin bu
  depoya okuma erişimi olmalı.
- **Tek makinede denemek için:** klasör yolu yeterlidir.

```bash
claude plugin marketplace add <depo-url-veya-klasor-yolu> --scope project
```

```bash
claude plugin install ekip-kit@ekip-kit-marketplace --scope project
```

Projede eski `claude-team-kit` açıksa kapatın (ikisi aynı hook'ları çalıştırır):

```bash
claude plugin disable claude-team-kit@claude-team-kit-marketplace --scope project
```

## 2. Projeyi kurmak

Projede Claude'a şunu söyleyin:

> team-project-setup skill'i ile bu projeyi kur.

Skill şunları ekler ve var olan dosyaların üzerine yazmaz, birleştirir:
`CLAUDE.md`, `.claude/rules/`, `.claude/guardrails.json`,
`.claude/settings.json`, `docs/knowledge/` ve CI iş akışı. Sizden istenecekler:

- **Test komutları:** `CLAUDE.md` Commands bölümündeki komutlar temiz bir
  klonda çalışmalı. Test betiği ortam değişkeni ayarlıyorsa komuta da
  yazın (örn. FastAPI demo projesinde `FASTAPI_ENV=development`).
- **Korumalı yollar:** `.claude/guardrails.json` → `protectedPaths`. Ekibin
  "dokunulmaz" saydığı modüller (kimlik doğrulama, uygulanmış migration'lar,
  ödeme). Bu değişiklikte yeni oluşturulan dosyalar korumadan muaftır.
- **Değişmezler:** `docs/knowledge/invariants/INVARIANTS.md` — her biri
  onu kanıtlayan testi yazar.
- **CI:** `.github/workflows/claude-team-guardrails.yml` içindeki iki `TODO`
  (kurulum ve test komutu).

Kontrol:

```bash
node .claude/scripts/check-knowledge.js
```

## 3. Günlük kullanım

| Ne zaman | Ne yazılır |
|---|---|
| Önemsiz olmayan bir iş | `/plan-change <istek>` → plan onayı → uygulama |
| Değişiklik bitti | `/verify` → bağımsız doğrulama, inceleme, gerekiyorsa güvenlik |
| Bir şey öğrenildi | `/lesson` |
| Hafıza şişti | `/memory-cleanup` — önce liste, onaydan sonra arşive taşır, asla silmez |

Hata düzeltme, test yazma, güvenlik ve hafıza işlerinde ilgili skill'ler
(`systematic-debugging`, `test-driven-development`, `safe-change`,
`test-integrity`, `security-gate`, `team-memory`) oturum başındaki
yönergeyle otomatik devreye girer.

## 4. Sorun çıkarsa

- Bir hook işi haksız yere engelliyorsa geçici olarak kapatın ve durumu
  bildirin:

```bash
EKIP_KIT_DISABLE=guard claude
```

  (`EKIP_KIT_DISABLE=1` hepsini kapatır.)
- Kitin kendi testleri:

```bash
npm test
```

## 5. İsteğe bağlı eklentiler

semgrep skill'leri (`npx skills add semgrep/skills`), Graphify veya Serena
(büyük kod tabanında etki analizi), `docs/knowledge/` klasörünü Obsidian ile
açmak, PR inceleme servisleri. Ayrıntı: `README.md` → Optional companions.
