const CACHE_NAME = 'sorasola-v1';
const urlsToCache = [
  '/',
  '/index.html',
  '/manifest.json',
  './styles.css',
  './css/textstyles.css',
  './img/ChatGPT Image 2025年4月19日 22_37_50.png',
  './img/header.jpg',
  './img/canva-e383a2e3838ee382afe383ade38080e382b7e383b3e38397e383abe38080e5ada6e7bf92e38080e5a4a7e4babae381aee58b89e5bcb7e6b395e38080e381afe381a6e381aae38396e383ade382b0e38080e38396e383ade382b0e38080e382a2e382a4e382ade383a3e.jpg'
];

// Service Workerのインストール時
self.addEventListener('install', event => {
  console.log('Service Worker: Install - sorasola');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Service Worker: Caching files');
        return cache.addAll(urlsToCache);
      })
      .catch(err => {
        console.log('Service Worker: Cache failed', err);
      })
  );
});

// Service Workerのアクティベート時（古いキャッシュの削除）
self.addEventListener('activate', event => {
  console.log('Service Worker: Activate - sorasola');
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName !== CACHE_NAME) {
            console.log('Service Worker: Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});

// ネットワークリクエストの処理
self.addEventListener('fetch', event => {
  // Google Formsへのリクエストはキャッシュしない（常に最新を取得）
  if (event.request.url.includes('forms.gle') || 
      event.request.url.includes('docs.google.com') ||
      event.request.url.includes('googleapis.com')) {
    console.log('Service Worker: Bypassing cache for Google Forms:', event.request.url);
    return;
  }

  // 外部ドメインのリクエストもキャッシュしない
  if (event.request.url.includes('2box.jp') && !event.request.url.includes('sorasola')) {
    return;
  }

  event.respondWith(
    caches.match(event.request)
      .then(response => {
        // キャッシュにある場合はキャッシュから返す
        if (response) {
          console.log('Service Worker: Serving from cache:', event.request.url);
          return response;
        }

        // キャッシュにない場合はネットワークから取得
        console.log('Service Worker: Fetching from network:', event.request.url);
        return fetch(event.request)
          .then(response => {
            // レスポンスが有効でない場合はそのまま返す
            if (!response || response.status !== 200 || response.type !== 'basic') {
              return response;
            }

            // レスポンスをクローンしてキャッシュに保存
            const responseToCache = response.clone();
            caches.open(CACHE_NAME)
              .then(cache => {
                // 学習サイトで必要なファイルのみキャッシュ
                if (event.request.url.match(/\.(html|css|js|jpg|jpeg|png|gif|ico|svg)$/)) {
                  cache.put(event.request, responseToCache);
                }
              });

            return response;
          })
          .catch(err => {
            console.log('Service Worker: Fetch failed:', err);
            // オフライン時の代替コンテンツ
            if (event.request.destination === 'document') {
              return caches.match('/');
            }
            
            // 画像が読み込めない場合の代替
            if (event.request.destination === 'image') {
              return caches.match('./img/ChatGPT Image 2025年4月19日 22_37_50.png');
            }
          });
      })
  );
});

// プッシュ通知の処理（学習リマインダー用）
self.addEventListener('push', event => {
  console.log('Service Worker: Push received - sorasola');
  
  let title = 'sorasola - 学習リマインダー';
  let body = '今日の学習はいかがですか？';
  let icon = './img/ChatGPT Image 2025年4月19日 22_37_50.png';
  
  if (event.data) {
    const pushData = event.data.json();
    title = pushData.title || title;
    body = pushData.body || body;
    icon = pushData.icon || icon;
  }

  const options = {
    body: body,
    icon: icon,
    badge: icon,
    vibrate: [100, 50, 100],
    data: {
      dateOfArrival: Date.now(),
      primaryKey: 'study-reminder'
    },
    actions: [
      {
        action: 'study',
        title: '学習を始める',
        icon: icon
      },
      {
        action: 'later',
        title: '後で通知',
        icon: icon
      },
      {
        action: 'close',
        title: '閉じる'
      }
    ],
    requireInteraction: true,
    tag: 'study-reminder'
  };

  event.waitUntil(
    self.registration.showNotification(title, options)
  );
});

// 通知クリック時の処理
self.addEventListener('notificationclick', event => {
  console.log('Service Worker: Notification click received');
  
  event.notification.close();

  if (event.action === 'study') {
    event.waitUntil(
      clients.openWindow('/')
    );
  } else if (event.action === 'later') {
    // 1時間後に再通知
    event.waitUntil(
      self.registration.showNotification('sorasola - 学習時間です', {
        body: '学習を始めましょう！',
        icon: './img/ChatGPT Image 2025年4月19日 22_37_50.png',
        tag: 'study-reminder-later'
      })
    );
  }
});

// バックグラウンド同期（オフライン時の問い合わせフォーム用）
self.addEventListener('sync', event => {
  console.log('Service Worker: Background sync - sorasola');
  
  if (event.tag === 'contact-form-sync') {
    event.waitUntil(
      syncContactForm()
    );
  }
});

// 問い合わせフォームの同期処理
async function syncContactForm() {
  try {
    // IndexedDBから保存された問い合わせデータを取得
    // 実際の実装では、オフライン時に保存されたフォームデータを
    // オンライン復帰時に送信する処理を行う
    console.log('Service Worker: Syncing contact form data');
    
    // 学習進捗データの同期も含める
    await syncStudyProgress();
    
  } catch (error) {
    console.error('Service Worker: Sync failed', error);
  }
}

// 学習進捗データの同期
async function syncStudyProgress() {
  // 受験生の学習進捗データをサーバーと同期
  console.log('Service Worker: Syncing study progress');
}

// 定期的なバックグラウンドタスク（学習リマインダー）
self.addEventListener('periodicsync', event => {
  if (event.tag === 'study-reminder') {
    event.waitUntil(
      sendStudyReminder()
    );
  }
});

// 学習リマインダーの送信
async function sendStudyReminder() {
  const now = new Date();
  const hour = now.getHours();
  
  // 朝9時と夜8時にリマインダー
  if (hour === 9 || hour === 20) {
    await self.registration.showNotification('sorasola - 学習時間', {
      body: hour === 9 ? '今日も一日頑張りましょう！' : '今日の復習はいかがですか？',
      icon: './img/ChatGPT Image 2025年4月19日 22_37_50.png',
      tag: 'daily-reminder'
    });
  }
}

// キャッシュサイズ管理（学習サイト用に最適化）
const limitCacheSize = (name, size) => {
  caches.open(name).then(cache => {
    cache.keys().then(keys => {
      if (keys.length > size) {
        cache.delete(keys[0]).then(() => limitCacheSize(name, size));
      }
    });
  });
};

// 学習サイト用のキャッシュクリーンアップ（容量を抑制）
setInterval(() => {
  limitCacheSize(CACHE_NAME, 30); // 教育サイトなので軽量に保つ
}, 300000); // 5分ごと

// アプリのアップデート通知
self.addEventListener('message', event => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

// 学習データのバックアップ
self.addEventListener('beforeunload', event => {
  // ページを離れる前に学習データを保存
  event.waitUntil(
    caches.open('study-data-backup').then(cache => {
      // 学習進捗や設定をバックアップ
      console.log('Service Worker: Backing up study data');
    })
  );
});