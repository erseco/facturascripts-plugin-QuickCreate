/**
 * This file is part of QuickCreate plugin for FacturaScripts.
 * Copyright (C) 2026 Ernesto Serrano <info@ernesto.es>
 *
 * Unit tests for QuickCreate pure functions using Node.js native test runner.
 * Run with: node --test Test/js/QuickCreate.test.js
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Lesser General Public License as
 * published by the Free Software Foundation, either version 3 of the
 * License, or (at your option) any later version.
 */

'use strict';

const { test, describe } = require('node:test');
const assert = require('node:assert');
const {
    escapeHtml,
    trans,
    transformCodsubcuenta,
    addCreateProductOption,
    calculateMargin,
    calculatePriceFromMargin
} = require('./QuickCreate.functions.js');

describe('escapeHtml', () => {
    test('returns empty string for null', () => {
        assert.strictEqual(escapeHtml(null), '');
    });

    test('returns empty string for undefined', () => {
        assert.strictEqual(escapeHtml(undefined), '');
    });

    test('returns empty string for empty string', () => {
        assert.strictEqual(escapeHtml(''), '');
    });

    test('escapes less than sign', () => {
        assert.strictEqual(escapeHtml('<'), '&lt;');
    });

    test('escapes greater than sign', () => {
        assert.strictEqual(escapeHtml('>'), '&gt;');
    });

    test('escapes ampersand', () => {
        assert.strictEqual(escapeHtml('&'), '&amp;');
    });

    test('escapes double quotes', () => {
        assert.strictEqual(escapeHtml('"'), '&quot;');
    });

    test('escapes single quotes', () => {
        assert.strictEqual(escapeHtml("'"), '&#039;');
    });

    test('escapes script tag', () => {
        assert.strictEqual(
            escapeHtml('<script>alert("xss")</script>'),
            '&lt;script&gt;alert(&quot;xss&quot;)&lt;/script&gt;'
        );
    });

    test('escapes combined HTML entities', () => {
        assert.strictEqual(
            escapeHtml('A & B < C > D "E" \'F\''),
            'A &amp; B &lt; C &gt; D &quot;E&quot; &#039;F&#039;'
        );
    });

    test('does not escape normal text', () => {
        assert.strictEqual(escapeHtml('Hello World'), 'Hello World');
    });

    test('handles numbers by converting to string', () => {
        assert.strictEqual(escapeHtml(123), '123');
    });
});

describe('trans', () => {
    test('returns translation for known key', () => {
        assert.strictEqual(trans('quick-create-product'), 'Crear producto');
    });

    test('returns translation for cancel key', () => {
        assert.strictEqual(trans('cancel'), 'Cancelar');
    });

    test('returns translation for save key', () => {
        assert.strictEqual(trans('save'), 'Guardar');
    });

    test('returns the key itself for unknown key', () => {
        assert.strictEqual(trans('unknown-key'), 'unknown-key');
    });

    test('returns empty string for empty key', () => {
        assert.strictEqual(trans(''), '');
    });

    test('returns the key for undefined key', () => {
        assert.strictEqual(trans(undefined), undefined);
    });

    test('returns translation for saving key', () => {
        assert.strictEqual(trans('saving'), 'Guardando...');
    });

    test('returns translation for connection-error key', () => {
        assert.strictEqual(trans('connection-error'), 'Error de conexion');
    });

    // New supplier and stock field translations
    test('returns translation for supplier key', () => {
        assert.strictEqual(trans('supplier'), 'Proveedor');
    });

    test('returns translation for purchase-price key', () => {
        assert.strictEqual(trans('purchase-price'), 'Precio compra');
    });

    test('returns translation for supplier-discount key', () => {
        assert.strictEqual(trans('supplier-discount'), 'Dto. %');
    });

    test('returns translation for margin key', () => {
        assert.strictEqual(trans('margin'), 'Margen');
    });

    test('returns translation for initial-stock key', () => {
        assert.strictEqual(trans('initial-stock'), 'Stock inicial');
    });

    test('returns translation for warehouse key', () => {
        assert.strictEqual(trans('warehouse'), 'Almacen');
    });

    test('returns translation for sale-price key', () => {
        assert.strictEqual(trans('sale-price'), 'Precio venta');
    });

    test('returns translation for no-stock-control key', () => {
        assert.strictEqual(trans('no-stock-control'), 'No controlar stock');
    });

    test('returns translation for allow-sale-without-stock key', () => {
        assert.strictEqual(trans('allow-sale-without-stock'), 'Permitir venta sin stock');
    });

    test('returns translation for purchase-data key', () => {
        assert.strictEqual(trans('purchase-data'), 'Datos de compra (opcional)');
    });

    test('returns translation for stock-data key', () => {
        assert.strictEqual(trans('stock-data'), 'Stock inicial (opcional)');
    });

    test('returns translation for accounting key', () => {
        assert.strictEqual(trans('accounting'), 'Contabilidad (opcional)');
    });

    // New translations for reorganized form
    test('returns translation for public key', () => {
        assert.strictEqual(trans('public'), 'Publico');
    });

    test('returns translation for prices key', () => {
        assert.strictEqual(trans('prices'), 'Precios (opcional)');
    });
});

describe('transformCodsubcuenta', () => {
    test('returns empty string for null', () => {
        assert.strictEqual(transformCodsubcuenta(null, 10), '');
    });

    test('returns empty string for undefined', () => {
        assert.strictEqual(transformCodsubcuenta(undefined, 10), '');
    });

    test('returns empty string for empty string', () => {
        assert.strictEqual(transformCodsubcuenta('', 10), '');
    });

    test('returns trimmed code without dot', () => {
        assert.strictEqual(transformCodsubcuenta('  5700000001  ', 10), '5700000001');
    });

    test('returns same code if no dot present', () => {
        assert.strictEqual(transformCodsubcuenta('5700000001', 10), '5700000001');
    });

    test('transforms 570.1 with length 10', () => {
        assert.strictEqual(transformCodsubcuenta('570.1', 10), '5700000001');
    });

    test('transforms 43.1 with length 6', () => {
        assert.strictEqual(transformCodsubcuenta('43.1', 6), '430001');
    });

    test('transforms 4.1 with length 10', () => {
        assert.strictEqual(transformCodsubcuenta('4.1', 10), '4000000001');
    });

    test('transforms 5700.12 with length 10', () => {
        assert.strictEqual(transformCodsubcuenta('5700.12', 10), '5700000012');
    });

    test('returns original code if suffix is too long', () => {
        assert.strictEqual(transformCodsubcuenta('57000.123456', 10), '57000.123456');
    });

    test('returns original code with multiple dots', () => {
        assert.strictEqual(transformCodsubcuenta('5.7.0', 10), '5.7.0');
    });

    test('uses default length of 10 if not provided', () => {
        assert.strictEqual(transformCodsubcuenta('570.1'), '5700000001');
    });

    test('handles whitespace in code with dot', () => {
        assert.strictEqual(transformCodsubcuenta('  570.1  ', 10), '5700000001');
    });
});

describe('addCreateProductOption', () => {
    test('adds create option to empty array', () => {
        const results = addCreateProductOption([], '');
        assert.strictEqual(results.length, 1);
        assert.strictEqual(results[0].key, '__quick_create__');
        assert.ok(results[0].value.includes('Crear producto'));
    });

    test('adds create option to existing results', () => {
        const existing = [
            { key: 'PROD001', value: 'Product 1' },
            { key: 'PROD002', value: 'Product 2' }
        ];
        const results = addCreateProductOption(existing, '');
        assert.strictEqual(results.length, 3);
        assert.strictEqual(results[2].key, '__quick_create__');
    });

    test('includes search term in label', () => {
        const results = addCreateProductOption([], 'TEST123');
        assert.ok(results[0].value.includes('TEST123'));
    });

    test('trims search term in label', () => {
        const results = addCreateProductOption([], '  TEST123  ');
        assert.ok(results[0].value.includes('TEST123'));
        assert.ok(!results[0].value.includes('  '));
    });

    test('handles null results array', () => {
        const results = addCreateProductOption(null, 'test');
        assert.strictEqual(results.length, 1);
    });

    test('handles null search term', () => {
        const results = addCreateProductOption([], null);
        assert.strictEqual(results.length, 1);
        assert.strictEqual(results[0].key, '__quick_create__');
    });

    test('handles empty search term', () => {
        const results = addCreateProductOption([], '   ');
        assert.strictEqual(results.length, 1);
        // Should not include colon when search term is only whitespace
        assert.ok(!results[0].value.includes(':'));
    });
});

describe('calculateMargin', () => {
    // Basic margin calculations
    test('calculates 100% margin when sale price is double the cost', () => {
        // Sale: 1.00, Cost: 0.50, Discount: 0% -> Net: 0.50 -> Margin: 100%
        const margin = calculateMargin(1.00, 0.50, 0);
        assert.strictEqual(margin, 100);
    });

    test('calculates 0% margin when sale equals cost', () => {
        // Sale: 1.00, Cost: 1.00, Discount: 0% -> Net: 1.00 -> Margin: 0%
        const margin = calculateMargin(1.00, 1.00, 0);
        assert.strictEqual(margin, 0);
    });

    test('calculates negative margin when sale is less than cost', () => {
        // Sale: 0.80, Cost: 1.00, Discount: 0% -> Net: 1.00 -> Margin: -20%
        const margin = calculateMargin(0.80, 1.00, 0);
        assert.ok(Math.abs(margin - (-20)) < 0.0001, `Expected ~-20, got ${margin}`);
    });

    // Discount calculations
    test('calculates margin with 50% discount', () => {
        // Sale: 1.00, Cost: 1.00, Discount: 50% -> Net: 0.50 -> Margin: 100%
        const margin = calculateMargin(1.00, 1.00, 50);
        assert.strictEqual(margin, 100);
    });

    test('calculates margin with 10% discount', () => {
        // Sale: 1.00, Cost: 1.00, Discount: 10% -> Net: 0.90 -> Margin: ~11.11%
        const margin = calculateMargin(1.00, 1.00, 10);
        assert.ok(Math.abs(margin - 11.111111111111111) < 0.0001);
    });

    test('calculates margin with 100% discount results in null', () => {
        // Sale: 1.00, Cost: 1.00, Discount: 100% -> Net: 0 -> null (division by zero)
        const margin = calculateMargin(1.00, 1.00, 100);
        assert.strictEqual(margin, null);
    });

    // Edge cases
    test('returns null when purchase price is 0', () => {
        const margin = calculateMargin(1.00, 0, 0);
        assert.strictEqual(margin, null);
    });

    test('returns null when purchase price and discount result in 0 net', () => {
        const margin = calculateMargin(1.00, 0.50, 100);
        assert.strictEqual(margin, null);
    });

    test('handles string inputs by parsing them', () => {
        const margin = calculateMargin('1.00', '0.50', '0');
        assert.strictEqual(margin, 100);
    });

    test('handles null inputs as 0', () => {
        const margin = calculateMargin(null, null, null);
        assert.strictEqual(margin, null); // Net is 0
    });

    test('handles undefined inputs as 0', () => {
        const margin = calculateMargin(undefined, undefined, undefined);
        assert.strictEqual(margin, null); // Net is 0
    });

    // Real-world scenarios from the plan
    test('scenario from plan: sale 1.00, cost 0.50, discount 0%', () => {
        // Expected: Margin 100%
        const margin = calculateMargin(1.00, 0.50, 0);
        assert.strictEqual(margin, 100);
    });

    test('scenario from plan: sale 1.00, cost 1.00, discount 50%', () => {
        // Net = 1.00 * (1 - 50/100) = 0.50
        // Margin = ((1.00 - 0.50) / 0.50) * 100 = 100%
        const margin = calculateMargin(1.00, 1.00, 50);
        assert.strictEqual(margin, 100);
    });

    // Precision tests
    test('handles decimal precision correctly', () => {
        // Sale: 10.50, Cost: 7.35, Discount: 5%
        // Net = 7.35 * 0.95 = 6.9825
        // Margin = ((10.50 - 6.9825) / 6.9825) * 100 = ~50.38%
        const margin = calculateMargin(10.50, 7.35, 5);
        assert.ok(margin > 50 && margin < 51);
    });

    test('calculates typical retail margin', () => {
        // Common retail scenario: buy at 60, sell at 100, no discount
        // Margin = ((100 - 60) / 60) * 100 = 66.67%
        const margin = calculateMargin(100, 60, 0);
        assert.ok(Math.abs(margin - 66.66666666666667) < 0.0001);
    });
});

describe('calculatePriceFromMargin', () => {
    // Basic price calculations from margin
    test('calculates price with 100% margin', () => {
        // Cost: 0.50, Discount: 0%, Margin: 100% -> Net: 0.50 -> Price: 1.00
        const price = calculatePriceFromMargin(0.50, 0, 100);
        assert.strictEqual(price, 1.00);
    });

    test('calculates price with 0% margin returns null', () => {
        // Cost: 1.00, Discount: 0%, Margin: 0% -> returns null (margen === 0)
        const price = calculatePriceFromMargin(1.00, 0, 0);
        assert.strictEqual(price, null);
    });

    test('calculates price with negative margin', () => {
        // Cost: 1.00, Discount: 0%, Margin: -20% -> Net: 1.00 -> Price: 0.80
        const price = calculatePriceFromMargin(1.00, 0, -20);
        assert.ok(Math.abs(price - 0.80) < 0.0001);
    });

    // Discount calculations
    test('calculates price with 50% discount and 100% margin', () => {
        // Cost: 1.00, Discount: 50%, Margin: 100% -> Net: 0.50 -> Price: 1.00
        const price = calculatePriceFromMargin(1.00, 50, 100);
        assert.strictEqual(price, 1.00);
    });

    test('calculates price with 10% discount and 40% margin', () => {
        // Cost: 10, Discount: 50%, Margin: 40% -> Net: 5 -> Price: 7
        const price = calculatePriceFromMargin(10, 50, 40);
        assert.strictEqual(price, 7);
    });

    // Edge cases
    test('returns null when purchase price is 0', () => {
        const price = calculatePriceFromMargin(0, 0, 100);
        assert.strictEqual(price, null);
    });

    test('returns null when 100% discount results in 0 net', () => {
        const price = calculatePriceFromMargin(1.00, 100, 50);
        assert.strictEqual(price, null);
    });

    test('handles string inputs by parsing them', () => {
        const price = calculatePriceFromMargin('0.50', '0', '100');
        assert.strictEqual(price, 1.00);
    });

    // Integration test: verify round-trip calculation
    test('round-trip: calculateMargin and calculatePriceFromMargin are inverses', () => {
        const purchasePrice = 10;
        const discount = 20;
        const originalMargin = 50;

        // Calculate price from margin
        const price = calculatePriceFromMargin(purchasePrice, discount, originalMargin);

        // Calculate margin from price (should get back original margin)
        const calculatedMargin = calculateMargin(price, purchasePrice, discount);

        assert.ok(Math.abs(calculatedMargin - originalMargin) < 0.0001,
            `Expected margin ~${originalMargin}, got ${calculatedMargin}`);
    });

    // Real-world scenario from the plan
    test('scenario from plan: cost 10, discount 50%, margin 40%', () => {
        // Net = 10 * (1 - 50/100) = 5
        // Price = 5 * (1 + 40/100) = 7
        const price = calculatePriceFromMargin(10, 50, 40);
        assert.strictEqual(price, 7);
    });

    // Precision tests
    test('handles decimal precision correctly', () => {
        // Cost: 7.35, Discount: 5%, Margin: 50%
        // Net = 7.35 * 0.95 = 6.9825
        // Price = 6.9825 * 1.50 = 10.47375
        const price = calculatePriceFromMargin(7.35, 5, 50);
        assert.ok(Math.abs(price - 10.47375) < 0.0001);
    });
});
