const { initializeApp } = require("firebase/app");
const { getFirestore } = require("firebase/firestore");
const config = require("./firebase-applet-config.json");
console.log(getFirestore.toString());
const app = initializeApp(config);
try {
  const db = getFirestore(app, config.firestoreDatabaseId);
  console.log("Success db with id");
} catch(e) {
  console.log("Error", e);
}
