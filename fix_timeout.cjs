const fs = require('fs');
let app = fs.readFileSync('src/context/AppContext.tsx', 'utf8');

app = app.replace(
  /await setDoc\(doc\(db, 'users', firebaseUser\.uid\), cleanStateToSave, \{ merge: true \}\);/g,
  `await Promise.race([\n      setDoc(doc(db, 'users', firebaseUser.uid), cleanStateToSave, { merge: true }),\n      new Promise((_, reject) => setTimeout(() => reject(new Error("Timeout saving to Firestore after 10s. The database might be unreachable or rules are blocking it silently.")), 10000))\n    ]);`
);

fs.writeFileSync('src/context/AppContext.tsx', app);
