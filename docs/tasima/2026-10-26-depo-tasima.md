# Uygulamaların kendi depolarına taşınması (2026-10-26)

Yusuf kararı: her uygulama kendi özel deposunda; uygulama kodu ve belgeleri yalnız orada tutulur. Uygulamalarla ilgili notlar hem uygulamanın deposunda hem burada (TEZDENEME) bulunur.

| TEZDENEME klasörü | Yeni depo | Durum |
|---|---|---|
| adim-adim/ | yusufbesir/adim-adim | main geçmişiyle taşındı; 3 açık dal (kelime-agaci, mini-senaryolar, seri-koruma) ve claude/adim-adim-* dalları taşınacak |
| dosya-donusturucu/ | yusufbesir/dosya-donusturucu | taşındı |
| qr-kampanya/ | yusufbesir/qr-kampanya | taşındı |
| yerel-asistan/ | yusufbesir/yerel-asistan | taşındı |
| jev/, scripts/jev*, tests/test_jev*, docs/jev/ | yusufbesir/jev | taşındı |
| skill-kutuphanesi/ | yusufbesir/skill-kutuphanesi | taşındı |
| agentmom/ | yusufbesir/agentmom (mevcut) | asıl depo agentmom; bu kopya eski |
| (depoda yok) TAARKOD, Tutaa, El yazısı OCR | taarkod, tutaa, el-yazisi-ocr | kaynak cihazda (D:\Programlar), cihaz oturumuyla taşınacak |

Eski klasörler silinmedi (silme yok); Yusuf onayından sonra Geri Dönüşüm Kutusu kuralıyla kaldırılabilir. Sır, exe ve veri setleri depolara girmez.
