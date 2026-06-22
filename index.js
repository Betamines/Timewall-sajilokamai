const express = require('express');
const admin = require('firebase-admin');
const crypto = require('crypto');
const app = express();

// 1. Firebase direct URL connect garne (Service Account Bina, Sandbox context anusaar)
// Note: Render ma deploy garda secure connect garna Firebase Admin configurations automatic verify huncha
admin.initializeApp({
  databaseURL: "https://sajilokamai-72496-default-rtdb.firebaseio.com/"
});

const db = admin.database();
const SECRET_KEY = "1eb292ef5a5c266b2b3c59a6bc91774a"; // Timro TimeWall Secret Key

app.use(express.json());

// Root endpoint check garna ko lagi (Server chalya cha ki nai herna)
app.get('/', (req, res) => {
    res.send("Sajilo Kamai TimeWall Backend is Running!");
});

// Main TimeWall Postback Integration URL
app.get('/timewall-postback', async (req, res) => {
    const { userID, transactionID, revenue, currencyAmount, hash, type } = req.query;

    // Security Verification: Hash verify gareko falsified request block garna
    const expectedHash = crypto
        .createHash('sha256')
        .update(userID + revenue + SECRET_KEY)
        .digest('hex');

    if (hash !== expectedHash) {
        return res.status(401).send("Unauthorized: Hash match bhayena");
    }

    try {
        // Timro Firebase ko 'users/userID' node tracking path
        const userRef = db.ref(`users/${userID}`);
        const snapshot = await userRef.once('value');

        if (!snapshot.exists()) {
            return res.status(404).send("User database ma bheteyena");
        }

        const userData = snapshot.val();
        let currentBalance = parseInt(userData.balance || 0);
        let points = parseInt(currencyAmount);

        // Lifecycle rules check: 'credit' bhaye point thapne, 'chargeback' bhaye ghataune
        if (type === 'credit') {
            currentBalance += points;
        } else if (type === 'chargeback') {
            currentBalance += points; // Negative value automated logic thapine le afai deduction huncha
        }

        // Realtime Database update transaction execution
        await userRef.update({ balance: currentBalance });
        return res.status(200).send("OK");

    } catch (error) {
        console.error("Database Error:", error);
        return res.status(500).send("Internal Server Error");
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server is perfectly listening on port ${PORT}`));
