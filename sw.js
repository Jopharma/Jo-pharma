/* Jo Pharma service worker: يعرض إشعار الجرعة حتى لو الموقع مسكّر */
const DB = 'jp-sw', ST = 'kv';
const idb = () => new Promise((res, rej) => { const r = indexedDB.open(DB, 1); r.onupgradeneeded = () => r.result.createObjectStore(ST); r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error); });
const idbGet = async k => { const d = await idb(); return new Promise(res => { const q = d.transaction(ST).objectStore(ST).get(k); q.onsuccess = () => res(q.result); q.onerror = () => res(undefined); }); };
const idbSet = async (k, v) => { const d = await idb(); return new Promise(res => { const t = d.transaction(ST, 'readwrite'); t.objectStore(ST).put(v, k); t.oncomplete = () => res(); t.onerror = () => res(); }); };

self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', e => e.waitUntil(self.clients.claim()));

self.addEventListener('message', e => {
  const d = e.data;
  if (d && d.type === 'slots') e.waitUntil(Promise.all([idbSet('slots', d.slots || []), idbSet('lang', d.lang || 'ar')]));
});

self.addEventListener('push', e => e.waitUntil((async () => {
  const slots = (await idbGet('slots')) || [], lang = (await idbGet('lang')) || 'ar';
  const shown = (await idbGet('shown')) || {}, now = Date.now();
  const due = slots.filter(s => s.at <= now + 90e3 && now - s.at <= 40 * 60e3 && !shown[s.at + '|' + s.name]);
  due.forEach(s => { shown[s.at + '|' + s.name] = now; });
  Object.keys(shown).forEach(k => { if (now - shown[k] > 86400e3) delete shown[k]; });
  await idbSet('shown', shown);
  const ar = lang !== 'en';
  const title = ar ? '💊 حان موعد جرعتك' : '💊 Time for your dose';
  const body = due.length
    ? due.map(s => s.name + (s.dose ? ' — ' + s.dose : '')).join(ar ? '، ' : ', ')
    : (ar ? 'افتح المنبّهات لمعرفة دواء هذا الوقت.' : 'Open reminders to see this dose.');
  await self.registration.showNotification(title, {
    body, tag: 'jp-dose', renotify: true, requireInteraction: true,
    icon: '/apple-touch-icon.png', badge: '/favicon-48.png', dir: ar ? 'rtl' : 'ltr', lang,
    vibrate: [300, 150, 300, 150, 500], data: { url: '/#reminders' },
  });
})()));

self.addEventListener('notificationclick', e => {
  e.notification.close();
  const url = (e.notification.data && e.notification.data.url) || '/#reminders';
  e.waitUntil(self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(list => {
    for (const c of list) if ('focus' in c) { c.navigate && c.navigate(url).catch(() => {}); return c.focus(); }
    return self.clients.openWindow(url);
  }));
});
