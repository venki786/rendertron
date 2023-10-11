import puppeteer from "puppeteer";
import { URLSearchParams, fileURLToPath } from "url";
import moment from "moment";
import totp from "totp-generator";
import dotenv from "dotenv";
import express from 'express';
import http from 'http';
import Chromium from "@sparticuz/chromium";
import async from 'async';

import FyersScript from "./scripts/fyers.js";
import { sleep } from "./scripts/utils.js";
import APIClient from './scripts/goalgoClient.js';

import { Low, JSONFile } from 'lowdb';
import { join, dirname } from "path";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const defaultLoginStorage = join(__dirname, "database", `fyersLogin_${moment().format("DD_MM_YY")}.json`);

// process.env.DISPLAY = ':1';

class FyersDB {
    constructor({
        loginStorage = defaultLoginStorage
    } = {}) {
        this.loginStorage = loginStorage
    }
    getLoginRef() {
        return new Low(new JSONFile(this.loginStorage));
    }
}

async function job({
    appId,
    redirect_uri,
    userId,
    password,
    pin
}) {
    console.log("Login in progress!!!!!!!!!! \n");
    console.log({
        headless: Chromium.headless,
        exPath: await Chromium.executablePath,
    });
    const browser = await puppeteer.launch({
        args: [
            ...Chromium.args,
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--disable-accelerated-2d-canvas',
            '--no-first-run',
            '--no-zygote',
            '--single-process', // <- this one doesn't works in Windows
            '--disable-gpu'
        ],
        headless: true, //Chromium.headless,
        executablePath: await Chromium.executablePath,
        // defaultViewport: Chromium.defaultViewport   
    });

    console.log({ exPath: await Chromium.executablePath });

    try {
        const [first, second, third, fourth] = pin.split("");

        const page = await browser.newPage();

        await page.setViewport({ width: 1280, height: 800 });
        await page.goto(`https://api.fyers.in/api/v2/generate-authcode?client_id=${appId}&redirect_uri=${redirect_uri}&response_type=code&state=sample_state`);

        // await page.screenshot({ path: 'v.png' });

        await page.waitForSelector('#login_client_id', { timeout: 5000 });
        await page.click('#login_client_id');

        // await page.screenshot({ path: 'v0.png' });

        await sleep(5);

        await page.waitForSelector('#fy_client_id', { timeout: 5000 });
        await page.type('#fy_client_id', userId);
        await page.click('#clientIdSubmit');

        // await page.screenshot({ path: 'v1.png' });

        await sleep(5);

        const [totpfirst, totpsecond, totpthird, totpfourth, totpfifth, totpsixth] = totp(password).split("");
        // console.log({ totpfirst, totpsecond, totpthird, totpfourth, totpfifth, totpsixth });

        await page.waitForSelector('#otp-container > #first', { timeout: 5000 });
        await page.focus('#otp-container > #first');
        await page.type('#otp-container > #first', totpfirst);

        await page.focus('#otp-container > #second');
        await page.type('#otp-container > #second', totpsecond);

        await page.focus('#otp-container > #third');
        await page.type('#otp-container > #third', totpthird);

        await page.focus('#otp-container > #fourth');
        await page.type('#otp-container > #fourth', totpfourth);

        await page.focus('#otp-container > #fifth');
        await page.type('#otp-container > #fifth', totpfifth);

        await page.focus('#otp-container > #sixth');
        await page.type('#otp-container > #sixth', totpsixth);

        await sleep(5);

        await page.waitForSelector('#confirmOtpSubmit', { timeout: 30000 });
        await sleep(5);
        await page.click('#confirmOtpSubmit');
        await sleep(5);
        // await page.screenshot({ path: 'v2.png' });

        await page.waitForSelector('#pin-container > #first', { timeout: 5000 });
        await page.focus('#pin-container > #first');
        await page.type('#pin-container > #first', first);

        await page.focus('#pin-container > #second');
        await page.type('#pin-container > #second', second);

        await page.focus('#pin-container > #third');
        await page.type('#pin-container > #third', third);

        await page.focus('#pin-container > #fourth');
        await page.type('#pin-container > #fourth', fourth);

        await page.waitForSelector('#verifyPinSubmit', { timeout: 10000 });
        await page.click('#verifyPinSubmit');

        // await page.screenshot({ path: 'v3.png' });

        await page.waitForNavigation({
            waitUntil: "networkidle0"
        });

        const url = await page.url();
        // console.log({ url });
        await browser.close();

        const FyersLoginDB = new FyersDB().getLoginRef();
        await FyersLoginDB.read();

        FyersLoginDB.data = FyersLoginDB.data || {
            token: false,
            auth_code: false,
            authCodeCreatedAt: false,
            tokenGeneratedAt: false
        }

        let params = new URLSearchParams(url)
        params = Object.fromEntries(params.entries());

        if (!params.auth_code) throw new Error("auth_code Not Found!!!")

        FyersLoginDB.data.auth_code = params.auth_code;
        FyersLoginDB.data.authCodeCreatedAt = Date.now();

        await FyersLoginDB.write();

        const fyersScript = new FyersScript({
            secret_key: process.env.FYERS_APP_SECRET_KEY,
            appId: process.env.FYERS_APP_ID
        });

        fyersScript.auth_code = params.auth_code;

        await fyersScript.generateAT();

        FyersLoginDB.data.token = fyersScript.token;
        FyersLoginDB.data.tokenGeneratedAt = Date.now();
        console.log({
            v: FyersLoginDB.data
        });
        await FyersLoginDB.write();

        console.log("\n Successfully Logged in......")

    } catch (e) {
        console.log(e);
        await browser.close();
        await sleep(5);
        await job({
            appId,
            redirect_uri,
            userId,
            password,
            pin
        });
    }
}

export const ExecuteFyerLoginJob = async () => {
    console.log(`FyersLogin runnning at`, moment().format(`YYYY-MM-DD HH:mm:ss:SSS`));
    const FyersLoginDB = new FyersDB().getLoginRef();
    await FyersLoginDB.read();

    const lastTokenGenDate = moment(FyersLoginDB.data?.tokenGeneratedAt).format("DD");

    if (!FyersLoginDB.data || lastTokenGenDate !== moment().format("DD")) {
        await job({
            appId: process.env.FYERS_APP_ID,
            redirect_uri: process.env.FYERS_REDIRECT_URI,
            userId: process.env.FYERS_USER_ID,
            password: process.env.FYERS_PASSWORD,
            pin: process.env.FYERS_PIN
        });
    }
}

async function run() {

    const PORT = process.env.PORT || 8000;
    const app = express();
    const server = http.createServer(app);

    app.use(express.json());

    app.get('/fyers_login', (req, res) => { res.json({ p: req.params }) });

    // Start the server
    server.listen(PORT, async () => {
        console.log(`FyersLogin Server runnning at`, moment().format(`YYYY-MM-DD HH:mm:ss:SSS`));
        try {
            ExecuteFyerLoginJob().catch(console.error);
        } catch (e) { console.log(e); }

        try {
            const apiClient = new APIClient();
            // const loginResponse = await apiClient.login("Venkateswarlu", "Venkat@8081");
            const loginResponse = await apiClient.login("maneeshag", "SiddiqKarna");
            
            if (loginResponse.success === "true") {
                await apiClient.getProfile(loginResponse.msg.user_id);

                async.forever(function (next) {
                    (async function () {
                        try {
                            const ch = Number(moment().format("HH"));
                            if (ch >= 4 && ch <= 16) {
                                await apiClient.getLoginStatus(loginResponse.msg.user_id);
                                await fetch('https://fy-qw33.onrender.com/fyers_login');
                            }
                        } catch (e) { console.log(e, moment().format("DD-MM-YYYY HH:mm:ss:SSS")); }
                        setTimeout(next, 6000); // Wait for 6 seconds before the next iteration
                    })();
                }, function (err) {
                    console.error('Error3:', err, moment().format("DD-MM-YYYY HH:mm:ss:SSS"));
                });
                // Schedule the getSignals function every few seconds while the current hour is between 9 and 16
                async.forever(function (next) {
                    (async function () {
                        const ch = Number(moment().format("HH"));
                        if (ch >= 4 && ch <= 16) {
                            try {
                                const signalsResponse = await apiClient.getSignals(loginResponse.msg.user_id, "", "", "", "");
                                console.log(moment().format("DD-MM-YYYY HH:mm:ss:SSS"), signalsResponse.signals.length);
                            } catch (e) { console.log(e, moment().format("DD-MM-YYYY HH:mm:ss:SSS")); }
                            setTimeout(next, 3000); // Wait for 5 milli seconds before the next iteration
                        } else {
                            setTimeout(next, 60 * 1000); // Wait for 60 seconds before the next iteration
                        }
                    })();
                }, function (err) {
                    console.error('Error2:', err, moment().format("DD-MM-YYYY HH:mm:ss:SSS"));
                });
            }
        } catch (error) {
            console.error('Error1:', error, moment().format("DD-MM-YYYY HH:mm:ss:SSS"));
        }
    });
}

run().catch(console.error);
