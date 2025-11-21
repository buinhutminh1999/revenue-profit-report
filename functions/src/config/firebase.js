const admin = require("firebase-admin");
const { getAuth } = require("firebase-admin/auth");
const { getFirestore, FieldValue } = require("firebase-admin/firestore");
const { getDatabase } = require("firebase-admin/database");

if (!admin.apps.length) {
    admin.initializeApp();
}

const db = getFirestore();
const rtdb = getDatabase();
const auth = getAuth();

module.exports = {
    admin,
    db,
    rtdb,
    auth,
    FieldValue
};
