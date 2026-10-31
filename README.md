# WE Guard

Wallpaper Engine'in Atölye'sindeki wallpaper'ları **abone olmadan önce ve indirdikten sonra** güvenlik açısından kontrol eden küçük bir araç. Sonucu doğrudan Wallpaper Engine'in içinde, **"Abone ol / Yorum yap" düğmelerinin altında** gösterir.

> 🛡 **WE Guard** · Güvenli görünüyor
> 2 yıl önce yüklendi · 1.004.345 abone
> Yorumlar: 58 toplam, uyarı yok
> 14 dosya kontrol edildi · Defender: temiz

*English summary below.*

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

WE Guard checks Wallpaper Engine Workshop wallpapers **before you subscribe and after they download**, and shows the result right inside Wallpaper Engine under the "Subscribe / Comment" buttons: comment warnings, suspicious descriptions, item and author age, a shared blocklist, a file scan (unexpected executables, double extensions, disguised programs, encrypted archives) and a Windows Defender scan. Nothing but the wallpaper ID leaves your PC.

Install from [Releases](https://github.com/lutfihan/weguard/releases/latest) (no admin rights needed; the installer is not code-signed yet, so Windows SmartScreen may warn). Uninstalling restores Wallpaper Engine's files byte for byte. [Report a malicious wallpaper](https://github.com/lutfihan/weguard/issues/new?template=zararli-wallpaper.yml).

Not affiliated with Wallpaper Engine or Valve. MIT licensed.
