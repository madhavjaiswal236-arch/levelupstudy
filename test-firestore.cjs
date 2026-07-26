const { initializeApp } = require("firebase/app");
const { getFirestore, doc } = require("firebase/firestore");
const config = require("./firebase-applet-config.json");
console.log(getFirestore.toString());
const app = initializeApp(config);
try {
  const db = getFirestore(app, config.firestoreDatabaseId);
  console.log("Success db with id");
  
  const d = doc(db, 'users', 'test');
  console.log("Doc reference created:", !!d);
} catch(e) {
  console.log("Error", e);
}
