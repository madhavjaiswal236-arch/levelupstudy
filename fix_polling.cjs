const fs = require('fs');
let fb = fs.readFileSync('src/lib/firebase.ts', 'utf8');

fb = fb.replace(/import \{ getFirestore \} from 'firebase\/firestore';/, "import { getFirestore, initializeFirestore } from 'firebase/firestore';");
fb = fb.replace(
  /export const db = \(firebaseConfig as any\)\.firestoreDatabaseId \? getFirestore\(app, \(firebaseConfig as any\)\.firestoreDatabaseId\) : getFirestore\(app\);/,
  `export const db = (firebaseConfig as any).firestoreDatabaseId ? initializeFirestore(app, { experimentalForceLongPolling: true }, (firebaseConfig as any).firestoreDatabaseId) : initializeFirestore(app, { experimentalForceLongPolling: true });`
);

fs.writeFileSync('src/lib/firebase.ts', fb);
