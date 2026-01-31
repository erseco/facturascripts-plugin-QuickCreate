/**
 * This file is part of QuickCreate plugin for FacturaScripts.
 * Copyright (C) 2026 Ernesto Serrano <info@ernesto.es>
 *
 * Pure functions extracted from QuickCreate.js for unit testing.
 * These functions have no DOM dependencies and can be tested in Node.js.
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Lesser General Public License as
 * published by the Free Software Foundation, either version 3 of the
 * License, or (at your option) any later version.
 */

'use strict';

/**
 * Escapes HTML special characters to prevent XSS attacks.
 * @param {string} text - The text to escape
 * @returns {string} The escaped text
 */
function escapeHtml(text) {
    if (!text) return '';
    return String(text)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

/**
 * Translates a key using the fallback dictionary.
 * In production, this uses window.i18n if available.
 * @param {string} key - The translation key
 * @returns {string} The translated text or the key if not found
 */
function trans(key) {
    const fallback = {
        'quick-create-product': 'Crear producto',
        'quick-create-account': 'Crear subcuenta',
        'create-subcuenta': 'Crear subcuenta',
        'create-subaccount-code': 'Crear subcuenta',
        'filter-by-account': 'Filtrar por cuenta',
        'all-accounts': 'Todas las cuentas',
        'reference': 'Referencia',
        'description': 'Descripcion',
        'price': 'Precio',
        'account-code': 'Codigo subcuenta',
        'account-code-hint': 'Introduce el codigo completo de la subcuenta',
        'cancel': 'Cancelar',
        'save': 'Guardar',
        'saving': 'Guardando...',
        'connection-error': 'Error de conexion',
        'required-fields-empty': 'Rellena los campos obligatorios (Referencia y Descripcion)',
        'family': 'Familia',
        'manufacturer': 'Fabricante',
        'tax': 'Impuesto',
        'vat-exception': 'Excepcion IVA',
        'loading': 'Cargando...',
        'purchase-account': 'Cuenta compras',
        'sales-account': 'Cuenta ventas',
        'no-results': 'Sin resultados',
        'parent-account': 'Cuenta padre',
        'subaccount-code': 'Codigo subcuenta',
        'next-available-code': 'Siguiente codigo disponible',
        'select-account': 'Seleccionar cuenta...'
    };

    return fallback[key] || key;
}

/**
 * Transforms a subaccount code with dot notation to a full code.
 * Example: "570.1" with longsubcuenta=10 becomes "5700000001"
 * @param {string} code - The code with dot notation (e.g., "570.1")
 * @param {number} longsubcuenta - The target length of the subaccount code
 * @returns {string} The transformed code
 */
function transformCodsubcuenta(code, longsubcuenta) {
    if (!code) return '';
    code = code.trim();
    if (code.indexOf('.') === -1) return code;

    longsubcuenta = longsubcuenta || 10;
    const parts = code.split('.');

    if (parts.length !== 2) return code;

    const prefix = parts[0];
    const suffix = parts[1];
    const paddingLength = longsubcuenta - prefix.length - suffix.length;

    if (paddingLength < 0) return code;

    return prefix.padEnd(longsubcuenta - suffix.length, '0') + suffix;
}

/**
 * Adds the "Create product" option to autocomplete results.
 * @param {Array} results - The current autocomplete results
 * @param {string} searchTerm - The current search term
 * @returns {Array} Results with the create option appended
 */
function addCreateProductOption(results, searchTerm) {
    results = results || [];
    let label = `+ ${trans('quick-create-product')}`;
    if (searchTerm && searchTerm.trim()) {
        label += `: ${searchTerm.trim()}`;
    }
    results.push({
        key: '__quick_create__',
        value: label
    });
    return results;
}

module.exports = {
    escapeHtml,
    trans,
    transformCodsubcuenta,
    addCreateProductOption
};
