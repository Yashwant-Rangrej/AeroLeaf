(function() {
    'use strict';

    const DEMO_EMAIL = 'admin@aeroleaf.io';
    const DEMO_PASS  = 'windkit2026';
    const $ = id => document.getElementById(id);

    /* ============================================================
       AUTHENTICATION (SQLite frontend)
       ============================================================ */
    let db;
    let isSignUpMode = false;

    async function initDB() {
      try {
        const SQL = await initSqlJs({ locateFile: file => `https://cdnjs.cloudflare.com/ajax/libs/sql.js/1.8.0/${file}` });
        const savedDb = localStorage.getItem('aeroleaf_db');
        if (savedDb) {
          const uInt8Array = new Uint8Array(savedDb.split(','));
          db = new SQL.Database(uInt8Array);
        } else {
          db = new SQL.Database();
          db.run("CREATE TABLE users (id INTEGER PRIMARY KEY, email TEXT UNIQUE, password TEXT);");
          db.run("INSERT INTO users (email, password) VALUES (?, ?);", [DEMO_EMAIL, DEMO_PASS]);
          saveDB();
        }
      } catch (err) {
        console.error("Failed to initialize database:", err);
      }
    }
    
    function saveDB() {
      if (!db) return;
      const data = db.export();
      localStorage.setItem('aeroleaf_db', data.join(','));
    }

    initDB();

    $('toggle-auth').addEventListener('click', function(e) {
      e.preventDefault();
      isSignUpMode = !isSignUpMode;
      $('auth-title').textContent = isSignUpMode ? 'Sign Up' : 'Sign In';
      $('login-btn').textContent = isSignUpMode ? 'Sign Up' : 'Sign In';
      $('toggle-text').textContent = isSignUpMode ? 'Already have an account?' : 'Don\'t have an account?';
      $('toggle-auth').textContent = isSignUpMode ? 'Sign In' : 'Sign Up';
      $('login-error').hidden = true;
      $('login-success').hidden = true;
      $('email-input').classList.remove('field-error');
      $('password-input').classList.remove('field-error');
      
      // Hide demo hint on signup
      $('demo-hint').style.visibility = isSignUpMode ? 'hidden' : 'visible';
    });

    $('login-form').addEventListener('submit', function(e) {
      e.preventDefault();
      if (!db) return; // DB not yet loaded

      const email = $('email-input').value.trim();
      const pass  = $('password-input').value;
      $('login-error').hidden = true;
      $('login-success').hidden = true;
      $('email-input').classList.remove('field-error');
      $('password-input').classList.remove('field-error');

      if (isSignUpMode) {
        try {
          db.run("INSERT INTO users (email, password) VALUES (?, ?);", [email, pass]);
          saveDB();
          $('login-success').hidden = false;
          setTimeout(() => {
            $('toggle-auth').click(); // Switch back to Sign In
            $('email-input').value = email;
            $('password-input').value = pass;
          }, 1500);
        } catch (err) {
          if (err.message.includes('UNIQUE')) {
            $('login-error').textContent = 'Email already registered.';
          } else {
            $('login-error').textContent = 'An error occurred during sign up.';
          }
          $('login-error').hidden = false;
        }
      } else {
        const stmt = db.prepare("SELECT * FROM users WHERE email = ? AND password = ?");
        stmt.bind([email, pass]);
        if (stmt.step()) {
          $('user-email').textContent = email;
          $('login-screen').classList.add('fade-out');
          setTimeout(() => {
            $('login-screen').hidden = true;
            $('dashboard').hidden = false;
            window.startSimulation(); // Call global startSimulation
          }, 360);
        } else {
          $('login-error').textContent = 'Invalid email or password.';
          $('login-error').hidden = false;
          $('email-input').classList.add('field-error');
          $('password-input').classList.add('field-error');
        }
        stmt.free();
      }
    });

    $('sign-out-btn').addEventListener('click', function() {
      window.stopSimulation(); // Call global stopSimulation
      $('dashboard').hidden = true;
      $('login-screen').hidden = false;
      $('login-screen').classList.remove('fade-out');
      $('email-input').value = '';
      $('password-input').value = '';
      $('login-error').hidden = true;
      $('login-success').hidden = true;
      $('email-input').classList.remove('field-error');
      $('password-input').classList.remove('field-error');
      if (isSignUpMode) $('toggle-auth').click();
    });

})();
