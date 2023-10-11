import moment from 'moment';
import UserAgent from 'user-agents';

export default class APIClient {
    constructor() {
        this.baseURL = 'https://software.goalgos.com:3047';
        this.accessToken = null; // To be set after login
        this.headers = {
            // 'Accept': 'application/json, text/plain, */*',
            // 'Accept-Encoding': 'gzip, deflate, br',
            // 'Accept-Language': 'en-GB,en;q=0.8',
            'Content-Type': 'application/json',
            // 'Host': 'software.goalgos.com:3047',
            // 'Origin': 'https://software.goalgos.com',
            // 'Referer': 'https://software.goalgos.com/',
            // 'Sec-Fetch-Dest': 'empty',
            // 'Sec-Fetch-Mode': 'cors',
            // 'Sec-Fetch-Site': 'same-site',
            // 'Sec-GPC': '1',
            // 'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0.0.0 Safari/537.36',
            // 'sec-ch-ua': '"Not/A)Brand";v="99", "Brave";v="115", "Chromium";v="115"',
            // 'sec-ch-ua-mobile': '?0',
            // 'sec-ch-ua-platform': 'Linux',
            'X-Access-Token': this.accessToken
        };
    }

    async login(username, password) {
        const url = `${this.baseURL}/smartalgo/client/login`;
        const requestData = {
            method: 'POST',
            headers: this.headers,
            body: JSON.stringify({ "username": username, "password": password })
        };

        try {
            
            const userAgent = new UserAgent().toString();
            requestData.headers['User-Agent'] = userAgent;

            const response = await fetch(url, requestData);
            const data = await response.json();

            if (data.success === "true" && data.msg.token) {
                this.accessToken = data.msg.token;
                this.headers['X-Access-Token'] = this.accessToken;
            }

            return data;
        } catch (error) {
            console.error('Error:', error, moment().format("HH:mm:ss:SSS"));
            throw error;
        }
    }

    async getProfile(clientId) {
        const url = `${this.baseURL}/client/profile`;
        const requestData = {
            method: 'POST',
            headers: this.headers,
            body: JSON.stringify({ "client_id": clientId })
        };

        try {
            const userAgent = new UserAgent().toString();
            requestData.headers['User-Agent'] = userAgent;

            const response = await fetch(url, requestData);
            const data = await response.json();
            return data;
        } catch (error) {
            console.error('Error:', error, moment().format("HH:mm:ss:SSS"));
            throw error;
        }
    }

    async getLoginStatus(clientId) {
        const url = `${this.baseURL}/smartalgo/client/LoginStatusGet`;

        const requestData = {
            method: 'POST',
            headers: {
                ...this.headers,
                'x-access-token': this.headers['X-Access-Token']
            },
            body: JSON.stringify({ "client_id": clientId })
        };

        // console.log(requestData)

        try {
            const userAgent = new UserAgent().toString();
            requestData.headers['User-Agent'] = userAgent;

            const response = await fetch(url, requestData);
            const data = await response.json();
            return data;
        } catch (error) {
            console.error('Error:', error, moment().format("HH:mm:ss:SSS"));
            throw error;
        }
    }

    async getSignals(clientId, symbol, segment, todate, fromdate) {
        const url = `${this.baseURL}/client/signals`;
        const params = {
            client_id: clientId,
            symbol: symbol || "",
            segment: segment || "",
            todate: todate || "",
            fromdate: fromdate || ""
        };

        const requestData = {
            method: 'POST',
            headers: this.headers,
            body: JSON.stringify(params)
        };

        try {
            const userAgent = new UserAgent().toString();
            requestData.headers['User-Agent'] = userAgent;

            const response = await fetch(url, requestData);
            const data = await response.json();
            return data;
        } catch (error) {
            console.error('Error:', error, moment().format("HH:mm:ss:SSS"));
            throw error;
        }
    }

    // Define other API methods similarly...
};