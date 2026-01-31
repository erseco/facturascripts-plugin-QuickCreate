/**
 * This file is part of QuickCreate plugin for FacturaScripts.
 * Copyright (C) 2025 Ernesto Serrano <info@ernesto.es>
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Lesser General Public License as
 * published by the Free Software Foundation, either version 3 of the
 * License, or (at your option) any later version.
 */

(function () {
    'use strict';

    console.log('[QuickCreate] Script loaded');

    const QuickCreate = {
        permissions: null,
        productModal: null,
        accountModal: null,
        currentTargetField: null,
        buttonInjected: false,
        productOptions: null,

        init: function () {
            console.log('[QuickCreate] Initializing...');

            // Auto-detect context from page elements
            // Check for Sales/Purchases controllers (have findProductModal or product line inputs)
            const hasProductContext = document.querySelector('#findProductModal') !== null ||
                document.querySelector('input[name="referencia"]') !== null ||
                document.querySelector('.btn-product') !== null ||
                window.location.pathname.includes('Edit') &&
                (window.location.pathname.includes('Presupuesto') ||
                 window.location.pathname.includes('Pedido') ||
                 window.location.pathname.includes('Albaran') ||
                 window.location.pathname.includes('Factura'));

            // Check for accounting context (EditAsiento with subcuenta fields)
            const hasAccountContext = window.location.pathname.includes('EditAsiento') &&
                document.querySelector('.widget-autocomplete input[data-source*="Subcuenta"]') !== null;

            console.log('[QuickCreate] Context detection - Product:', hasProductContext, 'Account:', hasAccountContext);

            if (!hasProductContext && !hasAccountContext) {
                console.log('[QuickCreate] No relevant context found, exiting');
                return;
            }

            // Create modals based on detected context
            if (hasProductContext) {
                console.log('[QuickCreate] Setting up product quick create...');
                this.createProductModal();
                this.startProductButtonInjection();
            }

            if (hasAccountContext) {
                console.log('[QuickCreate] Setting up account quick create...');
                this.createAccountModal();
                this.processAccountFields();
                this.observeDynamicContent();
            }
        },

        // Start polling and observing for the findProductModal
        startProductButtonInjection: function () {
            console.log('[QuickCreate] Starting product button injection...');

            // Try immediately
            this.injectProductButton();

            // Poll every 500ms for 30 seconds
            let attempts = 0;
            const maxAttempts = 60;
            const pollInterval = setInterval(() => {
                if (this.buttonInjected) {
                    clearInterval(pollInterval);
                    return;
                }
                attempts++;
                if (attempts >= maxAttempts) {
                    console.log('[QuickCreate] Stopped polling after', maxAttempts, 'attempts');
                    clearInterval(pollInterval);
                    return;
                }
                this.injectProductButton();
            }, 500);

            // Also observe DOM changes
            this.observeProductModal();
        },

        // Inject "Create Product" button into the findProductModal header
        injectProductButton: function () {
            if (this.buttonInjected) {
                return;
            }

            const findProductModal = document.getElementById('findProductModal');
            if (!findProductModal) {
                return; // Will be retried by polling
            }

            console.log('[QuickCreate] Found findProductModal');

            const modalHeader = findProductModal.querySelector('.modal-header');
            if (!modalHeader) {
                console.log('[QuickCreate] No modal-header found');
                return;
            }

            // Check if already injected
            if (modalHeader.querySelector('.quick-create-product-btn')) {
                console.log('[QuickCreate] Button already exists');
                this.buttonInjected = true;
                return;
            }

            console.log('[QuickCreate] Injecting button...');

            const button = document.createElement('button');
            button.type = 'button';
            button.className = 'btn btn-success quick-create-product-btn ms-auto me-2';
            button.innerHTML = '<i class="fas fa-plus me-1"></i>' + this.trans('quick-create-product');
            button.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                console.log('[QuickCreate] Button clicked');
                // Hide findProductModal and show our creation modal
                const bsModal = bootstrap.Modal.getInstance(findProductModal);
                if (bsModal) {
                    bsModal.hide();
                }
                this.productModal.show();
            });

            // Insert before the close button
            const closeBtn = modalHeader.querySelector('.btn-close');
            if (closeBtn) {
                modalHeader.insertBefore(button, closeBtn);
            } else {
                modalHeader.appendChild(button);
            }

            this.buttonInjected = true;
            console.log('[QuickCreate] Button injected successfully!');
        },

        // Observe for findProductModal being added to DOM
        observeProductModal: function () {
            const observer = new MutationObserver((mutations) => {
                if (this.buttonInjected) return;

                for (const mutation of mutations) {
                    // Check added nodes
                    for (const node of mutation.addedNodes) {
                        if (node.nodeType === Node.ELEMENT_NODE) {
                            if (node.id === 'findProductModal' ||
                                (node.querySelector && node.querySelector('#findProductModal'))) {
                                console.log('[QuickCreate] Modal detected via MutationObserver');
                                this.injectProductButton();
                                return;
                            }
                        }
                    }

                    // Also check if the target itself is the modal
                    if (mutation.target.id === 'findProductModal') {
                        console.log('[QuickCreate] Modal target detected');
                        this.injectProductButton();
                        return;
                    }
                }
            });

            observer.observe(document.body, {
                childList: true,
                subtree: true,
                attributes: true,
                attributeFilter: ['class', 'style']
            });
        },

        // Process account (subcuenta) autocomplete fields
        processAccountFields: function () {
            document.querySelectorAll('.widget-autocomplete').forEach((wrapper) => {
                this.processAccountField(wrapper);
            });
        },

        processAccountField: function (wrapper) {
            // Skip if already processed
            if (wrapper.dataset.quickCreateProcessed) {
                return;
            }

            const input = wrapper.querySelector('input[data-source]');
            if (!input) {
                return;
            }

            const source = input.dataset.source;

            // Only process subcuenta fields
            if (!source || !source.includes('Subcuenta')) {
                return;
            }

            this.injectAccountButton(wrapper, input);
            wrapper.dataset.quickCreateProcessed = 'true';
        },

        injectAccountButton: function (wrapper, input) {
            const button = document.createElement('button');
            button.type = 'button';
            button.className = 'btn btn-outline-secondary quick-create-btn';
            button.innerHTML = '<i class="fas fa-plus"></i>';
            button.title = this.trans('quick-create-account');

            button.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                this.openAccountModal(input);
            });

            // Wrap input in input-group if not already
            const parentGroup = wrapper.querySelector('.input-group');
            if (parentGroup) {
                parentGroup.appendChild(button);
            } else {
                const inputGroup = document.createElement('div');
                inputGroup.className = 'input-group';
                input.parentNode.insertBefore(inputGroup, input);
                inputGroup.appendChild(input);
                inputGroup.appendChild(button);
            }
        },

        loadProductOptions: function () {
            return new Promise((resolve, reject) => {
                // Return cached options if available
                if (this.productOptions !== null) {
                    resolve(this.productOptions);
                    return;
                }

                fetch(window.location.pathname.replace(/\/[^/]*$/, '/QuickCreateAction') + '?action=get-product-options')
                    .then(response => response.json())
                    .then(data => {
                        if (data.ok) {
                            this.productOptions = data.data;
                            resolve(this.productOptions);
                        } else {
                            reject(data.message);
                        }
                    })
                    .catch(error => {
                        console.error('[QuickCreate] Error loading product options:', error);
                        reject(error);
                    });
            });
        },

        buildSelectHtml: function (id, name, label, options, defaultValue) {
            let optionsHtml = '<option value=""></option>';
            options.forEach(opt => {
                const selected = opt.value === defaultValue ? ' selected' : '';
                optionsHtml += `<option value="${opt.value}"${selected}>${opt.label}</option>`;
            });

            return `
                <div class="mb-3">
                    <label for="${id}" class="form-label">${label}</label>
                    <select class="form-select" id="${id}" name="${name}">
                        ${optionsHtml}
                    </select>
                </div>
            `;
        },

        renderProductDynamicFields: function () {
            const container = document.getElementById('quickCreateProductDynamicFields');
            if (!container) return;

            if (this.productOptions === null) {
                container.innerHTML = `<div class="text-center text-muted"><i class="fas fa-spinner fa-spin me-1"></i>${this.trans('loading')}</div>`;
                return;
            }

            let html = '';
            html += this.buildSelectHtml('quickCreateProductFamily', 'codfamilia', this.trans('family'), this.productOptions.familias, '');
            html += this.buildSelectHtml('quickCreateProductManufacturer', 'codfabricante', this.trans('manufacturer'), this.productOptions.fabricantes, '');
            html += this.buildSelectHtml('quickCreateProductTax', 'codimpuesto', this.trans('tax'), this.productOptions.impuestos, this.productOptions.defaultTax);
            html += this.buildSelectHtml('quickCreateProductVatException', 'excepcioniva', this.trans('vat-exception'), this.productOptions.excepciones, '');

            container.innerHTML = html;
        },

        createProductModal: function () {
            const modalHtml = `
                <div class="modal fade" id="quickCreateProductModal" tabindex="-1" aria-labelledby="quickCreateProductModalLabel" aria-hidden="true">
                    <div class="modal-dialog">
                        <div class="modal-content">
                            <div class="modal-header">
                                <h5 class="modal-title" id="quickCreateProductModalLabel">
                                    <i class="fas fa-plus-circle me-2"></i>${this.trans('quick-create-product')}
                                </h5>
                                <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                            </div>
                            <div class="modal-body">
                                <div class="alert alert-danger d-none" id="quickCreateProductError"></div>
                                <form id="quickCreateProductForm">
                                    <div class="mb-3">
                                        <label for="quickCreateProductRef" class="form-label">${this.trans('reference')} *</label>
                                        <input type="text" class="form-control" id="quickCreateProductRef" name="referencia" required>
                                    </div>
                                    <div class="mb-3">
                                        <label for="quickCreateProductDesc" class="form-label">${this.trans('description')} *</label>
                                        <textarea class="form-control" id="quickCreateProductDesc" name="descripcion" rows="2" required></textarea>
                                    </div>
                                    <div class="mb-3">
                                        <label for="quickCreateProductPrice" class="form-label">${this.trans('price')}</label>
                                        <input type="number" step="0.01" class="form-control" id="quickCreateProductPrice" name="precio" value="0">
                                    </div>
                                    <div id="quickCreateProductDynamicFields"></div>
                                </form>
                            </div>
                            <div class="modal-footer">
                                <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">${this.trans('cancel')}</button>
                                <button type="button" class="btn btn-primary" id="quickCreateProductSubmit">
                                    <i class="fas fa-save me-1"></i>${this.trans('save')}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            `;

            document.body.insertAdjacentHTML('beforeend', modalHtml);

            const modalEl = document.getElementById('quickCreateProductModal');
            this.productModal = new bootstrap.Modal(modalEl);

            document.getElementById('quickCreateProductSubmit').addEventListener('click', () => {
                this.submitProductForm();
            });

            // Load product options when modal opens
            modalEl.addEventListener('show.bs.modal', () => {
                this.loadProductOptions()
                    .then(() => {
                        this.renderProductDynamicFields();
                    })
                    .catch(error => {
                        console.error('[QuickCreate] Failed to load product options:', error);
                    });
            });

            // Reset form on modal close
            modalEl.addEventListener('hidden.bs.modal', () => {
                document.getElementById('quickCreateProductForm').reset();
                document.getElementById('quickCreateProductError').classList.add('d-none');
                // Re-render dynamic fields to reset select defaults
                if (this.productOptions !== null) {
                    this.renderProductDynamicFields();
                }
            });
        },

        createAccountModal: function () {
            const modalHtml = `
                <div class="modal fade" id="quickCreateAccountModal" tabindex="-1" aria-labelledby="quickCreateAccountModalLabel" aria-hidden="true">
                    <div class="modal-dialog">
                        <div class="modal-content">
                            <div class="modal-header">
                                <h5 class="modal-title" id="quickCreateAccountModalLabel">
                                    <i class="fas fa-plus-circle me-2"></i>${this.trans('quick-create-account')}
                                </h5>
                                <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                            </div>
                            <div class="modal-body">
                                <div class="alert alert-danger d-none" id="quickCreateAccountError"></div>
                                <form id="quickCreateAccountForm">
                                    <div class="mb-3">
                                        <label for="quickCreateAccountCode" class="form-label">${this.trans('account-code')} *</label>
                                        <input type="text" class="form-control" id="quickCreateAccountCode" name="codsubcuenta" required>
                                        <div class="form-text">${this.trans('account-code-hint')}</div>
                                    </div>
                                    <div class="mb-3">
                                        <label for="quickCreateAccountDesc" class="form-label">${this.trans('description')}</label>
                                        <input type="text" class="form-control" id="quickCreateAccountDesc" name="descripcion">
                                    </div>
                                    <input type="hidden" id="quickCreateAccountExercise" name="codejercicio">
                                </form>
                            </div>
                            <div class="modal-footer">
                                <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">${this.trans('cancel')}</button>
                                <button type="button" class="btn btn-primary" id="quickCreateAccountSubmit">
                                    <i class="fas fa-save me-1"></i>${this.trans('save')}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            `;

            document.body.insertAdjacentHTML('beforeend', modalHtml);

            const modalEl = document.getElementById('quickCreateAccountModal');
            this.accountModal = new bootstrap.Modal(modalEl);

            document.getElementById('quickCreateAccountSubmit').addEventListener('click', () => {
                this.submitAccountForm();
            });

            // Reset form on modal close
            modalEl.addEventListener('hidden.bs.modal', () => {
                document.getElementById('quickCreateAccountForm').reset();
                document.getElementById('quickCreateAccountError').classList.add('d-none');
            });
        },

        openAccountModal: function (targetInput) {
            this.currentTargetField = targetInput;

            // Get exercise code from form
            const exerciseInput = document.querySelector('input[name="codejercicio"], select[name="codejercicio"]');
            if (exerciseInput) {
                document.getElementById('quickCreateAccountExercise').value = exerciseInput.value;
            }

            // Pre-fill code if input has value
            const currentValue = targetInput.value;
            if (currentValue && !currentValue.includes('|')) {
                document.getElementById('quickCreateAccountCode').value = currentValue;
            }

            this.accountModal.show();
        },

        submitProductForm: function () {
            const form = document.getElementById('quickCreateProductForm');
            const errorDiv = document.getElementById('quickCreateProductError');
            const submitBtn = document.getElementById('quickCreateProductSubmit');

            // Manual validation for required fields
            const referencia = form.querySelector('[name="referencia"]').value.trim();
            const descripcion = form.querySelector('[name="descripcion"]').value.trim();

            if (!referencia || !descripcion) {
                errorDiv.textContent = this.trans('required-fields-empty');
                errorDiv.classList.remove('d-none');
                return;
            }

            // Hide previous errors
            errorDiv.classList.add('d-none');

            const formData = new FormData(form);

            // Disable button
            submitBtn.disabled = true;
            submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin me-1"></i>' + this.trans('saving');

            fetch(window.location.pathname.replace(/\/[^/]*$/, '/QuickCreateAction') + '?action=create-product', {
                method: 'POST',
                body: formData
            })
                .then(response => response.json())
                .then(data => {
                    if (data.ok) {
                        this.productModal.hide();
                        this.showNotification('success', data.message);

                        // Add the new product to the document using FacturaScripts's function
                        if (typeof purchasesFormAction === 'function') {
                            purchasesFormAction('add-product', data.data.referencia);
                        } else if (typeof salesFormAction === 'function') {
                            salesFormAction('add-product', data.data.referencia);
                        }
                    } else {
                        errorDiv.textContent = data.message;
                        errorDiv.classList.remove('d-none');
                    }
                })
                .catch(error => {
                    console.error('[QuickCreate] Error:', error);
                    errorDiv.textContent = this.trans('connection-error');
                    errorDiv.classList.remove('d-none');
                })
                .finally(() => {
                    submitBtn.disabled = false;
                    submitBtn.innerHTML = '<i class="fas fa-save me-1"></i>' + this.trans('save');
                });
        },

        submitAccountForm: function () {
            const form = document.getElementById('quickCreateAccountForm');
            const errorDiv = document.getElementById('quickCreateAccountError');
            const submitBtn = document.getElementById('quickCreateAccountSubmit');

            // Validate form using HTML5 validation
            if (!form.reportValidity()) {
                return;
            }

            const formData = new FormData(form);

            // Disable button
            submitBtn.disabled = true;
            submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin me-1"></i>' + this.trans('saving');

            fetch(window.location.pathname.replace(/\/[^/]*$/, '/QuickCreateAction') + '?action=create-account', {
                method: 'POST',
                body: formData
            })
                .then(response => response.json())
                .then(data => {
                    if (data.ok) {
                        this.updateAutocompleteField(this.currentTargetField, data.data.codsubcuenta, data.data.descripcion);
                        this.accountModal.hide();
                        this.showNotification('success', data.message);
                    } else {
                        errorDiv.textContent = data.message;
                        errorDiv.classList.remove('d-none');
                    }
                })
                .catch(error => {
                    console.error('[QuickCreate] Error:', error);
                    errorDiv.textContent = this.trans('connection-error');
                    errorDiv.classList.remove('d-none');
                })
                .finally(() => {
                    submitBtn.disabled = false;
                    submitBtn.innerHTML = '<i class="fas fa-save me-1"></i>' + this.trans('save');
                });
        },

        updateAutocompleteField: function (input, value, description) {
            if (!input) return;

            // Set value in autocomplete format: "value | description"
            input.value = value + ' | ' + (description || '');

            // Trigger change event for any listeners
            const event = new Event('change', { bubbles: true });
            input.dispatchEvent(event);

            // Also trigger input event
            const inputEvent = new Event('input', { bubbles: true });
            input.dispatchEvent(inputEvent);
        },

        observeDynamicContent: function () {
            const observer = new MutationObserver((mutations) => {
                mutations.forEach((mutation) => {
                    mutation.addedNodes.forEach((node) => {
                        if (node.nodeType === Node.ELEMENT_NODE) {
                            // Check if the added node contains autocomplete fields
                            const fields = node.querySelectorAll ? node.querySelectorAll('.widget-autocomplete') : [];
                            fields.forEach((wrapper) => {
                                this.processAccountField(wrapper);
                            });

                            // Also check if the node itself is a wrapper
                            if (node.classList && node.classList.contains('widget-autocomplete')) {
                                this.processAccountField(node);
                            }
                        }
                    });
                });
            });

            observer.observe(document.body, {
                childList: true,
                subtree: true
            });
        },

        showNotification: function (type, message) {
            // Use FacturaScripts toast if available
            if (typeof showMessages === 'function') {
                showMessages([{ type: type, message: message }]);
            } else {
                console.log('[QuickCreate]', type, message);
            }
        },

        trans: function (key) {
            // Use FacturaScripts i18n if available
            if (window.i18n && typeof window.i18n.trans === 'function') {
                return window.i18n.trans(key);
            }

            // Fallback translations
            const fallback = {
                'quick-create-product': 'Crear producto',
                'quick-create-account': 'Crear subcuenta',
                'reference': 'Referencia',
                'description': 'Descripción',
                'price': 'Precio',
                'account-code': 'Código subcuenta',
                'account-code-hint': 'Introduce el código completo de la subcuenta',
                'cancel': 'Cancelar',
                'save': 'Guardar',
                'saving': 'Guardando...',
                'connection-error': 'Error de conexión',
                'required-fields-empty': 'Rellena los campos obligatorios (Referencia y Descripción)',
                'family': 'Familia',
                'manufacturer': 'Fabricante',
                'tax': 'Impuesto',
                'vat-exception': 'Excepción IVA',
                'loading': 'Cargando...'
            };

            return fallback[key] || key;
        }
    };

    // Initialize when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            QuickCreate.init();
        });
    } else {
        QuickCreate.init();
    }
})();
