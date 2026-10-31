# WE Guard

Wallpaper Engine'in Atölye'sindeki wallpaper'ları **abone olmadan önce ve indirdikten sonra** güvenlik açısından kontrol eden küçük bir araç. Sonucu doğrudan Wallpaper Engine'in içinde, **"Abone ol / Yorum yap" düğmelerinin altında** gösterir.

> 🛡 **WE Guard** · Güvenli görünüyor
> 2 yıl önce yüklendi · 1.004.345 abone
> Yorumlar: 58 toplam, uyarı yok
> 14 dosya kontrol edildi · Defender: temiz

*[English version below ↓](#english)*

## Neden?

2025 sonundan beri Steam Atölye'sine zararlı Wallpaper Engine wallpaper'ları yüklendiği bildirildi (Kaspersky). Bunlar arasında Steam hesabı çalan ve arka kapı açan yazılımlar vardı. Wallpaper Engine 2.8.42 en riskli "uygulama" türünü Atölye'den kaldırdı, ama eski indirilmiş wallpaper'lar diskte kalabiliyor ve diğer türlerde de şüpheli içerik olabiliyor.

## Ne kontrol eder?

**Abone olmadan önce (Steam bilgileri):**
- Yorumlarda virüs, trojan, madenci, hesap çalma uyarıları (Türkçe, İngilizce, Rusça, Çince)
- Açıklamada şifreli arşiv, çalıştırılabilir dosya, antivirüsü kapatma isteği
- Wallpaper'ın yaşı, abone sayısı ve yazar hesabının yaşı (tek başına uyarı değil; başka bir bulguyla birleşince riski yükseltir)
- Valve tarafından yasaklanmış ya da kaldırılmış öğeler
- **Ortak kara liste:** bu depodaki [`blocklist/blocklist.json`](blocklist/blocklist.json)

**İndirdikten sonra (bilgisayarda, dosyalar hiçbir yere gönderilmez):**
- Türüne uymayan dosyalar: video wallpaper'da `.exe`, `.dll`, script
- `video.mp4.exe` gibi çift uzantılar, medya gibi görünen programlar
- Arşivler ve şifreli arşivler
- **Windows Defender** taraması

İlk kurulumda yüklü tüm wallpaper'lar taranır; sonradan inen her yeni wallpaper da otomatik taranır ve şüpheliyse Windows bildirimi gelir. Wallpaper Engine'in **Ayarlar → WE Guard** sekmesinden dil, Defender taraması, kara liste ve tarama yönetilir. Kutu Wallpaper Engine'in dilinde (Türkçe ya da İngilizce) yazar.

## Kurulum

1. [Releases](https://github.com/lutfihan/weguard/releases/latest) sayfasından `WE-Guard-Setup-x.y.z.exe` dosyasını indir ve çalıştır. Yönetici izni gerekmez.
2. Wallpaper Engine penceresini kapatıp yeniden aç; kutu görünür.

Kurulum dosyası şimdilik dijital olarak imzalı değil. Windows "Windows bilgisayarınızı korudu" derse **Ek bilgi → Yine de çalıştır** ile devam edebilirsin.

WE Guard Windows açılışında arka planda başlar (sistem tepsisinde kalkan simgesi).

**Güncelleme:** 0.2.0 ve sonrası kendini günceller. Birkaç saatte bir bu deponun son sürümüne bakar, yenisini indirip SHA-512 özetini doğrular, sessizce kurar ve yeniden başlar. Kayıt: `%LOCALAPPDATA%\WEGuard\update.log`. 0.1.0 kullanıyorsan son sürümü bir kereliğine elle kur.

## Wallpaper Engine'e ne yapar? Nasıl geri alınır?

WE Guard, Wallpaper Engine'in arayüz dosyası `ui\dist\index.html`'e tek bir satır ekler ve yanına `weguard-inject.js` betiğini koyar. Wallpaper Engine'in kendi kodunu değiştirmez; kutu, arayüz şablonuna bellekte eklenir. Orijinal dosya önce `%LOCALAPPDATA%\WEGuard\backup` altına yedeklenir. Wallpaper Engine güncellenip ekleme silinirse WE Guard onu kendiliğinden yeniden ekler.

**Kaldırmak için:** Windows Ayarlar → Uygulamalar → WE Guard → Kaldır. Wallpaper Engine yedekten birebir eski haline döner, açılış kaydı ve WE Guard verileri silinir. Steam'de Wallpaper Engine → Özellikler → Yüklü Dosyalar → "Oyun dosyalarının bütünlüğünü doğrula" da dosyaları orijinaline döndürür.

## Gizlilik

- Steam'e yalnızca kontrol edilen wallpaper'ın numarası gönderilir (Steam'in herkese açık uç noktaları).
- Dosya taraması ve Defender tamamen bilgisayarında çalışır; dosyalar hiçbir yere yüklenmez.
- Kara liste bu depodan indirilir. Başka hiçbir veri toplanmaz ya da gönderilmez.
- WE Guard'ın yerel yardımcısı yalnızca `127.0.0.1` üzerinde dinler ve yalnızca Wallpaper Engine arayüzünden gelen istekleri kabul eder.

## Zararlı wallpaper bildir

Zararlı olduğundan emin olduğun bir wallpaper için [bildirim aç](https://github.com/lutfihan/weguard/issues/new?template=zararli-wallpaper.yml). Doğrulanan bildirimler kara listeye eklenir ve tüm kullanıcılara birkaç saat içinde ulaşır.

## Sınırlar

Hiçbir araç bir wallpaper'ın %100 güvenli olduğunu garanti edemez. "Güvenli görünüyor", bilinen işaretlerin bulunmadığı anlamına gelir. Yorumlar wallpaper sahibi tarafından silinebilir; bu yüzden asıl karar dosya taramasından gelir.

WE Guard bağımsız bir projedir; Wallpaper Engine'in geliştiricileri ya da Valve/Steam ile resmî bir bağlantısı yoktur.

## Geliştirme

```bash
npm install
npm start          # uygulamayı geliştirme modunda çalıştırır
npm run dist       # dist\WE-Guard-Setup-x.y.z.exe üretir
```

Yeni sürüm yayınlamak için `package.json`'daki `version`'ı artır, `npm run dist` çalıştır ve üç dosyayı birlikte yükle:

```bash
gh release create vX.Y.Z dist/WE-Guard-Setup-X.Y.Z.exe dist/WE-Guard-Setup-X.Y.Z.exe.blockmap dist/latest.yml --title "WE Guard X.Y.Z"
```

`latest.yml` olmadan kurulu uygulamalar yeni sürümü göremez; `.blockmap` sayesinde yalnızca değişen kısım indirilir. Proje klasörünün yolu çok uzunsa (260 karakteri aşarsa) NSIS derlemesi başarısız olur; projeyi kısa bir yola kopyalayıp orada derle.

Kara liste biçimi:

```json
{
  "updated": "2026-10-18",
  "items":   [{ "id": "1234567890", "reason": "Kaynak ve açıklama" }],
  "authors": [{ "steamid": "7656119xxxxxxxxxx", "reason": "Kaynak ve açıklama" }]
}
```

---

## English

WE Guard is a small tool that checks Wallpaper Engine Workshop wallpapers for security risks **before you subscribe and after they download**. It shows the result right inside Wallpaper Engine, **under the "Subscribe / Comment" buttons**.

> 🛡 **WE Guard** · Looks safe
> Uploaded 2 years ago · 1,004,345 subscribers
> Comments: 58 total, no warnings
> 14 files checked · Defender: clean

### Why?

Since late 2025, malicious Wallpaper Engine wallpapers have been reported on the Steam Workshop (Kaspersky), including malware that steals Steam accounts and opens backdoors. Wallpaper Engine 2.8.42 removed the riskiest type, "application" wallpapers, from the Workshop. But wallpapers you downloaded earlier can still be sitting on your disk, and other wallpaper types can still contain suspicious content.

### What does it check?

**Before you subscribe (Steam information):**
- Comments warning about viruses, trojans, miners or stolen accounts (in English, Turkish, Russian and Chinese)
- Descriptions that hand out an archive password, mention executable files or ask you to disable your antivirus
- The wallpaper's age, its subscriber count and the age of the author's account. None of these is a warning on its own, but combined with another finding they raise the risk level.
- Items banned or removed by Valve
- **Shared blocklist:** [`blocklist/blocklist.json`](blocklist/blocklist.json) in this repository

**After it downloads (on your PC; no files are uploaded anywhere):**
- Files that don't belong to the wallpaper type, such as `.exe`, `.dll` or scripts in a video wallpaper
- Double extensions like `video.mp4.exe`, and programs disguised as media files
- Archives and encrypted archives
- A **Windows Defender** scan

On first install, WE Guard scans every wallpaper you already have. Each new wallpaper is scanned automatically when it finishes downloading, and you get a Windows notification if it looks suspicious.

You can manage the language, the Defender scan, the blocklist and full scans from Wallpaper Engine's **Settings → WE Guard** tab. The box follows Wallpaper Engine's language (English or Turkish).

What the results mean:
- **Looks safe:** no known warning signs were found.
- **Suspicious:** something worth a closer look, for example comments mentioning a virus, or an archive inside the wallpaper folder.
- **May be dangerous:** a strong sign such as a hidden program, a Defender detection, a blocklist entry, or a suspicious finding on a brand-new, little-known wallpaper.

### Installation

1. Download `WE-Guard-Setup-x.y.z.exe` from the [Releases](https://github.com/lutfihan/weguard/releases/latest) page and run it. No admin rights are needed.
2. Close and reopen the Wallpaper Engine window, and the box will appear.

The installer is not digitally signed yet. If Windows shows "Windows protected your PC", click **More info → Run anyway**.

WE Guard starts in the background when Windows starts (look for the shield icon in the system tray).

**Updates:** Version 0.2.0 and later update themselves. Every few hours WE Guard checks this repository for a new release. When it finds one, it downloads only the changed parts, verifies the SHA-512 checksum, installs it silently and restarts. The update log is at `%LOCALAPPDATA%\WEGuard\update.log`. If you're on 0.1.0, install the latest release manually once.

### What does it change in Wallpaper Engine? How do I undo it?

WE Guard adds a single line to Wallpaper Engine's interface file `ui\dist\index.html` and puts its `weguard-inject.js` script next to it. It doesn't modify Wallpaper Engine's own code; the box is added to the interface template in memory. The original file is first backed up to `%LOCALAPPDATA%\WEGuard\backup`. If a Wallpaper Engine update removes the line, WE Guard adds it back automatically.

**To uninstall:** Windows Settings → Apps → Installed apps → WE Guard → Uninstall. Wallpaper Engine is restored byte for byte from the backup, and the startup entry and WE Guard's data are deleted. Alternatively, in Steam go to Wallpaper Engine → Properties → Installed Files → "Verify integrity of game files", which also restores the original files.

### Privacy

- Only the ID of the wallpaper being checked is sent to Steam, using Steam's public endpoints.
- File scanning and Defender run entirely on your PC. No files are uploaded anywhere.
- The blocklist is downloaded from this repository. No other data is collected or sent.
- WE Guard's local helper listens only on `127.0.0.1` and accepts requests only from Wallpaper Engine's interface.

### Report a malicious wallpaper

If you're sure a wallpaper is malicious, [open a report](https://github.com/lutfihan/weguard/issues/new?template=zararli-wallpaper.yml). The form is bilingual (Turkish/English). Confirmed reports are added to the blocklist and reach every user within a few hours.

### Limitations

No tool can guarantee that a wallpaper is 100% safe. "Looks safe" means that no known warning signs were found. Wallpaper owners can delete comments on their own items, so the most reliable verdict comes from the file scan.

WE Guard is an independent project and is not affiliated with Wallpaper Engine's developers or with Valve/Steam.

### Development

```bash
npm install
npm start          # run the app in development mode
npm run dist       # build dist\WE-Guard-Setup-x.y.z.exe
```

To publish a new release, bump `version` in `package.json`, run `npm run dist` and upload all three files together:

```bash
gh release create vX.Y.Z dist/WE-Guard-Setup-X.Y.Z.exe dist/WE-Guard-Setup-X.Y.Z.exe.blockmap dist/latest.yml --title "WE Guard X.Y.Z"
```

Without `latest.yml`, installed copies can't see the new release; the `.blockmap` lets them download only the changed parts. If the project folder's path is too long (over 260 characters), the NSIS build fails; copy the project to a shorter path and build there.

Blocklist format:

```json
{
  "updated": "2026-10-18",
  "items":   [{ "id": "1234567890", "reason": "Source and description" }],
  "authors": [{ "steamid": "7656119xxxxxxxxxx", "reason": "Source and description" }]
}
```

Licensed under MIT.
