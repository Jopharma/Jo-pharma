/* Jo Pharma service worker: يلزم لإظهار إشعارات المنبّهات على الهاتف.
   ضع هذا الملف في جذر الموقع (بجانب index.html) بحيث يكون رابطه: https://jopharma.net/sw.js */
self.addEventListener('install',()=>self.skipWaiting());
self.addEventListener('activate',e=>e.waitUntil(self.clients.claim()));

self.addEventListener('notificationclick',e=>{
  e.notification.close();
  const url=(e.notification.data&&e.notification.data.url)||'/#reminders';
  e.waitUntil(self.clients.matchAll({type:'window',includeUncontrolled:true}).then(list=>{
    for(const c of list){
      if('focus' in c){
        return c.focus().then(w=>{try{if(w&&'navigate' in w)return w.navigate(url)}catch(_){}});
      }
    }
    return self.clients.openWindow(url);
  }));
});

/* جاهز لإشعارات Push من خادم لاحقاً (تصل حتى والموقع مغلق) */
self.addEventListener('push',e=>{
  let d={};try{d=e.data?e.data.json():{}}catch(_){}
  e.waitUntil(self.registration.showNotification(d.title||'💊 موعد الدواء',{
    body:d.body||'',icon:'/apple-touch-icon.png',badge:'/favicon-48.png',tag:d.tag||'jp-push',
    requireInteraction:true,dir:'rtl',lang:'ar',data:{url:d.url||'/#reminders'}
  }));
});
