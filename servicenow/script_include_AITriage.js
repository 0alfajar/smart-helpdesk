// Script Include: AITriage   (Global scope, Client callable = false)
// Calls the ML classifier over REST and falls back to keyword rules if the API
// is down, slow, or not configured.
var AITriage = Class.create();
AITriage.prototype = {
    initialize: function() {
        this.endpoint = gs.getProperty('aitriage.endpoint'); // e.g. https://your-host/classify
        this.apiKey = gs.getProperty('aitriage.api_key');    // optional
    },

    // Returns { category, confidence, source }
    classify: function(text) {
        var viaApi = this._callApi(text);
        if (viaApi) return viaApi;
        return this._fallback(text);
    },

    _callApi: function(text) {
        if (!this.endpoint) return null;
        try {
            var r = new sn_ws.RESTMessageV2();
            r.setEndpoint(this.endpoint);
            r.setHttpMethod('POST');
            r.setRequestHeader('Content-Type', 'application/json');
            if (this.apiKey) r.setRequestHeader('X-API-Key', this.apiKey);
            r.setRequestBody(JSON.stringify({ text: text }));
            r.setHttpTimeout(5000);
            var res = r.execute();
            if (res.getStatusCode() == 200) {
                var body = JSON.parse(res.getBody());
                return { category: body.category, confidence: body.confidence, source: 'ml-api' };
            }
            gs.warn('AITriage: API returned HTTP ' + res.getStatusCode());
        } catch (e) {
            gs.error('AITriage: API call failed - ' + e.message);
        }
        return null;
    },

    _fallback: function(text) {
        var t = (text || '').toLowerCase();
        var rules = [
            { category: 'network',  words: ['wifi', 'vpn', 'internet', 'jaringan', 'network', 'dns', 'router'] },
            { category: 'database', words: ['database', 'sql', 'query', 'mysql', 'postgres'] },
            { category: 'hardware', words: ['laptop', 'printer', 'monitor', 'keyboard', 'mouse', 'layar', 'charger'] },
            { category: 'software', words: ['install', 'aplikasi', 'application', 'excel', 'office', 'crash', 'error', 'update'] },
            { category: 'inquiry',  words: ['password', 'akses', 'access', 'akun', 'account', 'reset'] }
        ];
        for (var i = 0; i < rules.length; i++) {
            for (var j = 0; j < rules[i].words.length; j++) {
                if (t.indexOf(rules[i].words[j]) > -1) {
                    return { category: rules[i].category, confidence: 0.5, source: 'keyword-fallback' };
                }
            }
        }
        return { category: 'inquiry', confidence: 0.3, source: 'keyword-fallback' };
    },

    type: 'AITriage'
};
