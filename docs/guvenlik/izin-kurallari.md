# Proje izin kuralları

[İP:Jev'i projeye bağlama#TMGrRs]

`.claude/settings.json` Claude Code oturumlarına iki liste verir:

- **deny (yasak):** `.env`, `.env.*`, `*.key`, `*.jks`, `*.pem`, `key.properties`, `~/.ssh/**` ve `~/.aws/**` okunamaz; zorla push (`--force`, `-f`, `--force-with-lease`, `+dal` biçimleri) yapılamaz.
- **ask (onay ister):** `git reset --hard`, `git clean`, `rm -rf` ve türevleri (`-fr`, `-Rf`, `-r -f`, `--recursive --force`), `taskkill`, `Stop-Process`, `pkill`, `killall`. Süreç sonlandırma onayı, tarayıcıların (özellikle Brave) kapatılmaması kuralını da korur.

## Bilinen sınırlar

- `Read(...)` kuralları yalnız Claude'un dosya okuma aracını durdurur. `cat .env`, `type .env`, `Get-Content .env` gibi bir kabuk komutu bu kurala takılmaz. Gizli dosyaların asıl koruması, depoya hiç girmemeleri (`.gitignore`) ve anahtarların yalnız ortam değişkeninde ya da cihazdaki anahtar dosyasında durmasıdır.
- Bash kuralları komut önekine bakar. Komut zincirleri, takma adlar ya da betik içinden çağrılan komutlar her zaman yakalanmaz; bu liste bir emniyet kemeridir, tek koruma değildir.
- Kurallar yalnız bu depoda açılan oturumlara uygulanır.
