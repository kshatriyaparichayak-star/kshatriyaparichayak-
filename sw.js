// 1. Firebase Service Worker फाइलों को इंपोर्ट करना
importScripts('https://www.gstatic.com/firebasejs/10.7.1/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.7.1/firebase-messaging-compat.js');

// 2. आपका असली Firebase Config
const firebaseConfig = {
  apiKey: "AIzaSyC0eEvmS3TYtFDfTjSI5mL9cfUmO3gt23I",
  authDomain: "kshatriya-parichay.firebaseapp.com",
  projectId: "kshatriya-parichay",
  storageBucket: "kshatriya-parichay.firebasestorage.app",
  messagingSenderId: "952092943473",
  appId: "1:952092943473:web:38d14a98f28df05922a7d0"
};

// 3. Firebase को Initialize करना
firebase.initializeApp(firebaseConfig);
const messaging = firebase.messaging();

// 4. बैकग्राउंड में नोटिफिकेशन रिसीव करना (जब ऐप बंद हो)
messaging.onBackgroundMessage((payload) => {
  console.log('[sw.js] बैकग्राउंड मैसेज मिला: ', payload);

  const notificationTitle = "🚩 क्षत्रिय परिचायक अलर्ट!";
  const notificationOptions = {
    body: payload.data.msg || "समाज का एक नया संदेश/अलर्ट आया है!",
    icon: 'logo.png', // आपके ऐप का लोगो चमकेगा
    badge: 'logo.png',
    vibrate: [200, 100, 200] // फोन वाइब्रेट होगा
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});

// 5. ऑफलाइन सपोर्ट
self.addEventListener('fetch', (event) => {
  // यह भविष्य में ऐप को बिना इंटरनेट के भी खोलने में मदद करेगा
});
