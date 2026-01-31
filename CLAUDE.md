# CLAUDE.md - Development Guide for QuickCreate Plugin

This document contains the conventions, coding styles, and best practices for developing FacturaScripts plugins.

## Plugin Structure

```
QuickCreate/
├── Controller/           # Plugin controllers
├── Extension/            # Extensions for existing controllers
│   └── Controller/
├── Trait/                # Traits to share functionality
├── Model/                # Models (if any)
├── Assets/
│   ├── CSS/
│   └── JS/
├── View/                 # Twig templates
├── XMLView/              # XML views for forms/listings
├── Translation/          # JSON translation files
├── Init.php              # Initialization class
└── facturascripts.ini    # Plugin metadata
```

## Naming Conventions

| Element | Convention | Example |
|---------|------------|---------|
| Classes | PascalCase | `QuickCreateAction` |
| Methods | camelCase | `getPageData()` |
| Properties | camelCase | `$codfamilia` |
| Constants | UPPER_SNAKE_CASE | `const MAX_ITEMS = 50` |
| PHP Files | PascalCase.php | `EditProducto.php` |
| Translation Keys | kebab-case | `quick-create-product` |

### Namespaces

```php
// Controllers
namespace FacturaScripts\Plugins\QuickCreate\Controller;

// Extensions
namespace FacturaScripts\Plugins\QuickCreate\Extension\Controller;

// Traits
namespace FacturaScripts\Plugins\QuickCreate\Trait;

// Models
namespace FacturaScripts\Plugins\QuickCreate\Model;
```

### Controller Prefixes

- `EditXXX` - Entity editing (e.g.: `EditSerie`, `EditFacturaCliente`)
- `ListXXX` - Entity listing (e.g.: `ListAlmacen`)
- `ApiXXX` - API endpoints

## PHP Coding Style (PSR-12)

### Basic Rules

- **Indentation:** 4 spaces (NOT tabs)
- **Max line length:** 120 characters
- **Arrays:** Short syntax `[]`, NOT `array()`
- **Strings:** Single quotes preferred
- **Trailing comma:** In multiline arrays

### Class Example

```php
<?php
/**
 * This file is part of QuickCreate plugin for FacturaScripts
 * Copyright (C) 2026 Ernesto Serrano <info@ernesto.es>
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Lesser General Public License as
 * published by the Free Software Foundation, either version 3 of the
 * License, or (at your option) any later version.
 */

namespace FacturaScripts\Plugins\QuickCreate\Controller;

use FacturaScripts\Core\Base\Controller;
use FacturaScripts\Core\Tools;
use Symfony\Component\HttpFoundation\Response;

class QuickCreateAction extends Controller
{
    public function getPageData(): array
    {
        $data = parent::getPageData();
        $data['menu'] = 'admin';
        $data['title'] = 'QuickCreate API';
        $data['showonmenu'] = false;
        return $data;
    }

    public function privateCore(&$response, $user, $permissions): void
    {
        parent::privateCore($response, $user, $permissions);
        $this->setTemplate(false);
        $this->response->headers->set('Content-Type', 'application/json');
    }
}
```

### DocBlocks

```php
/**
 * Brief class description.
 *
 * @author Name <email@example.com>
 */
class MyClass
{
    /**
     * Property description.
     *
     * @var string
     */
    public $myProperty;

    /**
     * Method description.
     *
     * @param string $param Parameter description
     * @return bool Return description
     */
    public function myMethod(string $param): bool
    {
        return true;
    }
}
```

## Controllers

### EditController (Editing)

```php
class EditMyModel extends EditController
{
    public function getModelClassName(): string
    {
        return 'MyModel';
    }

    public function getPageData(): array
    {
        $data = parent::getPageData();
        $data['menu'] = 'admin';
        $data['title'] = 'my-model';
        $data['icon'] = 'fa-solid fa-cog';
        return $data;
    }

    protected function createViews(): void
    {
        parent::createViews();
        // Create additional views
    }

    protected function loadData($viewName, $view): void
    {
        parent::loadData($viewName, $view);
        // Load additional data
    }
}
```

### JSON/API Controller

```php
class MyApiController extends Controller
{
    public function privateCore(&$response, $user, $permissions): void
    {
        parent::privateCore($response, $user, $permissions);
        $this->setTemplate(false);
        $this->response->headers->set('Content-Type', 'application/json');

        $action = $this->request->get('action', '');
        match ($action) {
            'create' => $this->createAction(),
            'delete' => $this->deleteAction(),
            default => $this->errorResponse('invalid-action'),
        };
    }

    protected function jsonResponse(array $data, int $status = 200): void
    {
        $this->response->setStatusCode($status);
        $this->response->setContent(json_encode($data));
    }

    protected function errorResponse(string $message, int $status = 400): void
    {
        $this->jsonResponse([
            'ok' => false,
            'message' => Tools::lang()->trans($message),
        ], $status);
    }
}
```

## Controller Extensions

### Pattern with Trait

```php
// Extension/Controller/EditPresupuestoCliente.php
namespace FacturaScripts\Plugins\QuickCreate\Extension\Controller;

use FacturaScripts\Plugins\QuickCreate\Trait\QuickCreateTrait;

class EditPresupuestoCliente
{
    use QuickCreateTrait;
}
```

```php
// Trait/QuickCreateTrait.php
namespace FacturaScripts\Plugins\QuickCreate\Trait;

use Closure;
use FacturaScripts\Core\Base\AjaxForms\SalesHeaderHTML;
use FacturaScripts\Core\Tools;

trait QuickCreateTrait
{
    public function createViews(): Closure
    {
        return function () {
            // $this refers to the original controller
            if ($this->user->can('EditProducto')) {
                AssetManager::addJs(FS_ROUTE . '/Plugins/QuickCreate/Assets/JS/QuickCreate.js');
            }
        };
    }
}
```

### Registration in Init.php

```php
namespace FacturaScripts\Plugins\QuickCreate;

use FacturaScripts\Core\Template\InitClass;

class Init extends InitClass
{
    public function init(): void
    {
        $this->loadExtension(new Extension\Controller\EditPresupuestoCliente());
        $this->loadExtension(new Extension\Controller\EditPedidoCliente());
    }

    public function update(): void
    {
        // Migrations and updates
    }

    public function uninstall(): void
    {
        // Cleanup on uninstall
    }
}
```

## Models

```php
namespace FacturaScripts\Plugins\QuickCreate\Model;

use FacturaScripts\Core\Model\Base\ModelClass;
use FacturaScripts\Core\Model\Base\ModelTrait;

class MyModel extends ModelClass
{
    use ModelTrait;

    /** @var int */
    public $id;

    /** @var string */
    public $codigo;

    /** @var string */
    public $descripcion;

    public static function primaryColumn(): string
    {
        return 'id';
    }

    public static function tableName(): string
    {
        return 'my_table';
    }
}
```

## XML Views

### EditView (Form)

```xml
<?xml version="1.0" encoding="UTF-8"?>
<view>
    <columns>
        <group name="data" numcolumns="12">
            <column name="code" numcolumns="3" order="100">
                <widget type="text" fieldname="codigo" maxlength="10" required="true"/>
            </column>
            <column name="description" numcolumns="9" order="110">
                <widget type="text" fieldname="descripcion" maxlength="200"/>
            </column>
            <column name="active" numcolumns="2" order="120">
                <widget type="checkbox" fieldname="activo"/>
            </column>
        </group>
    </columns>
</view>
```

### ListView (Listing)

```xml
<?xml version="1.0" encoding="UTF-8"?>
<view>
    <columns>
        <column name="code" order="100">
            <widget type="text" fieldname="codigo"/>
        </column>
        <column name="description" order="110">
            <widget type="text" fieldname="descripcion"/>
        </column>
    </columns>
    <rows>
        <row type="status">
            <option color="danger" fieldname="activo">0</option>
        </row>
    </rows>
</view>
```

### Available Widgets

| Widget | Usage |
|--------|-------|
| `text` | Text field |
| `number` | Numeric field |
| `money` | Money field |
| `checkbox` | Checkbox |
| `select` | Dropdown |
| `date` | Date |
| `datetime` | Date and time |
| `textarea` | Text area |
| `autocomplete` | Autocomplete |

## JavaScript

### Recommended Structure

```javascript
/**
 * This file is part of QuickCreate plugin for FacturaScripts
 * Copyright (C) 2026 Ernesto Serrano <info@ernesto.es>
 */

(function () {
    'use strict';

    const MyPlugin = {
        // Properties
        initialized: false,

        // Initialization
        init: function () {
            if (this.initialized) return;
            console.log('[MyPlugin] Initializing...');
            this.bindEvents();
            this.initialized = true;
        },

        // Bind events
        bindEvents: function () {
            document.addEventListener('click', (e) => {
                if (e.target.matches('.my-button')) {
                    this.handleClick(e);
                }
            });
        },

        // Handlers
        handleClick: function (e) {
            e.preventDefault();
            // Logic
        },

        // AJAX requests
        fetchData: async function (action, data) {
            try {
                const response = await fetch('QuickCreateAction', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/x-www-form-urlencoded',
                    },
                    body: new URLSearchParams({
                        action: action,
                        ...data,
                    }),
                });
                return await response.json();
            } catch (error) {
                console.error('[MyPlugin] Error:', error);
                return { ok: false, message: error.message };
            }
        },

        // Translations
        trans: function (key) {
            if (window.i18n && typeof window.i18n.trans === 'function') {
                return window.i18n.trans(key);
            }
            return key;
        },

        // Escape HTML
        escapeHtml: function (text) {
            const div = document.createElement('div');
            div.textContent = text;
            return div.innerHTML;
        }
    };

    // Start
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => MyPlugin.init());
    } else {
        MyPlugin.init();
    }
})();
```

### Observing DOM Changes

```javascript
// To inject into dynamically loaded elements
const observer = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
        if (mutation.addedNodes.length) {
            this.injectButtons();
        }
    });
});

observer.observe(document.body, {
    childList: true,
    subtree: true,
});
```

## CSS

```css
/**
 * QuickCreate plugin styles
 */

/* Use Bootstrap 5 variables */
.quick-create-btn {
    padding: 0.375rem 0.5rem;
    background-color: var(--bs-secondary);
    border-color: var(--bs-secondary);
}

.quick-create-btn:hover {
    background-color: var(--bs-primary);
    color: var(--bs-white);
}

/* Naming: .component-element */
.quick-create-modal .modal-header {
    background-color: var(--bs-light);
    border-bottom: 1px solid var(--bs-border-color);
}
```

## Translations

### JSON Format

```json
{
    "translation-key": "Translated text",
    "quick-create-product": "Quick create product",
    "reference-required": "Reference is required",
    "product-created": "Product created successfully"
}
```

### Usage in PHP

```php
Tools::lang()->trans('quick-create-product')
Tools::lang()->trans('items-count', ['%count%' => 5])
```

### Usage in JavaScript

```javascript
window.i18n.trans('quick-create-product')
```

### Usage in Twig

```twig
{{ i18n.trans('quick-create-product') }}
```

## Validation and Security

### Check Permissions

```php
// In controller
if (false === $this->user->can('EditProducto')) {
    $this->response->setStatusCode(Response::HTTP_FORBIDDEN);
    $this->response->setContent(json_encode([
        'ok' => false,
        'message' => Tools::lang()->trans('permission-denied'),
    ]));
    return;
}
```

### Validate Input

```php
$referencia = $this->request->get('referencia', '');
if (empty(trim($referencia))) {
    $this->errorResponse('reference-required');
    return;
}

// Sanitize
$descripcion = Tools::noHtml($this->request->get('descripcion', ''));
```

### Safe Queries

```php
use FacturaScripts\Core\DataSrc\DataBaseWhere;

$where = [
    new DataBaseWhere('codfamilia', $codigo),
    new DataBaseWhere('activo', true),
];
$items = $model->all($where, ['orden' => 'ASC'], 0, 50);
```

## Logging

```php
// Info
Tools::log()->info('QuickCreate: Product created ' . $referencia);

// Warning
Tools::log()->warning('QuickCreate: Duplicate reference');

// Error
Tools::log()->error('QuickCreate ERROR: ' . $e->getMessage());
```

## Standard JSON Responses

### Success

```php
$this->response->setContent(json_encode([
    'ok' => true,
    'message' => Tools::lang()->trans('record-saved'),
    'data' => [
        'id' => $model->id,
        'codigo' => $model->codigo,
    ],
]));
```

### Error

```php
$this->response->setStatusCode(Response::HTTP_BAD_REQUEST);
$this->response->setContent(json_encode([
    'ok' => false,
    'message' => Tools::lang()->trans('error-message'),
]));
```

## Useful Commands

```bash
# Check code style
make lint
# or
vendor/bin/phpcs

# Fix code style automatically
make fix
# or
vendor/bin/php-cs-fixer fix

# Run tests
make test
# or
vendor/bin/phpunit
```

## References

- **FacturaScripts Core:** `./facturascripts/Core/`
- **Example Controllers:** `./facturascripts/Core/Controller/`
- **Example Models:** `./facturascripts/Core/Model/`
- **XML Views:** `./facturascripts/Core/XMLView/`
- **Official Documentation:** https://facturascripts.com/documentacion
