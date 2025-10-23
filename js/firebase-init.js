(function () {
  var MAX_RETRIES = 120; // retry for up to ~6 seconds (120 * 50ms)
  var RETRY_MS = 50;

  var firebaseConfig = {
    apiKey: "AIzaSyDnHMczMwfHZcnFMAWWXff4l9p4PlvDSco",
    authDomain: "urbanflow-c7c90.firebaseapp.com",
    projectId: "urbanflow-c7c90",
    storageBucket: "urbanflow-c7c90.appspot.com",
    messagingSenderId: "141226648177",
    appId: "1:141226648177:web:1b6dab877f1a96cc5931d0"
  };

  var attempts = 0;

  function log() {
    var args = Array.prototype.slice.call(arguments);
    args.unshift('[firebase-init]');
    console.log.apply(console, args);
  }

  function warn() {
    var args = Array.prototype.slice.call(arguments);
    args.unshift('[firebase-init]');
    console.warn.apply(console, args);
  }

  function error() {
    var args = Array.prototype.slice.call(arguments);
    args.unshift('[firebase-init]');
    try {
      if (typeof console.error === 'function') {
        console.error.apply(console, args);
      } else {
        throw new Error('console.error is not a function');
      }
    } catch (e) {
      try {
        console.log('[firebase-init] (fallback error):', args.join(' '));
      } catch (fallbackErr) {
        // Ən son ehtiyat: heç olmasa alert ilə göstər
        alert('[firebase-init] Error: ' + args.join(' '));
      }
    }
  }


  function doInit() {
    attempts++;
    if (typeof window.firebase === 'undefined') {
      if (attempts >= MAX_RETRIES) {
        error('Firebase SDK not found after retries. Check that you included the compat SDK <script> tags and that network is OK.');
        return;
      }
      setTimeout(doInit, RETRY_MS);
      return;
    }

    try {
      if (firebase.apps && firebase.apps.length) {
        log('Firebase already initialized (apps.length=', firebase.apps.length, ')');
      } else {
        firebase.initializeApp(firebaseConfig);
        log('Firebase initializeApp() called.');
      }

      var auth = firebase.auth();
      var db = firebase.firestore();
      var messaging = null;

      try {
        messaging = firebase.messaging();
        log('Firebase Messaging available.');
      } catch (e) {
        warn('Firebase Messaging not available in this environment:', e && e.message || e);
      }

      window.urbanflowFirebase = {
        auth: auth,
        db: db,
        messaging: messaging,
        onAuthStateChanged: function (cb) { return auth.onAuthStateChanged(cb); },
        signUp: function (email, password) { return auth.createUserWithEmailAndPassword(email, password); },
        signIn: function (email, password) { return auth.signInWithEmailAndPassword(email, password); },
        signOut: function () { return auth.signOut(); }
      };

      window.urbanflowFirebase.requestFcmToken = async function (vapidKey) {
        if (!messaging) throw new Error('FCM not available in this environment');
        var permission = await Notification.requestPermission();
        if (permission !== 'granted') throw new Error('Notification permission denied');
        try {
          var token = await messaging.getToken({ vapidKey: vapidKey });
          log('FCM token obtained:', token);
          var user = auth.currentUser;
          if (user) {
            try {
              await db.collection('users').doc(user.uid).set({
                email: user.email,
                lastFcmToken: token,
                updated: firebase.firestore.FieldValue.serverTimestamp()
              }, { merge: true });
            } catch (e) {
              warn('Could not save FCM token to Firestore:', e);
            }
          }
          return token;
        } catch (e) {
          error('Error getting FCM token:', e);
          throw e;
        }
      };

      if (messaging && typeof messaging.onMessage === 'function') {
        messaging.onMessage(function (payload) {
          log('FCM foreground message:', payload);
          if (window.showToast) {
            showToast(payload.notification && payload.notification.title || 'Bildiriş',
              payload.notification && payload.notification.body || '');
          }
        });
      }

      log('✅ Firebase init finished. window.urbanflowFirebase ready.');
    } catch (initErr) {
      error('Initialization error:', initErr);
    }
  }

  log('Starting firebase-init (waiting for firebase global if needed)...');
  doInit();
})();
