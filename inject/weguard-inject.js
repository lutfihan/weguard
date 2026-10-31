/*
 * WE Guard - Wallpaper Engine'in Atölye detay panelinde "Abone ol / Yorum yap" düğmelerinin altına
 * güvenlik kutusu, Ayarlar penceresine de "WE Guard" sekmesi ekler.
 *
 * WE'nin kendi dosyalarına dokunmaz: Angular şablonlarını bellekte ($templateCache) değiştirir.
 * Bir şablon beklenen gibi değilse o parça eklenmez, WE normal çalışır.
 * Veriyi yerel WE Guard yardımcısından alır (Steam uç noktaları CORS izni vermiyor).
 *
 * Önemli: WE'nin tarayıcı motoru yerleşik <select> açılır listelerini gösteremiyor (pencere çöküyor);
 * WE de bu yüzden hiçbir yerde <select> ya da <input type=checkbox> kullanmıyor. Ayarlar sekmesi
 * WE'nin kendi <droplist> ve <checkbox> bileşenleriyle kuruludur.
 */
(function () {
  'use strict';

  var HELPER = 'http://127.0.0.1:47321';
  var PENDING_RETRY_MS = 2000;
  var SCAN_POLL_MS = 1500;

  var PATCHES = [
    // Atölye detay paneli: kutu "Abone ol / Yorum yap" düğmelerinin altına taşınır.
    {
      template: 'views/views/browsewallpapers.html',
      anchor: '<div class="detailButtons">',
      replacement: '<div class="detailButtons"><weguard-box></weguard-box>'
    },
    // Ayarlar: sekmelerin sonuna WE Guard sekmesi.
    {
      template: 'views/views/settings.html',
      anchor: '</uib-tabset>',
      replacement: '<uib-tab heading="WE Guard"><weguard-settings></weguard-settings></uib-tab></uib-tabset>'
    }
  ];

  var UI = {
    tr: {
      loading: 'Kontrol ediliyor…',
      offline: 'WE Guard yardımcısı çalışmıyor',
      unknown: 'Bilgi alınamadı',
      ok: 'Güvenli görünüyor',
      warn: 'Şüpheli',
      danger: 'Tehlikeli olabilir',
      language: 'Dil',
      langAuto: "WE'nin dili",
      defender: "İndirilen wallpaper'ları Windows Defender ile tara",
      blocklist: 'Ortak kara liste',
      blocklistInfo: function (b) {
        return b.items + ' wallpaper, ' + b.authors + ' yazar' + (b.updated ? ' · ' + b.updated : '') +
          (b.source === 'bundled' ? ' (uygulamayla gelen liste)' : '');
      },
      refresh: 'Şimdi güncelle',
      scan: "Yüklü wallpaper'lar",
      scanNow: 'Şimdi tara',
      scanRunning: function (p) { return 'Taranıyor: ' + p.done + ' / ' + p.total; },
      scanLast: function (l, date) {
        return date + ' · ' + l.total + ' wallpaper: ' + l.ok + ' güvenli, ' + l.warn + ' şüpheli, ' + l.danger + ' tehlikeli';
      },
      scanNever: 'Henüz tarama yapılmadı',
      helperOffline: 'WE Guard yardımcısı çalışmıyor. WE Guard uygulamasını başlatın.'
    },
    en: {
      loading: 'Checking…',
      offline: 'WE Guard helper is not running',
      unknown: 'No information',
      ok: 'Looks safe',
      warn: 'Suspicious',
      danger: 'May be dangerous',
      language: 'Language',
      langAuto: "Wallpaper Engine's language",
      defender: 'Scan downloaded wallpapers with Windows Defender',
      blocklist: 'Shared blocklist',
      blocklistInfo: function (b) {
        return b.items + ' wallpapers, ' + b.authors + ' authors' + (b.updated ? ' · ' + b.updated : '') +
          (b.source === 'bundled' ? ' (bundled list)' : '');
      },
      refresh: 'Update now',
      scan: 'Installed wallpapers',
      scanNow: 'Scan now',
      scanRunning: function (p) { return 'Scanning: ' + p.done + ' / ' + p.total; },
      scanLast: function (l, date) {
        return date + ' · ' + l.total + ' wallpapers: ' + l.ok + ' safe, ' + l.warn + ' suspicious, ' + l.danger + ' dangerous';
      },
      scanNever: 'No scan yet',
      helperOffline: 'WE Guard helper is not running. Please start the WE Guard app.'
    }
  };

  var ICONS = {
    loading: 'fa-circle-notch fa-spin',
    offline: 'fa-plug',
    unknown: 'fa-question-circle',
    ok: 'fa-shield-alt',
    warn: 'fa-exclamation-triangle',
    danger: 'fa-skull-crossbones'
  };

  // WE'nin ayarlar sayfasıyla aynı yapı ve sınıflar; açılır liste ve onay kutusu WE'nin kendi bileşenleri.
  var SETTINGS_TEMPLATE =
    '<div class="settingsContainer autoScrollY">' +
    ' <div class="groupBox">' +
    '  <div class="heading"><span class="fas fa-shield-alt headerIcon"></span> WE Guard' +
    '   <span class="weguard-version" ng-if="wg.view.version">{{wg.view.version}}</span></div>' +
    '  <div class="infoTable settingsPlaybackTable">' +
    '   <div ng-if="!wg.view"><div class="infoTableLabel">{{wg.L.helperOffline}}</div><div></div></div>' +
    '   <div ng-if="wg.view"><div class="infoTableLabel">{{wg.L.language}}</div>' +
    '    <div><droplist dp-options="wg.langOptions" dp-selected="wg.language" dp-change="setLanguage()"></droplist></div></div>' +
    '   <div ng-if="wg.view"><div class="infoTableLabel">{{wg.L.defender}}</div>' +
    '    <div><checkbox cb-checked="wg.defender" cb-changed="setDefender()"></checkbox></div></div>' +
    '  </div>' +
    ' </div>' +
    ' <div class="groupBox" ng-if="wg.view">' +
    '  <div class="heading"><span class="fas fa-list headerIcon"></span> {{wg.L.blocklist}}</div>' +
    '  <div class="infoTable settingsPlaybackTable">' +
    '   <div><div class="infoTableLabel">{{wg.blocklistText}}' +
    '     <div class="weguard-error" ng-if="wg.error">{{wg.error}}</div></div>' +
    '    <div><button class="btn btn-primary fullWidth" ng-click="refreshBlocklist()" ng-disabled="wg.busy">{{wg.L.refresh}}</button></div></div>' +
    '  </div>' +
    ' </div>' +
    ' <div class="groupBox" ng-if="wg.view">' +
    '  <div class="heading"><span class="fas fa-search headerIcon"></span> {{wg.L.scan}}</div>' +
    '  <div class="infoTable settingsPlaybackTable">' +
    '   <div><div class="infoTableLabel">{{wg.scanText}}</div>' +
    '    <div><button class="btn btn-primary fullWidth" ng-click="scanAll()" ng-disabled="wg.busy || wg.view.scan.running">{{wg.L.scanNow}}</button></div></div>' +
    '  </div>' +
    ' </div>' +
    '</div>';

  if (!window.angular) return;
  var app;
  try {
    app = angular.module('wallpaperbrowserApp');
  } catch (e) {
    return;
  }

  app.run(['$templateCache', function ($templateCache) {
    PATCHES.forEach(function (p) {
      var html = $templateCache.get(p.template);
      if (typeof html !== 'string' || html.split(p.anchor).length !== 2) {
        console.warn('[WEGuard] Şablon beklenen gibi değil, eklenmedi: ' + p.template);
        return;
      }
      $templateCache.put(p.template, html.replace(p.anchor, function () { return p.replacement; }));
    });
  }]);

  // WE dili $rootScope.languageClass içinde tutar, örneğin "langCSStr-tr".
  function weLang($rootScope) {
    return String($rootScope.languageClass || '').replace('langCSS', '') || navigator.language || 'en';
  }

  function uiLang(code) {
    return /^tr/i.test(code) ? 'tr' : 'en';
  }

  function request(method, path, body) {
    return fetch(HELPER + path, {
      method: method,
      headers: body ? { 'Content-Type': 'application/json' } : undefined,
      body: body ? JSON.stringify(body) : undefined
    }).then(function (res) {
      if (!res.ok) throw new Error('HTTP ' + res.status);
      return res.json();
    });
  }

  function esc(s) {
    return String(s).replace(/[&<>"']/g, function (ch) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch];
    });
  }

  app.directive('weguardBox', ['$rootScope', function ($rootScope) {
    return {
      restrict: 'E',
      link: function (scope, element) {
        var el = element[0];
        el.className = 'weguard-box';

        // Kutu .detailButtons'ın içine eklendi; düğmelerin altına taşı.
        var host = el.parentNode;
        if (host && host.parentNode) host.parentNode.insertBefore(el, host.nextSibling);

        var token = 0;
        var retry = null;

        function load(id, lang, mine) {
          request('GET', '/check?id=' + encodeURIComponent(id) + '&lang=' + encodeURIComponent(lang)).then(function (r) {
            if (mine !== token) return;
            renderBox(el, r);
            // Defender taraması sürüyorsa biraz sonra yeniden sor.
            if (r.pending) retry = setTimeout(function () { load(id, lang, mine); }, PENDING_RETRY_MS);
          }, function () {
            if (mine === token) renderBox(el, { state: 'offline', lang: uiLang(lang) });
          });
        }

        function refresh() {
          var mine = ++token;
          clearTimeout(retry);
          var id = scope.currentSelection && scope.currentSelection.workshopid;
          if (!id) {
            el.style.display = 'none';
            return;
          }
          el.style.display = '';
          var lang = weLang($rootScope);
          renderBox(el, { state: 'loading', lang: uiLang(lang) });
          load(id, lang, mine);
        }

        // Abone olunup indirme bitince durum değişir; o zaman dosya taraması da rapora girer.
        scope.$watchGroup([
          'currentSelection.workshopid',
          'currentSelection.status',
          function () { return weLang($rootScope); }
        ], refresh);
        scope.$on('$destroy', function () {
          token++;
          clearTimeout(retry);
        });
      }
    };
  }]);

  function renderBox(el, r) {
    var L = UI[r.lang] || UI.en;
    var html =
      '<div class="weguard-head">' +
      '<span class="fas ' + (ICONS[r.state] || ICONS.unknown) + '" aria-hidden="true"></span> ' +
      '<b>WE Guard</b> · ' + esc(L[r.state] || L.unknown) +
      '</div>';
    (r.reasons || []).slice(0, 5).forEach(function (reason) {
      html += '<div class="weguard-row' + (reason.level ? '' : ' weguard-faint') + '">• ' + esc(reason.text) + '</div>';
    });
    (r.info || []).forEach(function (line) {
      html += '<div class="weguard-row weguard-faint">' + esc(line) + '</div>';
    });
    (r.samples || []).slice(0, 2).forEach(function (s) {
      html += '<div class="weguard-quote">“' + esc(s) + '”</div>';
    });
    el.setAttribute('data-state', r.state);
    el.innerHTML = html;
  }

  app.directive('weguardSettings', ['$rootScope', function ($rootScope) {
    return {
      restrict: 'E',
      scope: {},
      template: SETTINGS_TEMPLATE,
      link: function (scope) {
        var weL = weLang($rootScope);
        var poll = null;
        var wg = scope.wg = { view: null, error: null, busy: false, L: UI[uiLang(weL)] };

        function show(view, error) {
          var L = UI[uiLang(view ? view.lang : weL)] || UI.en;
          wg.L = L;
          wg.view = view;
          wg.error = error || null;
          wg.busy = false;
          if (!view) return;
          // droplist, seçili değer tanımsızken ilk seçeneği seçip değişiklik bildirir; önce değeri ver.
          wg.language = view.settings.language;
          wg.defender = view.settings.defender;
          wg.langOptions = [
            { label: L.langAuto, value: 'auto' },
            { label: 'Türkçe', value: 'tr' },
            { label: 'English', value: 'en' }
          ];
          wg.blocklistText = L.blocklistInfo(view.blocklist);
          var scan = view.scan;
          wg.scanText = scan.running
            ? L.scanRunning(scan.running)
            : scan.last
              ? L.scanLast(scan.last, new Date(scan.last.at).toLocaleString(uiLang(view.lang) === 'tr' ? 'tr-TR' : 'en-US'))
              : L.scanNever;
        }

        function load(method, path, body) {
          var sep = path.indexOf('?') < 0 ? '?' : '&';
          wg.busy = true;
          return request(method, path + sep + 'lang=' + encodeURIComponent(weL), body).then(function (view) {
            scope.$applyAsync(function () { show(view, view.error); });
            clearTimeout(poll);
            if (view.scan.running) poll = setTimeout(function () { load('GET', '/settings'); }, SCAN_POLL_MS);
          }, function () {
            scope.$applyAsync(function () { show(null); });
          });
        }

        scope.setLanguage = function () { load('POST', '/settings', { language: wg.language }); };
        scope.setDefender = function () { load('POST', '/settings', { defender: !!wg.defender }); };
        scope.refreshBlocklist = function () { load('POST', '/blocklist/refresh'); };
        scope.scanAll = function () { load('POST', '/scan-all'); };
        scope.$on('$destroy', function () { clearTimeout(poll); });

        load('GET', '/settings');
      }
    };
  }]);

  var style = document.createElement('style');
  style.textContent =
    '.weguard-box{display:block;margin:8px 0 4px;padding:8px 10px;border-radius:4px;' +
    'background:rgba(255,255,255,.05);border-left:3px solid #8b949e;font-size:12px;' +
    'line-height:1.45;text-align:left;}' +
    '.weguard-box[data-state=ok]{border-left-color:#3fb950}' +
    '.weguard-box[data-state=ok] .weguard-head .fas{color:#3fb950}' +
    '.weguard-box[data-state=warn]{border-left-color:#d29922}' +
    '.weguard-box[data-state=warn] .weguard-head .fas{color:#d29922}' +
    '.weguard-box[data-state=danger]{border-left-color:#f85149;background:rgba(248,81,73,.12)}' +
    '.weguard-box[data-state=danger] .weguard-head .fas{color:#f85149}' +
    '.weguard-head{margin-bottom:2px}' +
    '.weguard-row{opacity:.9}' +
    '.weguard-faint{opacity:.65}' +
    '.weguard-quote{opacity:.75;font-style:italic;margin-top:2px;overflow:hidden;' +
    'text-overflow:ellipsis;white-space:nowrap}' +
    '.weguard-error{color:#f85149;margin-top:4px}' +
    '.weguard-version{opacity:.6;font-weight:normal;margin-left:4px}';
  document.head.appendChild(style);
})();
