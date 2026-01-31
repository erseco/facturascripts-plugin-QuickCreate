/**
 * This file is part of QuickCreate plugin for FacturaScripts.
 * Copyright (C) 2026 Ernesto Serrano <info@ernesto.es>
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
        subcuentaModal: null,
        currentTargetField: null,
        currentSubcuentaField: null,
        buttonInjected: false,
        productOptions: null,
        exerciseInfo: null,
        subcuentaSearchTimeout: null,
        pendingProductReference: null,
        findSubaccountModalEnhanced: false,
        currentSubaccountLineInput: null,

        init: function () {
            console.log('[QuickCreate] Initializing...');

            // Inject CSS styles
            this.injectStyles();

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

            // Check for accounting context (EditAsiento with findSubaccountModal)
            const hasAccountContext = window.location.pathname.includes('EditAsiento') &&
                (document.getElementById('findSubaccountModal') !== null ||
                 document.querySelector('.widget-autocomplete input[data-source*="Subcuenta"]') !== null);

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
                this.enhanceFindSubaccountModal();
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

            // Enhance autocomplete when ready
            this.waitForAutocomplete();
        },

        // Wait for autocomplete to be initialized, then enhance it
        waitForAutocomplete: function () {
            const self = this;

            // Attach modal listener if modal exists
            this.attachModalListener();

            // Also observe DOM for modal being added later
            const observer = new MutationObserver((mutations) => {
                for (const mutation of mutations) {
                    for (const node of mutation.addedNodes) {
                        if (node.nodeType === Node.ELEMENT_NODE) {
                            if (node.id === 'findProductModal' ||
                                (node.querySelector && node.querySelector('#findProductModal'))) {
                                console.log('[QuickCreate] findProductModal added to DOM');
                                self.attachModalListener();
                            }
                        }
                    }
                }
            });

            observer.observe(document.body, {
                childList: true,
                subtree: true
            });

            // Continuous polling to detect autocomplete reinitializations (AJAX reloads)
            // This runs indefinitely because the autocomplete can be recreated at any time
            setInterval(() => {
                const input = $('#findProductInput');
                if (input.length && input.data('ui-autocomplete')) {
                    const autocomplete = input.autocomplete('instance');
                    if (autocomplete && !autocomplete._quickCreateEnhanced) {
                        console.log('[QuickCreate] Autocomplete needs enhancement, applying...');
                        self.enhanceProductAutocomplete();
                    }
                }
            }, 500);
        },

        // Attach listener to findProductModal for shown event
        attachModalListener: function () {
            const self = this;
            const findProductModal = document.getElementById('findProductModal');

            if (!findProductModal) {
                return;
            }

            // Avoid attaching multiple listeners
            if (findProductModal._quickCreateListenerAttached) {
                return;
            }
            findProductModal._quickCreateListenerAttached = true;

            findProductModal.addEventListener('shown.bs.modal', function () {
                console.log('[QuickCreate] findProductModal shown, waiting for autocomplete...');
                // Poll until autocomplete is ready (max 2 seconds)
                let modalAttempts = 0;
                const modalCheckInterval = setInterval(() => {
                    const input = $('#findProductInput');
                    if (input.length && input.data('ui-autocomplete')) {
                        clearInterval(modalCheckInterval);
                        self.enhanceProductAutocomplete();
                    }
                    modalAttempts++;
                    if (modalAttempts >= 20) {
                        clearInterval(modalCheckInterval);
                        console.log('[QuickCreate] Autocomplete not ready after modal show');
                    }
                }, 100);
            });

            console.log('[QuickCreate] Modal listener attached');
        },

        // Enhance product autocomplete to add "Create product" option when no results
        enhanceProductAutocomplete: function () {
            const self = this;
            const input = $('#findProductInput');

            if (!input.length || !input.data('ui-autocomplete')) {
                console.log('[QuickCreate] Autocomplete not available');
                return;
            }

            const autocomplete = input.autocomplete('instance');

            // Check if already enhanced to avoid multiple wrapping
            if (autocomplete._quickCreateEnhanced) {
                console.log('[QuickCreate] Autocomplete already enhanced');
                return;
            }
            autocomplete._quickCreateEnhanced = true;

            const originalSource = autocomplete.options.source;

            // Intercept the data source
            autocomplete.option('source', function (request, response) {
                const searchTerm = request.term || '';
                // Handle both function and URL source types
                if (typeof originalSource === 'function') {
                    originalSource(request, function (results) {
                        results = self.addCreateProductOption(results, searchTerm);
                        response(results);
                    });
                } else if (typeof originalSource === 'string') {
                    // URL-based source
                    $.ajax({
                        url: originalSource,
                        data: request,
                        dataType: 'json',
                        success: function (data) {
                            data = self.addCreateProductOption(data, searchTerm);
                            response(data);
                        },
                        error: function () {
                            response([]);
                        }
                    });
                }
            });

            // Intercept selection
            const originalSelect = autocomplete.options.select;
            autocomplete.option('select', function (event, ui) {
                if (ui.item.key === '__quick_create__') {
                    event.preventDefault();
                    // Store the search text to pre-fill the reference field
                    self.pendingProductReference = input.val().trim();
                    input.val('');
                    // Close the autocomplete dropdown
                    input.autocomplete('close');
                    // Show create product modal
                    self.productModal.show();
                    return false;
                }
                if (originalSelect) {
                    return originalSelect.call(this, event, ui);
                }
            });

            console.log('[QuickCreate] Autocomplete enhanced successfully');
        },

        // Add "Create product" option to autocomplete results - always show it
        addCreateProductOption: function (results, searchTerm) {
            // Always add the quick create option at the end
            // Show the search term so user knows what reference will be used
            let label = '+ ' + this.trans('quick-create-product');
            if (searchTerm && searchTerm.trim()) {
                label += ': ' + searchTerm.trim();
            }
            results.push({
                key: '__quick_create__',
                value: label
            });
            return results;
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
                // Store the search text to pre-fill the reference field
                // Try both possible input IDs (productModalInput for the modal table search, findProductInput for autocomplete)
                const searchInput = document.getElementById('productModalInput') || document.getElementById('findProductInput');
                if (searchInput && searchInput.value.trim()) {
                    this.pendingProductReference = searchInput.value.trim();
                }
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

        buildSelect2Html: function (id, name, label, options, colClass, defaultValue) {
            let optionsHtml = '<option value="">------</option>';
            options.forEach(opt => {
                const selected = opt.value === defaultValue ? ' selected' : '';
                optionsHtml += `<option value="${this.escapeHtml(opt.value)}"${selected}>${this.escapeHtml(opt.label)}</option>`;
            });

            const wrapperClass = colClass ? colClass : 'mb-3';
            return `
                <div class="${wrapperClass}">
                    <label for="${id}" class="form-label">${label}</label>
                    <select class="form-select select2" id="${id}" name="${name}">
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

            // Row 1: Familia + Fabricante (Select2)
            html += '<div class="row mb-2">';
            html += this.buildSelect2Html('quickCreateProductFamily', 'codfamilia', this.trans('family'), this.productOptions.familias, 'col-6');
            html += this.buildSelect2Html('quickCreateProductManufacturer', 'codfabricante', this.trans('manufacturer'), this.productOptions.fabricantes, 'col-6');
            html += '</div>';

            // Row 2: Impuesto + Excepción IVA (Select2)
            html += '<div class="row mb-2">';
            html += this.buildSelect2Html('quickCreateProductTax', 'codimpuesto', this.trans('tax'), this.productOptions.impuestos, 'col-6', this.productOptions.defaultTax);
            html += this.buildSelect2Html('quickCreateProductVatException', 'excepcioniva', this.trans('vat-exception'), this.productOptions.excepciones, 'col-6');
            html += '</div>';

            // Row 3: Cuenta compras + Cuenta ventas (Autocomplete with create button)
            html += '<div class="row mb-2">';
            html += this.buildSubcuentaInputHtml('quickCreateProductPurchaseAccount', 'codsubcuentacom', this.trans('purchase-account'), 'col-6');
            html += this.buildSubcuentaInputHtml('quickCreateProductSalesAccount', 'codsubcuentaven', this.trans('sales-account'), 'col-6');
            html += '</div>';

            container.innerHTML = html;

            // Initialize Select2 on the new selects
            $(container).find('select.select2').select2({
                width: '100%',
                theme: 'bootstrap-5',
                dropdownParent: $('#quickCreateProductModal')
            });

            // Initialize subcuenta autocomplete
            this.initSubcuentaAutocomplete('quickCreateProductPurchaseAccount');
            this.initSubcuentaAutocomplete('quickCreateProductSalesAccount');
        },

        buildSubcuentaInputHtml: function (id, name, label, colClass) {
            const wrapperClass = colClass ? colClass : 'mb-3';
            return `
                <div class="${wrapperClass}">
                    <label for="${id}" class="form-label">${label}</label>
                    <div class="position-relative">
                        <div class="input-group">
                            <input type="text" class="form-control subcuenta-autocomplete" id="${id}" name="${name}" autocomplete="off">
                            <button type="button" class="btn btn-outline-secondary subcuenta-create-btn" data-target="${id}" title="${this.trans('create-subcuenta')}">
                                <i class="fas fa-plus"></i>
                            </button>
                        </div>
                        <div class="subcuenta-dropdown d-none" id="${id}Dropdown"></div>
                    </div>
                </div>
            `;
        },

        initSubcuentaAutocomplete: function (inputId) {
            const self = this;
            const input = document.getElementById(inputId);
            const dropdown = document.getElementById(inputId + 'Dropdown');
            const createBtn = document.querySelector(`[data-target="${inputId}"]`);

            if (!input || !dropdown) return;

            // Handle input with debounce
            input.addEventListener('input', function () {
                clearTimeout(self.subcuentaSearchTimeout);
                const query = this.value.trim();

                if (query.length < 2) {
                    dropdown.classList.add('d-none');
                    return;
                }

                self.subcuentaSearchTimeout = setTimeout(() => {
                    self.searchSubcuenta(query, dropdown, input);
                }, 400);
            });

            // Transform dot notation on blur
            input.addEventListener('blur', function () {
                const value = this.value.trim();
                if (value && value.indexOf('.') !== -1) {
                    this.value = self.transformCodsubcuenta(value);
                }
                // Hide dropdown after a short delay (allow click on dropdown items)
                setTimeout(() => {
                    dropdown.classList.add('d-none');
                }, 200);
            });

            // Focus shows dropdown if there are results
            input.addEventListener('focus', function () {
                if (dropdown.children.length > 0) {
                    dropdown.classList.remove('d-none');
                }
            });

            // Create button click
            if (createBtn) {
                createBtn.addEventListener('click', function (e) {
                    e.preventDefault();
                    e.stopPropagation();
                    self.currentSubcuentaField = input;
                    self.openSubcuentaModal(input.value.trim());
                });
            }
        },

        transformCodsubcuenta: function (code) {
            if (!code || code.indexOf('.') === -1) return code.trim();
            const longsubcuenta = this.exerciseInfo?.longsubcuenta || 10;
            const parts = code.trim().split('.');
            if (parts.length === 2) {
                const paddingLength = longsubcuenta - parts[1].length;
                return parts[0].padEnd(paddingLength, '0') + parts[1];
            }
            return code.trim();
        },

        searchSubcuenta: function (query, dropdown, input) {
            const self = this;

            fetch(this.getApiUrl() + '?action=search-subcuenta&query=' + encodeURIComponent(query))
                .then(response => response.json())
                .then(data => {
                    if (!data.ok) {
                        dropdown.classList.add('d-none');
                        return;
                    }

                    // Store exercise info
                    if (data.longsubcuenta) {
                        self.exerciseInfo = {
                            codejercicio: data.codejercicio,
                            longsubcuenta: data.longsubcuenta
                        };
                    }

                    let html = '';

                    if (data.data.length === 0) {
                        html += `<div class="subcuenta-option text-muted">${self.trans('no-results')}</div>`;
                    } else {
                        data.data.forEach(item => {
                            html += `<div class="subcuenta-option" data-code="${self.escapeHtml(item.codsubcuenta)}">
                                <strong>${self.escapeHtml(item.codsubcuenta)}</strong> - ${self.escapeHtml(item.descripcion)}
                            </div>`;
                        });
                    }

                    // Add create option with suggested code
                    if (data.suggestedCode) {
                        html += `<div class="subcuenta-option subcuenta-create-option" data-action="create" data-suggested="${self.escapeHtml(data.suggestedCode)}">
                            <i class="fas fa-plus me-1"></i>${self.trans('create-subcuenta')} <strong>${self.escapeHtml(data.suggestedCode)}</strong>
                        </div>`;
                    } else {
                        html += `<div class="subcuenta-option subcuenta-create-option" data-action="create">
                            <i class="fas fa-plus me-1"></i>${self.trans('create-subcuenta')}
                        </div>`;
                    }

                    dropdown.innerHTML = html;
                    dropdown.classList.remove('d-none');

                    // Attach click handlers
                    dropdown.querySelectorAll('.subcuenta-option').forEach(option => {
                        option.addEventListener('mousedown', function (e) {
                            e.preventDefault(); // Prevent blur
                            if (this.dataset.action === 'create') {
                                self.currentSubcuentaField = input;
                                self.openSubcuentaModal(query, this.dataset.suggested);
                                dropdown.classList.add('d-none');
                            } else if (this.dataset.code) {
                                input.value = this.dataset.code;
                                dropdown.classList.add('d-none');
                            }
                        });
                    });
                })
                .catch(error => {
                    console.error('[QuickCreate] Error searching subcuenta:', error);
                    dropdown.classList.add('d-none');
                });
        },

        openSubcuentaModal: function (prefixQuery, suggestedCode) {
            const self = this;

            // Create modal if it doesn't exist
            if (!this.subcuentaModal) {
                this.createSubcuentaModal();
            }

            // Load cuentas based on prefix
            this.loadCuentasForModal(prefixQuery);

            // Set suggested code if provided
            const codeInput = document.getElementById('subcuentaCodigo');
            if (codeInput && suggestedCode) {
                codeInput.value = suggestedCode;
            } else if (codeInput) {
                codeInput.value = '';
            }

            // Clear description
            const descInput = document.getElementById('subcuentaDescripcion');
            if (descInput) {
                descInput.value = '';
            }

            this.subcuentaModal.show();
        },

        createSubcuentaModal: function () {
            const self = this;
            const modalHtml = `
                <div class="modal fade" id="quickCreateSubcuentaModal" tabindex="-1" aria-labelledby="quickCreateSubcuentaModalLabel" aria-hidden="true" style="z-index: 1070;">
                    <div class="modal-dialog">
                        <div class="modal-content">
                            <div class="modal-header">
                                <h5 class="modal-title" id="quickCreateSubcuentaModalLabel">
                                    <i class="fas fa-plus-circle me-2"></i>${this.trans('create-subcuenta')}
                                </h5>
                                <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                            </div>
                            <div class="modal-body">
                                <div class="alert alert-danger d-none" id="quickCreateSubcuentaError"></div>
                                <form id="quickCreateSubcuentaForm">
                                    <div class="mb-3">
                                        <label for="subcuentaCuentaPadre" class="form-label">${this.trans('parent-account')} *</label>
                                        <select class="form-select select2-subcuenta" id="subcuentaCuentaPadre" required>
                                            <option value="">${this.trans('select-account')}</option>
                                        </select>
                                    </div>
                                    <div class="mb-3">
                                        <label for="subcuentaCodigo" class="form-label">${this.trans('subaccount-code')}</label>
                                        <input type="text" class="form-control" id="subcuentaCodigo" readonly>
                                        <div class="form-text">${this.trans('next-available-code')}</div>
                                    </div>
                                    <div class="mb-3">
                                        <label for="subcuentaDescripcion" class="form-label">${this.trans('description')} *</label>
                                        <input type="text" class="form-control" id="subcuentaDescripcion" required>
                                    </div>
                                </form>
                            </div>
                            <div class="modal-footer">
                                <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">${this.trans('cancel')}</button>
                                <button type="button" class="btn btn-primary" id="subcuentaGuardar">
                                    <i class="fas fa-save me-1"></i>${this.trans('save')}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            `;

            document.body.insertAdjacentHTML('beforeend', modalHtml);

            const modalEl = document.getElementById('quickCreateSubcuentaModal');
            this.subcuentaModal = new bootstrap.Modal(modalEl);

            // Initialize Select2 on parent account select
            $('#subcuentaCuentaPadre').select2({
                width: '100%',
                theme: 'bootstrap-5',
                dropdownParent: $('#quickCreateSubcuentaModal')
            });

            // Handle parent account change (use Select2 change event)
            $('#subcuentaCuentaPadre').on('change', function () {
                self.onCuentaPadreChange(this.value);
            });

            // Handle save button
            document.getElementById('subcuentaGuardar').addEventListener('click', function () {
                self.submitSubcuentaForm();
            });

            // Reset form on modal close
            modalEl.addEventListener('hidden.bs.modal', function () {
                document.getElementById('quickCreateSubcuentaForm').reset();
                document.getElementById('quickCreateSubcuentaError').classList.add('d-none');
                // Reset Select2
                $('#subcuentaCuentaPadre').val('').trigger('change');
            });
        },

        loadCuentasForModal: function (prefixQuery) {
            const self = this;
            const $select = $('#subcuentaCuentaPadre');

            fetch(this.getApiUrl() + '?action=search-cuentas&query=' + encodeURIComponent(prefixQuery || ''))
                .then(response => response.json())
                .then(data => {
                    if (!data.ok) return;

                    let html = `<option value="">${self.trans('select-account')}</option>`;
                    data.data.forEach(cuenta => {
                        html += `<option value="${cuenta.idcuenta}">${self.escapeHtml(cuenta.codcuenta)} - ${self.escapeHtml(cuenta.descripcion)}</option>`;
                    });

                    $select.html(html);

                    // Auto-select if only one result
                    if (data.data.length === 1) {
                        $select.val(data.data[0].idcuenta).trigger('change');
                    }
                })
                .catch(error => {
                    console.error('[QuickCreate] Error loading cuentas:', error);
                });
        },

        onCuentaPadreChange: function (idcuenta) {
            const self = this;
            const codeInput = document.getElementById('subcuentaCodigo');

            if (!idcuenta) {
                codeInput.value = '';
                return;
            }

            fetch(this.getApiUrl() + '?action=get-next-subcuenta-code&idcuenta=' + encodeURIComponent(idcuenta))
                .then(response => response.json())
                .then(data => {
                    if (data.ok && data.data.codsubcuenta) {
                        codeInput.value = data.data.codsubcuenta;
                    }
                })
                .catch(error => {
                    console.error('[QuickCreate] Error getting next code:', error);
                });
        },

        submitSubcuentaForm: function () {
            const self = this;
            const form = document.getElementById('quickCreateSubcuentaForm');
            const errorDiv = document.getElementById('quickCreateSubcuentaError');
            const submitBtn = document.getElementById('subcuentaGuardar');

            const idcuenta = document.getElementById('subcuentaCuentaPadre').value;
            const codsubcuenta = document.getElementById('subcuentaCodigo').value;
            const descripcion = document.getElementById('subcuentaDescripcion').value.trim();

            // Validate
            if (!idcuenta || !codsubcuenta || !descripcion) {
                errorDiv.textContent = this.trans('required-fields-empty');
                errorDiv.classList.remove('d-none');
                return;
            }

            errorDiv.classList.add('d-none');
            submitBtn.disabled = true;
            submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin me-1"></i>' + this.trans('saving');

            const formData = new FormData();
            formData.append('idcuenta', idcuenta);
            formData.append('codsubcuenta', codsubcuenta);
            formData.append('descripcion', descripcion);

            fetch(this.getApiUrl() + '?action=create-subcuenta', {
                method: 'POST',
                body: formData
            })
                .then(response => response.json())
                .then(data => {
                    if (data.ok) {
                        // Fill the target field with the new code
                        if (self.currentSubcuentaField) {
                            self.currentSubcuentaField.value = data.data.codsubcuenta;
                        }
                        self.subcuentaModal.hide();
                        self.showNotification('success', data.message);
                    } else {
                        errorDiv.textContent = data.message;
                        errorDiv.classList.remove('d-none');
                    }
                })
                .catch(error => {
                    console.error('[QuickCreate] Error:', error);
                    errorDiv.textContent = self.trans('connection-error');
                    errorDiv.classList.remove('d-none');
                })
                .finally(() => {
                    submitBtn.disabled = false;
                    submitBtn.innerHTML = '<i class="fas fa-save me-1"></i>' + self.trans('save');
                });
        },

        getApiUrl: function () {
            return window.location.pathname.replace(/\/[^/]*$/, '/QuickCreateAction');
        },

        escapeHtml: function (text) {
            if (!text) return '';
            const div = document.createElement('div');
            div.textContent = text;
            return div.innerHTML;
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
                                    <div class="row mb-3">
                                        <div class="col-9">
                                            <label for="quickCreateProductRef" class="form-label">${this.trans('reference')} *</label>
                                            <input type="text" class="form-control" id="quickCreateProductRef" name="referencia" required>
                                        </div>
                                        <div class="col-3">
                                            <label for="quickCreateProductPrice" class="form-label">${this.trans('price')}</label>
                                            <input type="number" step="0.01" class="form-control" id="quickCreateProductPrice" name="precio" value="0">
                                        </div>
                                    </div>
                                    <div class="mb-3">
                                        <label for="quickCreateProductDesc" class="form-label">${this.trans('description')} *</label>
                                        <textarea class="form-control" id="quickCreateProductDesc" name="descripcion" rows="2" required></textarea>
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

            // Focus reference field when modal is shown, pre-fill with search text
            modalEl.addEventListener('shown.bs.modal', () => {
                const refInput = document.getElementById('quickCreateProductRef');
                // Pre-fill with pending reference from search
                if (this.pendingProductReference) {
                    refInput.value = this.pendingProductReference;
                    this.pendingProductReference = null;
                }
                // Focus and select all text so user can easily replace it
                refInput.focus();
                refInput.select();
            });

            // Reset form on modal close
            modalEl.addEventListener('hidden.bs.modal', () => {
                document.getElementById('quickCreateProductForm').reset();
                document.getElementById('quickCreateProductError').classList.add('d-none');
                // Reset Select2 fields
                $(modalEl).find('select.select2').val('').trigger('change');
                // Clear pending reference
                this.pendingProductReference = null;
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

        // Enhance the findSubaccountModal with account filter and quick create option
        enhanceFindSubaccountModal: function () {
            const self = this;
            const modal = document.getElementById('findSubaccountModal');

            if (!modal) {
                console.log('[QuickCreate] findSubaccountModal not found');
                return;
            }

            // Listen for modal show event
            modal.addEventListener('shown.bs.modal', function () {
                if (self.findSubaccountModalEnhanced) {
                    // Just refresh the cuenta selector each time modal opens
                    self.loadCuentasForSelector();
                    return;
                }

                console.log('[QuickCreate] Enhancing findSubaccountModal...');
                self.injectCuentaSelector();
                self.findSubaccountModalEnhanced = true;
            });

            // Track which input triggered the modal
            document.addEventListener('click', function (e) {
                // Check if click was on a book button that opens findSubaccountModal
                // The button can use data-bs-target OR onclick with jQuery
                const bookBtn = e.target.closest('[data-bs-target="#findSubaccountModal"]') ||
                                e.target.closest('button[onclick*="findSubaccountModal"]') ||
                                e.target.closest('.btn-info');
                if (bookBtn) {
                    // Find the associated input field (in the same row or nearby)
                    const row = bookBtn.closest('tr');
                    if (row) {
                        // Try different input name patterns
                        const input = row.querySelector('input[name*="codsubcuenta"]') ||
                                      row.querySelector('input[name="new_subaccount"]') ||
                                      row.querySelector('input[placeholder="Subcuenta"]');
                        if (input) {
                            self.currentSubaccountLineInput = input;
                            console.log('[QuickCreate] Tracked subcuenta input:', input.name);
                        }
                    }
                }
            });

            console.log('[QuickCreate] findSubaccountModal enhancement prepared');
        },

        // Inject the cuenta filter dropdown into the modal
        injectCuentaSelector: function () {
            const modal = document.getElementById('findSubaccountModal');
            if (!modal) return;

            const modalBody = modal.querySelector('.modal-body');
            if (!modalBody) return;

            // Find the search input container
            const searchForm = modalBody.querySelector('form, .row');
            if (!searchForm) return;

            // Check if already injected
            if (modal.querySelector('#quickCreateCuentaFilter')) return;

            // Create the filter container
            const filterContainer = document.createElement('div');
            filterContainer.className = 'row mb-3';
            filterContainer.id = 'quickCreateCuentaFilterContainer';
            filterContainer.innerHTML = `
                <div class="col-12">
                    <label for="quickCreateCuentaFilter" class="form-label">${this.trans('filter-by-account')}</label>
                    <select class="form-select" id="quickCreateCuentaFilter">
                        <option value="">${this.trans('all-accounts')}</option>
                    </select>
                </div>
            `;

            // Insert at the beginning of modal body
            modalBody.insertBefore(filterContainer, modalBody.firstChild);

            // Load cuentas into selector
            this.loadCuentasForSelector();

            // Handle cuenta selection change
            const self = this;
            document.getElementById('quickCreateCuentaFilter').addEventListener('change', function () {
                self.onCuentaFilterChange(this.value);
            });

            console.log('[QuickCreate] Cuenta selector injected');
        },

        // Load cuentas for the filter dropdown
        loadCuentasForSelector: function () {
            const self = this;
            const select = document.getElementById('quickCreateCuentaFilter');
            if (!select) return;

            fetch(this.getApiUrl() + '?action=search-cuentas&query=')
                .then(response => response.json())
                .then(data => {
                    if (!data.ok) return;

                    let html = `<option value="">${self.trans('all-accounts')}</option>`;
                    data.data.forEach(cuenta => {
                        html += `<option value="${cuenta.idcuenta}" data-codcuenta="${self.escapeHtml(cuenta.codcuenta)}">${self.escapeHtml(cuenta.codcuenta)} - ${self.escapeHtml(cuenta.descripcion)}</option>`;
                    });

                    select.innerHTML = html;
                })
                .catch(error => {
                    console.error('[QuickCreate] Error loading cuentas for selector:', error);
                });
        },

        // Handle when a cuenta is selected in the filter
        onCuentaFilterChange: function (idcuenta) {
            const self = this;

            if (!idcuenta) {
                // Remove the create row if exists
                this.removeCreateSubcuentaRow();
                return;
            }

            // Get the next available subcuenta code for this cuenta
            fetch(this.getApiUrl() + '?action=get-next-subcuenta-code&idcuenta=' + encodeURIComponent(idcuenta))
                .then(response => response.json())
                .then(data => {
                    if (data.ok && data.data.codsubcuenta) {
                        self.injectCreateSubcuentaRow(data.data.codsubcuenta, idcuenta);
                    }
                })
                .catch(error => {
                    console.error('[QuickCreate] Error getting next subcuenta code:', error);
                });
        },

        // Inject the "Create subcuenta" row into the results table
        injectCreateSubcuentaRow: function (suggestedCode, idcuenta) {
            const modal = document.getElementById('findSubaccountModal');
            if (!modal) return;

            // Remove existing create row
            this.removeCreateSubcuentaRow();

            // Find the table or results container
            const table = modal.querySelector('table tbody');
            if (!table) {
                console.log('[QuickCreate] Table not found in findSubaccountModal');
                return;
            }

            // Create the new row
            const createRow = document.createElement('tr');
            createRow.id = 'quickCreateSubcuentaRow';
            createRow.className = 'quick-create-subcuenta-row';
            createRow.innerHTML = `
                <td colspan="2" class="quick-create-subcuenta-cell">
                    <div class="d-flex align-items-center justify-content-between">
                        <div class="d-flex align-items-center flex-grow-1">
                            <i class="fas fa-plus-circle text-success me-2"></i>
                            <strong class="text-success me-2">${this.trans('create-subaccount-code')}:</strong>
                            <span class="badge bg-success me-3">${this.escapeHtml(suggestedCode)}</span>
                            <input type="text" class="form-control form-control-sm" id="quickCreateSubcuentaDesc"
                                   placeholder="${this.trans('description')}" style="max-width: 300px;">
                        </div>
                        <button type="button" class="btn btn-success btn-sm" id="quickCreateSubcuentaBtn">
                            <i class="fas fa-save me-1"></i>${this.trans('save')}
                        </button>
                    </div>
                </td>
            `;

            // Append to table
            table.appendChild(createRow);

            // Handle create button click
            const self = this;
            document.getElementById('quickCreateSubcuentaBtn').addEventListener('click', function () {
                self.handleQuickSubcuentaCreate(suggestedCode, idcuenta);
            });

            // Handle Enter key in description field
            document.getElementById('quickCreateSubcuentaDesc').addEventListener('keypress', function (e) {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    self.handleQuickSubcuentaCreate(suggestedCode, idcuenta);
                }
            });

            // Focus the description input
            setTimeout(() => {
                document.getElementById('quickCreateSubcuentaDesc').focus();
            }, 100);
        },

        // Remove the create subcuenta row
        removeCreateSubcuentaRow: function () {
            const existingRow = document.getElementById('quickCreateSubcuentaRow');
            if (existingRow) {
                existingRow.remove();
            }
        },

        // Handle quick subcuenta creation
        handleQuickSubcuentaCreate: function (codsubcuenta, idcuenta) {
            const self = this;
            const descInput = document.getElementById('quickCreateSubcuentaDesc');
            const createBtn = document.getElementById('quickCreateSubcuentaBtn');

            if (!descInput) return;

            const descripcion = descInput.value.trim();
            if (!descripcion) {
                descInput.classList.add('is-invalid');
                descInput.focus();
                return;
            }

            descInput.classList.remove('is-invalid');
            createBtn.disabled = true;
            createBtn.innerHTML = '<i class="fas fa-spinner fa-spin me-1"></i>' + this.trans('saving');

            const formData = new FormData();
            formData.append('idcuenta', idcuenta);
            formData.append('codsubcuenta', codsubcuenta);
            formData.append('descripcion', descripcion);

            fetch(this.getApiUrl() + '?action=create-subcuenta', {
                method: 'POST',
                body: formData
            })
                .then(response => response.json())
                .then(data => {
                    if (data.ok) {
                        // Fill the target input field
                        if (self.currentSubaccountLineInput) {
                            // Use the FacturaScripts format with pipe separator
                            self.currentSubaccountLineInput.value = data.data.codsubcuenta + ' | ' + data.data.descripcion;
                            // Trigger change event
                            const event = new Event('change', { bubbles: true });
                            self.currentSubaccountLineInput.dispatchEvent(event);
                        }

                        // Close the modal
                        const modal = document.getElementById('findSubaccountModal');
                        const bsModal = bootstrap.Modal.getInstance(modal);
                        if (bsModal) {
                            bsModal.hide();
                        }

                        self.showNotification('success', data.message);

                        // Reset the filter for next time
                        const filterSelect = document.getElementById('quickCreateCuentaFilter');
                        if (filterSelect) {
                            filterSelect.value = '';
                        }
                        self.removeCreateSubcuentaRow();
                    } else {
                        self.showNotification('warning', data.message);
                        createBtn.disabled = false;
                        createBtn.innerHTML = '<i class="fas fa-save me-1"></i>' + self.trans('save');
                    }
                })
                .catch(error => {
                    console.error('[QuickCreate] Error creating subcuenta:', error);
                    self.showNotification('error', self.trans('connection-error'));
                    createBtn.disabled = false;
                    createBtn.innerHTML = '<i class="fas fa-save me-1"></i>' + self.trans('save');
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
                'create-subcuenta': 'Crear subcuenta',
                'create-subaccount-code': 'Crear subcuenta',
                'filter-by-account': 'Filtrar por cuenta',
                'all-accounts': 'Todas las cuentas',
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
                'loading': 'Cargando...',
                'purchase-account': 'Cuenta compras',
                'sales-account': 'Cuenta ventas',
                'no-results': 'Sin resultados',
                'parent-account': 'Cuenta padre',
                'subaccount-code': 'Código subcuenta',
                'next-available-code': 'Siguiente código disponible',
                'select-account': 'Seleccionar cuenta...'
            };

            return fallback[key] || key;
        },

        injectStyles: function () {
            if (document.getElementById('quickCreateStyles')) return;

            const styles = `
                .subcuenta-dropdown {
                    position: absolute;
                    top: 100%;
                    left: 0;
                    right: 0;
                    z-index: 1060;
                    background: white;
                    border: 1px solid #dee2e6;
                    border-radius: 0.375rem;
                    box-shadow: 0 0.5rem 1rem rgba(0, 0, 0, 0.15);
                    max-height: 300px;
                    overflow-y: auto;
                }
                .subcuenta-option {
                    padding: 0.5rem 0.75rem;
                    cursor: pointer;
                    border-bottom: 1px solid #f0f0f0;
                }
                .subcuenta-option:last-child {
                    border-bottom: none;
                }
                .subcuenta-option:hover {
                    background-color: #f8f9fa;
                }
                .subcuenta-create-option {
                    border-top: 1px solid #dee2e6;
                    background-color: #f0fff0;
                    color: #198754;
                }
                .subcuenta-create-option:hover {
                    background-color: #d4edda;
                }
                /* Subcuenta modal should appear above product modal */
                #quickCreateSubcuentaModal {
                    z-index: 1070 !important;
                }
                #quickCreateSubcuentaModal + .modal-backdrop {
                    z-index: 1065 !important;
                }
                /* findSubaccountModal quick create row */
                .quick-create-subcuenta-row {
                    background-color: #f0fff0 !important;
                }
                .quick-create-subcuenta-row:hover {
                    background-color: #d4edda !important;
                }
                .quick-create-subcuenta-cell {
                    padding: 0.75rem !important;
                }
                #quickCreateCuentaFilterContainer {
                    border-bottom: 1px solid #dee2e6;
                    padding-bottom: 0.75rem;
                }
            `;

            const styleEl = document.createElement('style');
            styleEl.id = 'quickCreateStyles';
            styleEl.textContent = styles;
            document.head.appendChild(styleEl);
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
