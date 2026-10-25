# ADR-001: Yığın ve yapı (öneri, Yusuf onayı bekliyor: Faz 1 başında)
Bağlam: Yusuf Claude Code IDE deneyimini beğeniyor; tek kullanıcı. REA yapı incelemesi: Claude Code/Codex tek ikili + ince sarmalayıcı, katmanlı JSON/TOML ayar, JSONL oturum günlüğü, agents/skills/commands klasör üçlüsü, headless stream-json.
Karar: TypeScript çekirdek (Node 24 uyumlu); yerel HTTP/WebSocket arka uç; React arayüz, IDE benzeri yan panelli; SQLite (durum, FTS5) + JSONL olay günlüğü (yeniden oynatma); sırlar Windows Credential Manager (yalnız secret_ref saklanır); `agentmom` terminal komutu aynı çekirdeği kullanır; masaüstü kabuğu ertelendi.
Alternatifler: Python (eski YZ Merkezi, reddedildi: tek ekosistem ve ortak tipler için), Electron/Tauri (Faz 1 sonunda ölçüm), Bun (cihazda doğrulanmadı).
Sonuçlar: Python koduna geri dönüş yok; eski kod yalnız referans (yz-merkezi, arsiv-son-calisir-kod).
