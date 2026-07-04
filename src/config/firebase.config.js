import { initializeApp, cert } from "firebase-admin/app";
import { createRequire } from "module";
import path from "path"; 

const require = createRequire(import.meta.url);

const keyPath = path.join(process.cwd(), "serviceAccountKey.json");
const serviceAccount = require(keyPath);

const firebaseApp = initializeApp({
  credential: cert(serviceAccount),
});

export default firebaseApp;