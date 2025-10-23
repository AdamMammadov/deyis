// firebase-messaging-sw.js
importScripts('https://www.gstatic.com/firebasejs/9.22.2/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/9.22.2/firebase-messaging-compat.js');

// init with same config as firebase-init.js
firebase.initializeApp({
  apiKey: "AIzaSyC1vGSOUaRqMZvp2X0sfP1Ve6BK4x2kqps",
  authDomain: "urbanflow-c3054.firebaseapp.com",
  projectId: "urbanflow-c3054",
  storageBucket: "urbanflow-c3054.firebasestorage.app",
  messagingSenderId: "293999096910",
  appId: "1:293999096910:web:d91eaff4c264630a81bf1f"
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage(function(payload) {
  // Customize notification here
  const title = payload.notification?.title || 'UrbanFlow';
  const options = {
    body: payload.notification?.body || '',
    icon: '/assets/img/icon-192.png',
    data: payload.data || {}
  };
  self.registration.showNotification(title, options);
});
