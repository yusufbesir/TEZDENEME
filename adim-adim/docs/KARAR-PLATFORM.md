# Platform ve dil kararı

İz etiketi: [İP:Adım Adım öğrenme uygulaması#Dwv81f] · Tarih: 2026-10-15

## Özet
- Karar: **Flutter (Dart)**. Tek kod tabanından Android, iOS, Windows, macOS ve Linux'a kurulabilir yerel uygulama çıkar; web görünümü (HTML) kullanılmaz.
- Jev bu oturumda erişilebilir değildi (bağlantı başka bir iş parçacığında kuruluyor). Zorluk ve karar Jev'siz, araştırma ajanının bulgularıyla koordinatör (Fable) tarafından verildi.

## Karşılaştırma (araştırma ajanı, claude-sonnet-5-5, 2026-10-15)
| Seçenek | Android/iOS/Windows | Not |
|---|---|---|
| Flutter | Üçü de resmî destekli | Kendi çizim motoru, Dart tek dil, paket ekosistemi olgun |
| React Native | Windows, Microsoft'un ayrı projesi | Masaüstü önceliği düşük, Linux yok |
| Kotlin Multiplatform + Compose | Üçü de var | Küçük topluluk, öğrenme eğrisi yüksek |
| .NET MAUI | Windows var, Linux yok | macOS yerel değil (Catalyst) |
| Tauri 2 | Var | Web görünümü kullanır; kullanıcı HTML istemedi, dışlandı |

Kaynaklar: https://docs.flutter.dev/platform-integration/desktop · https://platform.uno/articles/best-cross-platform-frameworks-2026/ (satıcı kaynağı, tarafsız değil)

## Seçilen paketler ve neden
- `flutter_riverpod`: durum yönetimi; etkin, 5 platform.
- `go_router`: yönlendirme; resmî, özellik tamamlanmış.
- `shared_preferences`, `path_provider`: ayarlar ve veri dosyası konumu.
- `flutter_tts`: dinleme alıştırmaları için metin okuma (Android, iOS, Windows, macOS).
- `flutter_local_notifications`: günlük hatırlatma (Windows'ta MSIX paketleme gerekir).
- `drift` ve `sqlite3_flutter_libs` pubspec'te hazır duruyor ama ilk sürümde kullanılmadı: kod üreticisi (`drift_dev`) bu derleme ortamındaki Dart sürümüyle çözümlenemedi. İlk sürümde ilerleme verisi tek bir JSON dosyasında (atomik yazma) tutulur; veri büyüdüğünde Drift'e geçiş planlandı.

## Doğrulama sınırı
Bu ortamda Android/iOS/Windows derleyici yok; `flutter analyze` ve `flutter test` ile doğrulandı. Windows kurulumu (`flutter build windows`) Yusuf'un bilgisayarında ya da bir CI işinde alınacak.
