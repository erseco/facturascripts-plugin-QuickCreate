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
    addCreateProductOption
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
