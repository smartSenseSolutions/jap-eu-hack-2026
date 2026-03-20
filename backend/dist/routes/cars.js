"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const db_1 = __importDefault(require("../db"));
const auth_1 = require("../middleware/auth");
const edcService_1 = require("../services/edcService");
const uuid_1 = require("uuid");
const router = (0, express_1.Router)();
const ENABLE_EDC = process.env.ENABLE_EDC !== 'false';
router.get('/', async (req, res) => {
    const cars = await db_1.default.car.findMany();
    res.json(cars);
});
router.get('/:vin', async (req, res) => {
    const car = await db_1.default.car.findUnique({ where: { vin: req.params.vin } });
    if (!car)
        return res.status(404).json({ error: 'Car not found' });
    res.json(car);
});
router.post('/', (0, auth_1.requireRole)('admin'), async (req, res) => {
    const car = { id: (0, uuid_1.v4)(), ...req.body };
    const vin = car.vin;
    if (ENABLE_EDC) {
        try {
            const assetResponse = await (0, edcService_1.createAsset)(vin);
            const assetId = assetResponse['@id'];
            await (0, edcService_1.createContractDefinition)(assetId);
        }
        catch (err) {
            return res.status(502).json({
                error: 'Failed to register car in EDC. Car not created.',
                details: err.message,
            });
        }
    }
    const created = await db_1.default.car.create({
        data: {
            id: car.id,
            vin: car.vin,
            make: car.make,
            model: car.model,
            year: car.year,
            price: car.price,
            status: car.status || 'available',
            ownerId: car.ownerId,
            dpp: car.dpp || undefined,
        },
    });
    res.status(201).json(created);
});
router.put('/:vin', (0, auth_1.requireRole)('admin'), async (req, res) => {
    const car = await db_1.default.car.findUnique({ where: { vin: req.params.vin } });
    if (!car)
        return res.status(404).json({ error: 'Car not found' });
    const updated = await db_1.default.car.update({
        where: { vin: req.params.vin },
        data: req.body,
    });
    res.json(updated);
});
exports.default = router;
