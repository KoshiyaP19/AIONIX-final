require('dotenv').config();
const mailer = require('./utils/mailer');

async function testMail() {
    console.log("Triggering sample critical alert email...");
    try {
        await mailer.sendCriticalAlert({
            service: "AIONIX-SYSTEM-TEST",
            message: "This is a sample manual test event designed specifically to verify that the SMTP authentication transport is actively working and relaying messages to your inbox successfully.",
            timestamp: Date.now()
        });
        console.log("Sample email workflow triggered.");
    } catch(e) {
        console.error("Test execution failed.", e);
    }
}

testMail();
