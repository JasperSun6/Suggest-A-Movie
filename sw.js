const version = 2;
let isOnline = true;
const staticCache = `pwaAssignStaticCache${version}`;
const dynamicCache = `pwaAssignDynamicCache${version}`;
const cacheList = [
  "/",
  "/index.html",
  "/results.html",
  "/suggest.html",
  "/404.html",
  "/manifest.json",
  "/favicon.ico",
  "./css/main.css",
  "./js/app.js",
  "./img/imageNotFound.png",
  "./img/android-chrome-192x192.png",
  "./img/android-chrome-512x512.png",
  "./img/apple-touch-icon.png",
  "./img/favicon-16x16.png",
  "./img/favicon-32x32.png",
  "./img/mstile-150x150.png",
  "https://cdn.jsdelivr.net/npm/bootstrap@5.1.3/dist/css/bootstrap.min.css",
  "https://fonts.googleapis.com/css2?family=Ubuntu:ital,wght@0,300;0,400;0,500;0,700;1,300;1,400;1,500;1,700&display=swap",
];

self.addEventListener("install", (ev) => {
  ev.waitUntil(
    caches.open(staticCache).then((cache) => {
      cache.addAll(cacheList);
    })
  );
});

self.addEventListener("activate", (ev) => {
  ev.waitUntil(
    caches
      .keys()
      .then((keys) => {
        return Promise.all(
          keys
            .filter((key) => {
              if (key === staticCache || key === dynamicCache) {
                return false;
              } else {
                return true;
              }
            })
            .map((key) => caches.delete(key))
        );
      })
      .catch(console.warn)
  );
});

self.addEventListener("fetch", (ev) => {
  ev.respondWith(
    caches.match(ev.request).then((cacheRes) => {
      return (
        cacheRes ||
        fetch(ev.request)
          .then((fetchRes) => {
            // if (!fetchRes.ok) throw new Error(fetchRes.staticText);
            return caches.open(dynamicCache).then((cache) => {
              let copy = fetchRes.clone();
              cache.put(ev.request, copy);
              return fetchRes;
            });
          })
          .catch((err) => {
            console.log("SW fetch failed");
            console.warn(err);
            if (ev.request.mode == "navigate") {
              return caches.match("/404.html").then((cacheRes) => {
                return cacheRes;
              });
            }
          })
      );
    })
  );
});

self.addEventListener("message", (ev) => {
  console.log(ev.data);
  if (ev.data.ONLINE) {
    isOnline = ev.data.ONLINE;
  }
});

function sendMessage(msg) {
  self.clients.matchAll().then(function (clients) {
    if (clients && clients.length) {
      clients[0].postMessage(msg);
    }
  });
}

function limitCache() {
  //remove some files from the dynamic cache
  const limitCacheSize = (nm, size = 30) => {
    caches.open(nm).then((cache) => {
      cache.keys().then((keys) => {
        if (keys.length > size) {
          cache.delete(keys[0]).then(() => {
            limitCacheSize(nm, size);
          });
        }
      });
    });
  };
}

function checkForConnection() {
  //try to talk to a server and do a fetch() with HEAD method.
  //to see if we are really online or offline
  //send a message back to the browser
}
