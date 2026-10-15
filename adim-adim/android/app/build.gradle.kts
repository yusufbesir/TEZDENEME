import java.util.Properties
import java.io.FileInputStream

plugins {
    id("com.android.application")
    id("kotlin-android")
    // The Flutter Gradle Plugin must be applied after the Android and Kotlin Gradle plugins.
    id("dev.flutter.flutter-gradle-plugin")
}

// Yayın imzası: android/key.properties dosyası depoya girmez (.gitignore).
// Anahtar deposu (*.jks) ve şifreler yalnızca geliştiricinin cihazında durur.
val anahtarOzellikleri = Properties()
val anahtarDosyasi = rootProject.file("key.properties")
val yayinImzasiVar = anahtarDosyasi.exists()
if (yayinImzasiVar) {
    FileInputStream(anahtarDosyasi).use { anahtarOzellikleri.load(it) }
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
            "Release derlemesi için android/key.properties gerekli; hata ayıklama anahtarıyla " +
                "dağıtım yapılmaz. Yalnız yerel deneme için -Pdagitim=false verin. Bkz. docs/IMZA.md"
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
                logger.warn("UYARI: android/key.properties yok; release derlemesi hata ayıklama anahtarıyla imzalanır. Dağıtma!")
                signingConfig = signingConfigs.getByName("debug")
            }
        }
    }
}

flutter {
    source = "../.."
}
