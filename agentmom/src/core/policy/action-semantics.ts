// Eylem anlamları ve geri alma haritası (madde 94, D5a). Yazan: Claude [İP:AgentMom D5a]; sahip: Yusuf. Yalnız bu dosyayı yazan yapay zeka değiştirir,
// diğerleri öneri sunar. Kurallar: politika motorundaki HER eylemin (ACTION_TYPES) ve uygulamanın kullanıcıya onaylattığı/kaydettiği eylemlerin kaydı burada
// olmalıdır (test zorlar). Tablo yalnız bilgidir: hiçbir kararı değiştirmez, model yok, ağ yok. Metinler kullanıcıya gösterilir (Türkçe).
import { ACTION_TYPES } from "./types.ts";
import type { ActionType } from "./types.ts";

export type Reversibility = "yes" | "partial" | "no";
export type Sensitivity = "low" | "medium" | "high";

export interface ActionSemantics {
  action: string;
  effect: string;
  reversible: Reversibility;
  undo: string;
  sensitivity: Sensitivity;
}

// Uygulamanın kullanıcıya onaylattığı ya da denetim kaydına yazdığı, politika motoru dışındaki eylemler. Yeni bir kullanıcı eylemi eklenirse buraya da eklenir.
export const USER_ACTIONS = [
  "file.recycle",
  "provider.disable",
  "provider.enable",
  "provider.test",
  "backup.create",
  "subsession.create",
  "subsession.rename",
  "subsession.pin",
  "subsession.archive",
  "task.approve",
  "task.deny",
  "task.contract",
  "workflow.created",
  "memory.add",
  "memory.export",
] as const;

export type UserAction = (typeof USER_ACTIONS)[number];

const IRREVERSIBLE = "geri alınamaz";

const TABLE: Record<ActionType | UserAction, Omit<ActionSemantics, "action">> = {
  "file.read": { effect: "İzinli klasördeki bir dosyayı okur; hiçbir şeyi değiştirmez.", reversible: "yes", undo: "Geri almak gerekmez: okuma bir şeyi değiştirmez.", sensitivity: "low" },
  "file.write": {
    effect: "İzinli klasörde (yalıtılmış çalışma ağacında) dosya yazar ya da değiştirir.",
    reversible: "partial",
    undo: "Çalışma ağacındaki değişiklik git ile geri alınır (git checkout/restore); ağaç dışına yazılan dosyanın önceki hali yedekten döner.",
    sensitivity: "medium",
  },
  "shell.exec": {
    effect: "Ajan için kabuk komutu çalıştırır; komutun yaptığı her şey (dosya, süreç, ağ) olabilir.",
    reversible: "no",
    undo: `${IRREVERSIBLE}: komutun etkisi genel olarak geri alınamaz; yalnız yedekten ya da git geçmişinden kısmen dönülebilir.`,
    sensitivity: "high",
  },
  "verification.run": {
    effect: "Görevin doğrulama testlerini ayrı bir işçi sürecinde çalıştırır ve sonucu kaydeder.",
    reversible: "partial",
    undo: "İşçi aynı kullanıcıyla bir süreç olarak çalışır (işletim sistemi düzeyinde yalıtım yok); çalışma ağacındaki değişiklikler git ile geri alınır, dışarıya yapılan etkiler geri alınamayabilir.",
    sensitivity: "medium",
  },
  "network.request": {
    effect: "Dış ağa istek gönderir; veri makineden çıkabilir.",
    reversible: "no",
    undo: `${IRREVERSIBLE}: gönderilen veri geri çağrılamaz.`,
    sensitivity: "high",
  },
  "provider.call": {
    effect: "Seçili sağlayıcıyı (model aracı) görev için çalıştırır; ücretli rotada harcama olur.",
    reversible: "partial",
    undo: "Sağlayıcının çalışma ağacındaki değişiklikleri git ile geri alınır; yapılan harcama ve sağlayıcıya giden veri geri alınamaz.",
    sensitivity: "medium",
  },
  "provider.switch": {
    effect: "Görevi başka bir sağlayıcıya (rota) geçirir.",
    reversible: "partial",
    undo: "Önceki sağlayıcıya yeniden geçilir; geçişte yapılan harcama geri alınamaz.",
    sensitivity: "medium",
  },
  "task.create": { effect: "Yeni bir görev kaydı oluşturur; tek başına hiçbir şey çalıştırmaz.", reversible: "yes", undo: "Görev reddedilir ya da iptal edilir; kayıt silinmez, geçmişte kalır.", sensitivity: "low" },
  "policy.grant": {
    effect: "İzinleri ya da özerklik sözleşmesini değiştirir (ajanın yapabileceklerini genişletir).",
    reversible: "partial",
    undo: "İzin yeni bir kullanıcı kararıyla geri çekilir; izin açıkken yapılmış eylemler geri alınmaz.",
    sensitivity: "high",
  },
  "file.recycle": {
    effect: "Dosyayı Geri Dönüşüm Kutusu'na taşır (kalıcı silme değildir).",
    reversible: "yes",
    undo: "Geri Dönüşüm Kutusu'ndan 'Geri yükle' ile eski yerine döner (kutu boşaltılmadıkça).",
    sensitivity: "medium",
  },
  "provider.disable": {
    effect: "Sağlayıcıyı kapatır; kapalı sağlayıcı hiç kullanılmaz, yerine başka sağlayıcıya geçilmez.",
    reversible: "yes",
    undo: "Aynı sağlayıcı 'Aç' (provider.enable) ile yeniden açılır.",
    sensitivity: "medium",
  },
  "provider.enable": { effect: "Kapalı bir sağlayıcıyı yeniden açar.", reversible: "yes", undo: "Sağlayıcı 'Kapat' (provider.disable) ile yeniden kapatılır.", sensitivity: "medium" },
  "provider.test": {
    effect: "Sağlayıcının yerel bağlantı testini (sürüm/oturum komutu) çalıştırır; model çağrısı yok.",
    reversible: "yes",
    undo: "Geri almak gerekmez: yalnız test sonucu kaydedilir.",
    sensitivity: "low",
  },
  "backup.create": {
    effect: "Veritabanının ve yapılandırmanın doğrulanmış yedeğini yeni bir klasöre yazar.",
    reversible: "yes",
    undo: "Gerekirse yedek klasörü Yusuf'un kararıyla Geri Dönüşüm Kutusu'na taşınır; canlı veriye dokunmaz.",
    sensitivity: "low",
  },
  "subsession.create": { effect: "Yeni bir alt oturum kaydı açar.", reversible: "yes", undo: "Alt oturum arşivlenir (silinmez).", sensitivity: "low" },
  "subsession.rename": { effect: "Alt oturumun adını değiştirir; eski ad geçmişte kalır.", reversible: "yes", undo: "Eski ad, ad geçmişinden okunup yeniden verilir.", sensitivity: "low" },
  "subsession.pin": { effect: "Alt oturumu sabitler ya da sabitlemeyi kaldırır.", reversible: "yes", undo: "Sabitleme tersine çevrilir.", sensitivity: "low" },
  "subsession.archive": { effect: "Alt oturumu arşivler ya da arşivden çıkarır (silme değildir).", reversible: "yes", undo: "Arşivden çıkarılır.", sensitivity: "low" },
  "task.approve": {
    effect: "Bekleyen görevi onaylar; görev çalıştırılabilir hale gelir.",
    reversible: "partial",
    undo: "Çalışmadan önce görev iptal edilebilir; başladıktan sonra yapılanlar ilgili eylemin geri alma yoluyla döner.",
    sensitivity: "medium",
  },
  "task.deny": { effect: "Bekleyen görevi reddeder.", reversible: "no", undo: `${IRREVERSIBLE}: reddedilen görev yeniden açılmaz; aynı iş yeni bir görevle istenir.`, sensitivity: "low" },
  "task.contract": { effect: "Görevin kabul ölçütlerini ve yazma kapsamını kaydeder.", reversible: "yes", undo: "Sözleşme yeni değerlerle yeniden kaydedilir.", sensitivity: "low" },
  "workflow.created": {
    effect: "Görev için iş akışını (plan/uygulama/inceleme/doğrulama adımları) başlatır.",
    reversible: "partial",
    undo: "İş akışı yalıtılmış çalışma ağacında çalışır; değişiklikler git ile geri alınır, sağlayıcı harcaması geri alınamaz.",
    sensitivity: "medium",
  },
  "memory.add": { effect: "Operasyonel hafızaya bir kayıt ekler.", reversible: "yes", undo: "Kayıt yeni bir kayıtla geçersiz kılınır (supersede); silinmez.", sensitivity: "low" },
  "memory.export": {
    effect: "Seçili hafıza kayıtlarını izinli bir klasöre dosya olarak yazar.",
    reversible: "partial",
    undo: "Yazılan dosyalar Yusuf'un kararıyla Geri Dönüşüm Kutusu'na taşınır; aynı adlı dosyanın önceki hali yedekten döner.",
    sensitivity: "medium",
  },
};

export const ACTION_SEMANTICS: readonly ActionSemantics[] = Object.freeze(
  (Object.keys(TABLE) as Array<keyof typeof TABLE>).map((action) => Object.freeze({ action, ...TABLE[action] })),
);

// Bilinmeyen eylem için kayıt YOK (null): uydurma anlam üretilmez.
export function semanticsFor(action: string): ActionSemantics | null {
  return ACTION_SEMANTICS.find((s) => s.action === action) ?? null;
}

// Tablonun kapsaması gereken eylemler (test bunu zorlar).
export const REQUIRED_ACTIONS: readonly string[] = [...ACTION_TYPES, ...USER_ACTIONS];
