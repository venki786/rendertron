import fyers from 'fyers-api-v2';

export default class Fyers {
    constructor({
        auth_code = "",
        token = "",
        secret_key = "",
        appId = ""
    }) {
        this.auth_code = auth_code;
        this.token = token;
        this.secret_key = secret_key;
        this.appId = appId;
        fyers.setAppId(this.appId);
    }
    setValues() {
        fyers.setAppId(this.appId);
        fyers.setAccessToken(this.token);
    }
    async getD() {
        this.setValues();
        return await fyers.get_profile();
    }
    async generateAT(refresh = false) {
        this.setValues();
        if (this.token && !refresh) return;
        const reqBody = {
            auth_code: this.auth_code,
            secret_key: this.secret_key
        };
        const r = await fyers.generate_access_token(reqBody);
        this.token = r.access_token;
    }
    async getHistory(symbol) {
        this.setValues();
        let history = new fyers.history();
        return await history.setSymbol(symbol)
            .setResolution('1')
            .setDateFormat(1)
            .setRangeFrom("2023-09-22")
            .setRangeTo("2023-09-22")
            .getHistory();
    }
    async getQuotes(searchStr = "NSE:NIFTYBANK-INDEX") {
        this.setValues();
        let quotes = new fyers.quotes();
        return await quotes.setSymbol(searchStr.toString()).getQuotes();
    }
    async getMarketDepth(searchStr = "NSE:NIFTYBANK-INDEX") {
        this.setValues();
        let md = new fyers.marketDepth();
        return await md.setSymbol(searchStr.toString()).getMarketDepth();
    }
    async streaming(symbols = [], cb = () => { }) {
        this.setValues();
        const reqBody = {
            symbol: [...symbols],
            dataType: 'symbolUpdate'
        };

        fyers.fyers_connect(reqBody, function (data) {
            data = JSON.parse(data);
            if (!data.d["7208"].length) return;
            const info = data.d["7208"][0].v;
            cb(info.tt * 1000, info.original_name, info.cmd.c);
        })
    }
}
