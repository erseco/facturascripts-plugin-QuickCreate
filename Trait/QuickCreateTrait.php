<?php

/**
 * This file is part of QuickCreate plugin for FacturaScripts.
 * Copyright (C) 2025 Ernesto Serrano <info@ernesto.es>
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Lesser General Public License as
 * published by the Free Software Foundation, either version 3 of the
 * License, or (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
 * GNU Lesser General Public License for more details.
 *
 * You should have received a copy of the GNU Lesser General Public License
 * along with this program. If not, see <http://www.gnu.org/licenses/>.
 */

namespace FacturaScripts\Plugins\QuickCreate\Trait;

use Closure;
use FacturaScripts\Core\Lib\AssetManager;
use FacturaScripts\Core\Tools;
use FacturaScripts\Core\Lib\AjaxForms\PurchasesController;
use FacturaScripts\Core\Lib\AjaxForms\SalesController;
// EditAsiento check done via string matching to avoid Dinamic autoload issues

trait QuickCreateTrait
{
    public function createViews(): Closure
    {
        return function () {
            try {
                $canEditProduct = $this->user->can('EditProducto');
                $canEditAccount = $this->user->can('EditCuenta');

                Tools::log()->debug('QuickCreate: canEditProduct=' . ($canEditProduct ? 'true' : 'false') . ', canEditAccount=' . ($canEditAccount ? 'true' : 'false'));
                Tools::log()->debug('QuickCreate: Controller class = ' . get_class($this));

                // Determine what type of quick create to enable based on controller type
                $enableProduct = false;
                $enableAccount = false;

                // Use string-based class checks to avoid autoload issues
                $controllerClass = get_class($this);
                Tools::log()->debug('QuickCreate: Checking controller: ' . $controllerClass);

                if ($this instanceof SalesController || $this instanceof PurchasesController) {
                    $enableProduct = $canEditProduct;
                    Tools::log()->debug('QuickCreate: Detected Sales/Purchases controller, enableProduct=' . ($enableProduct ? 'true' : 'false'));
                } elseif (strpos($controllerClass, 'EditAsiento') !== false) {
                    $enableAccount = $canEditAccount;
                    Tools::log()->debug('QuickCreate: Detected EditAsiento, enableAccount=' . ($enableAccount ? 'true' : 'false'));
                } else {
                    Tools::log()->debug('QuickCreate: Unknown controller type, not enabling features');
                }

                // Only load assets if user has at least one permission
                if ($enableProduct || $enableAccount) {
                    $cssPath = FS_ROUTE . '/Plugins/QuickCreate/Assets/CSS/QuickCreate.css';
                    $jsPath = FS_ROUTE . '/Plugins/QuickCreate/Assets/JS/QuickCreate.js';

                    Tools::log()->debug('QuickCreate: Adding CSS: ' . $cssPath);
                    Tools::log()->debug('QuickCreate: Adding JS: ' . $jsPath);

                    AssetManager::addCss($cssPath);
                    AssetManager::addJs($jsPath);

                    // JS auto-detects context from page elements
                    Tools::log()->debug('QuickCreate: Assets added successfully');
                }
            } catch (\Throwable $e) {
                Tools::log()->error('QuickCreate ERROR: ' . $e->getMessage() . ' in ' . $e->getFile() . ':' . $e->getLine());
            }
        };
    }
}
