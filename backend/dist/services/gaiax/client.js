"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.GaiaXClient = void 0;
const axios_1 = __importDefault(require("axios"));
const config_1 = require("./config");
class GaiaXClient {
    constructor(configOverride) {
        this.healthCache = new Map();
        this.HEALTH_CACHE_TTL = 60000;
        this.config = { ...(0, config_1.getGaiaXConfig)(), ...configOverride };
        this.httpClient = axios_1.default.create({
            timeout: this.config.timeout,
            headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        });
    }
    get isMockMode() {
        return this.config.mockMode;
    }
    async checkHealth(endpointSet) {
        const cached = this.healthCache.get(endpointSet.name);
        if (cached && Date.now() - cached.cachedAt < this.HEALTH_CACHE_TTL) {
            return cached.status;
        }
        const checkEndpoint = async (url) => {
            const start = Date.now();
            try {
                await this.httpClient.get(url, { timeout: 5000 });
                return { healthy: true, latencyMs: Date.now() - start };
            }
            catch (e) {
                const err = e;
                return { healthy: false, latencyMs: Date.now() - start, error: err.message };
            }
        };
        const [compliance, registry, notary] = await Promise.all([
            checkEndpoint(endpointSet.compliance),
            checkEndpoint(endpointSet.registry),
            checkEndpoint(endpointSet.notary),
        ]);
        const status = {
            endpointSet: endpointSet.name,
            compliance,
            registry,
            notary,
            overall: compliance.healthy || registry.healthy || notary.healthy,
            checkedAt: new Date().toISOString(),
        };
        this.healthCache.set(endpointSet.name, { status, cachedAt: Date.now() });
        return status;
    }
    async checkAllHealth() {
        return Promise.all(this.config.endpointSets.map(s => this.checkHealth(s)));
    }
    async selectHealthyEndpointSet() {
        for (const endpointSet of this.config.endpointSets.sort((a, b) => a.priority - b.priority)) {
            const health = await this.checkHealth(endpointSet);
            if (health.overall) {
                return { endpointSet, health };
            }
            console.log(`[GaiaX] Endpoint set "${endpointSet.name}" unhealthy, trying next...`);
        }
        return null;
    }
    async postWithRetry(url, data, attempts) {
        const maxAttempts = attempts || this.config.retryAttempts;
        let lastError = null;
        for (let i = 0; i < maxAttempts; i++) {
            try {
                const response = await this.httpClient.post(url, data);
                return response.data;
            }
            catch (e) {
                lastError = e;
                console.log(`[GaiaX] Attempt ${i + 1}/${maxAttempts} failed for ${url}: ${lastError.message}`);
                if (i < maxAttempts - 1) {
                    await new Promise(r => setTimeout(r, this.config.retryDelay * (i + 1)));
                }
            }
        }
        throw lastError || new Error('Request failed after retries');
    }
    async getWithRetry(url, attempts) {
        const maxAttempts = attempts || this.config.retryAttempts;
        let lastError = null;
        for (let i = 0; i < maxAttempts; i++) {
            try {
                const response = await this.httpClient.get(url);
                return response.data;
            }
            catch (e) {
                lastError = e;
                if (i < maxAttempts - 1) {
                    await new Promise(r => setTimeout(r, this.config.retryDelay * (i + 1)));
                }
            }
        }
        throw lastError || new Error('Request failed after retries');
    }
    getConfig() {
        return this.config;
    }
}
exports.GaiaXClient = GaiaXClient;
