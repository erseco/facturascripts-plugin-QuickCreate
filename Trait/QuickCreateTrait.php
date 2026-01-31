<?php

/**
 * This file is part of QuickCreate plugin for FacturaScripts.
 * Copyright (C) 2026 Ernesto Serrano <info@ernesto.es>
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
use FacturaScripts\Core\Lib\AjaxForms\PurchasesController;
use FacturaScripts\Core\Lib\AjaxForms\SalesController;
use FacturaScripts\Core\Lib\AssetManager;
use FacturaScripts\Core\Tools;

// EditAsiento check done via string matching to avoid Dinamic autoload issues

trait QuickCreateTrait
{
    public function createViews(): Closure
    {
        return function () {
            try {
                $canEditProduct = $this->user->can('EditProducto');
                $canEditAccount = $this->user->can('EditCuenta');

                // Determine what type of quick create to enable based on controller type
                $enableProduct = false;
                $enableAccount = false;
                $controllerClass = get_class($this);

                if ($this instanceof SalesController || $this instanceof PurchasesController) {
                    $enableProduct = $canEditProduct;
                } elseif (strpos($controllerClass, 'EditAsiento') !== false) {
                    $enableAccount = $canEditAccount;
                }

                // Only load assets if user has at least one permission
                if ($enableProduct || $enableAccount) {
                    AssetManager::addCss(FS_ROUTE . '/Plugins/QuickCreate/Assets/CSS/QuickCreate.css');
                    AssetManager::addJs(FS_ROUTE . '/Plugins/QuickCreate/Assets/JS/QuickCreate.js');
                }
            } catch (\Throwable $e) {
                Tools::log()->error('QuickCreate: ' . $e->getMessage());
            }
        };
    }
}
