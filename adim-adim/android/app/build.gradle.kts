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
                // key.properties yoksa yalnızca yerel deneme için hata ayıklama anahtarı kullanılır.
                // Dağıtım derlemesi key.properties olmadan yapılmamalıdır (bkz. docs/IMZA.md).
                logger.warn("UYARI: android/key.properties yok; release derlemesi hata ayıklama anahtarıyla imzalanıyor. Dağıtma!")
                signingConfig = signingConfigs.getByName("debug")
            }
        }
    }
}

flutter {
    source = "../.."
}
