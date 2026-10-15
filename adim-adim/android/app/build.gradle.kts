import java.util.Properties
import java.io.FileInputStream

plugins {
    id("com.android.application")
    id("kotlin-android")
    // The Flutter Gradle Plugin must be applied after the Android and Kotlin Gradle plugins.
    id("dev.flutter.flutter-gradle-plugin")
}

// Yayın imzası: key.properties düz metin şifre içerir, bu yüzden YALNIZ kullanıcının
// erişebildiği <kullanıcı profili>/.anahtar/key.properties dosyasından okunur.
// Proje içinde (android/key.properties) geri dönüş yolu bilerek YOKTUR: proje ağacını
// başka hesaplar okuyabilir. Anahtar deposu (*.jks) da aynı .anahtar klasöründedir.
// Şifreler hiçbir log satırına yazılmaz; yalnız dosyanın yolu kaydedilir.
val anahtarOzellikleri = Properties()
val anahtarDosyasi = file(System.getProperty("user.home")).resolve(".anahtar").resolve("key.properties")
val yayinImzasiVar = anahtarDosyasi.isFile
if (yayinImzasiVar) {
    FileInputStream(anahtarDosyasi).use { anahtarOzellikleri.load(it) }
    logger.lifecycle("Yayın imzası: ${anahtarDosyasi.absolutePath} kullanılıyor")
}

// Dağıtım koruması: android/gradle.properties içinde `dagitim=true` VARSAYILANDIR.
// Bir release görevi (assembleRelease, bundleRelease...) çalışacaksa ve key.properties
// yoksa derleme DURUR; hata ayıklama anahtarıyla dağıtım sessizce üretilmez.
// Yalnız yerel deneme için bilinçli kapatma: `flutter build apk --release` yerine
// `cd android && gradlew -Pdagitim=false assembleRelease`. Debug derlemeleri etkilenmez.
val dagitimKorumasi = (project.findProperty("dagitim") as String?)?.toBoolean() ?: true
gradle.taskGraph.whenReady {
    val releaseGorevi = allTasks.any { it.project == project && it.name.contains("Release") }
    if (releaseGorevi && dagitimKorumasi && !yayinImzasiVar) {
        throw GradleException(
            "Release derlemesi için key.properties gerekli (%USERPROFILE%\\.anahtar\\key.properties); " +
                "hata ayıklama anahtarıyla dağıtım yapılmaz. Yalnız yerel deneme için -Pdagitim=false verin. Bkz. docs/IMZA.md"
        )
    }
}

android {
    namespace = "tr.adimadim.adim_adim"
    compileSdk = flutter.compileSdkVersion
    ndkVersion = flutter.ndkVersion

    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_11
        targetCompatibility = JavaVersion.VERSION_11
    }

    kotlinOptions {
        jvmTarget = JavaVersion.VERSION_11.toString()
    }

    defaultConfig {
        // TODO: Specify your own unique Application ID (https://developer.android.com/studio/build/application-id.html).
        applicationId = "tr.adimadim.adim_adim"
        // You can update the following values to match your application needs.
        // For more information, see: https://flutter.dev/to/review-gradle-config.
        minSdk = flutter.minSdkVersion
        targetSdk = flutter.targetSdkVersion
        versionCode = flutter.versionCode
        versionName = flutter.versionName
    }

    signingConfigs {
        if (yayinImzasiVar) {
            create("yayin") {
                keyAlias = anahtarOzellikleri["keyAlias"] as String
                keyPassword = anahtarOzellikleri["keyPassword"] as String
                storeFile = file(anahtarOzellikleri["storeFile"] as String)
                storePassword = anahtarOzellikleri["storePassword"] as String
            }
        }
    }

    buildTypes {
        release {
            if (yayinImzasiVar) {
                signingConfig = signingConfigs.getByName("yayin")
            } else {
                // key.properties yoksa yalnız -Pdagitim=false ile (yerel deneme) buraya düşülür;
                // aksi halde yukarıdaki taskGraph denetimi release görevini durdurur.
                logger.warn("UYARI: key.properties bulunamadı; release derlemesi hata ayıklama anahtarıyla imzalanır. Dağıtma!")
                signingConfig = signingConfigs.getByName("debug")
            }
        }
    }
}

flutter {
    source = "../.."
}
