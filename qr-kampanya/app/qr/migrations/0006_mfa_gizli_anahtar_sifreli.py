"""MFA (TOTP) gizli anahtarlarını veritabanında şifreler.

Adımlar: (1) anahtar denetimi (yoksa/geçersizse hiçbir şey değiştirilmeden anlaşılır hatayla durur),
(2) sütun genişletilir (varchar(64) -> text; belirteç ~140 karakter), (3) mevcut düz metin anahtarlar Fernet ile
şifrelenir. Veri adımı idempotenttir (şifreli satıra dokunmaz) ve satır silmez. Geri alma: şifreliler çözülür,
sütun varchar(64)'e döner (eski anahtarlar gerekir). Migrasyon tek transaction içindedir.
"""
from django.core.exceptions import ImproperlyConfigured
from django.db import migrations

import qr.alanlar
from qr.sifreleme import SifrelemeHatasi, _fernet, tabloyu_donustur


def anahtari_denetle(apps, schema_editor):
    try:
        _fernet()
    except SifrelemeHatasi as hata:
        raise ImproperlyConfigured(f"MFA migrasyonu durdu, hiçbir kayıt değiştirilmedi. {hata}") from None


def sifrele_ileri(apps, schema_editor):
    tabloyu_donustur(schema_editor.connection, "sifrele")


def coz_geri(apps, schema_editor):
    tabloyu_donustur(schema_editor.connection, "coz")


class Migration(migrations.Migration):
    dependencies = [("qr", "0005_uygulama_rolu_yetkileri")]

    operations = [
        migrations.RunPython(anahtari_denetle, anahtari_denetle),
        migrations.AlterField(
            model_name="mfacihazi",
            name="gizli_anahtar",
            field=qr.alanlar.SifreliMetinAlani(),
        ),
        migrations.RunPython(sifrele_ileri, coz_geri),
    ]
