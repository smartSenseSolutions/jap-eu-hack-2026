"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createAsset = createAsset;
exports.createContractDefinition = createContractDefinition;
const axios_1 = __importDefault(require("axios"));
const EDC_BASE_URL = process.env.EDC_BASE_URL || '';
const EDC_API_KEY = process.env.EDC_API_KEY || '';
const BPN_NUMBER = process.env.BPN_NUMBER || '';
const APP_BASE_URL = process.env.APP_BASE_URL || '';
const EDC_ACCESS_POLICY_ID = process.env.EDC_ACCESS_POLICY_ID || '';
const EDC_CONTRACT_POLICY_ID = process.env.EDC_CONTRACT_POLICY_ID || '';
function buildAssetPayload(vin) {
    return {
        '@context': {
            edc: 'https://w3id.org/edc/v0.0.1/ns/',
            'cx-common': 'https://w3id.org/catenax/ontology/common#',
            'cx-taxo': 'https://w3id.org/catenax/taxonomy#',
            dct: 'https://purl.org/dc/terms/',
        },
        '@id': `asset_${vin}`,
        properties: {
            type: { '@id': 'Asset' },
        },
        dataAddress: {
            '@type': 'DataAddress',
            type: 'HttpData',
            baseUrl: `${APP_BASE_URL}/api/cars/${vin}`,
            proxyQueryParams: 'true',
            proxyPath: 'true',
            proxyMethod: 'true',
            proxyBody: 'true',
            method: 'POST',
        },
    };
}
async function createAsset(vin) {
    if (!EDC_BASE_URL) {
        throw new Error('EDC_BASE_URL is not configured');
    }
    const payload = buildAssetPayload(vin);
    console.log('EDC Request Payload:', JSON.stringify(payload, null, 2));
    try {
        const response = await axios_1.default.post(`${EDC_BASE_URL}/management/v3/assets`, payload, {
            headers: {
                'Content-Type': 'application/json',
                'x-api-key': EDC_API_KEY,
            },
            timeout: 5000,
        });
        console.log('EDC Response:', JSON.stringify(response.data, null, 2));
        return response.data;
    }
    catch (error) {
        console.error('EDC Asset Error:', error.response?.data || error.message);
        throw new Error(`Failed to create asset in EDC: ${error.response?.data?.message || error.message}`);
    }
}
function buildContractDefinitionPayload(assetId) {
    return {
        '@context': {
            '@vocab': 'https://w3id.org/edc/v0.0.1/ns/',
        },
        '@type': 'ContractDefinition',
        '@id': `contract_${assetId}`,
        accessPolicyId: EDC_ACCESS_POLICY_ID,
        contractPolicyId: EDC_CONTRACT_POLICY_ID,
        assetsSelector: {
            operandLeft: 'https://w3id.org/edc/v0.0.1/ns/id',
            operator: '=',
            operandRight: assetId,
        },
    };
}
async function createContractDefinition(assetId) {
    const payload = buildContractDefinitionPayload(assetId);
    console.log('EDC Contract Definition Payload:', JSON.stringify(payload, null, 2));
    try {
        const response = await axios_1.default.post(`${EDC_BASE_URL}/management/v3/contractdefinitions`, payload, {
            headers: {
                'Content-Type': 'application/json',
                'x-api-key': EDC_API_KEY,
            },
            timeout: 5000,
        });
        console.log('EDC Contract Definition Response:', JSON.stringify(response.data, null, 2));
        return response.data;
    }
    catch (error) {
        console.error('EDC Contract Definition Error:', error.response?.data || error.message);
        throw new Error(`Failed to create contract definition in EDC: ${error.response?.data?.message || error.message}`);
    }
}
