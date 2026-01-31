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

namespace FacturaScripts\Plugins\QuickCreate\Controller;

use FacturaScripts\Core\Base\Controller;
use FacturaScripts\Core\Base\DataBase\DataBaseWhere;
use FacturaScripts\Core\Lib\RegimenIVA;
use FacturaScripts\Core\Tools;
use FacturaScripts\Dinamic\Model\Cuenta;
use FacturaScripts\Dinamic\Model\Ejercicio;
use FacturaScripts\Dinamic\Model\Fabricante;
use FacturaScripts\Dinamic\Model\Familia;
use FacturaScripts\Dinamic\Model\Impuesto;
use FacturaScripts\Dinamic\Model\Producto;
use FacturaScripts\Dinamic\Model\Subcuenta;
use FacturaScripts\Dinamic\Model\Variante;

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

        // Disable template rendering - we'll send JSON directly
        $this->setTemplate(false);

        // Set JSON response headers
        $this->response->headers->set('Content-Type', 'application/json');

        $action = $this->request->get('action', '');

        switch ($action) {
            case 'create-product':
                $this->createProduct();
                break;

            case 'create-account':
                $this->createAccount();
                break;

            case 'get-product-options':
                $this->getProductOptions();
                break;

            case 'search-subcuenta':
                $this->searchSubcuenta();
                break;

            case 'get-exercise-info':
                $this->getExerciseInfo();
                break;

            case 'search-cuentas':
                $this->searchCuentas();
                break;

            case 'get-next-subcuenta-code':
                $this->getNextSubcuentaCode();
                break;

            case 'create-subcuenta':
                $this->createSubcuenta();
                break;

            default:
                $this->response->setStatusCode(400);
                $this->response->setContent(json_encode([
                    'ok' => false,
                    'message' => Tools::lang()->trans('invalid-action'),
                ]));
        }
    }

    protected function createProduct(): void
    {
        // Check permission
        if (false === $this->user->can('EditProducto')) {
            $this->response->setStatusCode(403);
            $this->response->setContent(json_encode([
                'ok' => false,
                'message' => Tools::lang()->trans('permission-denied'),
            ]));
            return;
        }

        $referencia = $this->request->get('referencia', '');
        $descripcion = $this->request->get('descripcion', '');
        $precio = (float) $this->request->get('precio', 0);
        $codfamilia = $this->request->get('codfamilia', '');
        $codfabricante = $this->request->get('codfabricante', '');
        $codimpuesto = $this->request->get('codimpuesto', '');
        $excepcioniva = $this->request->get('excepcioniva', '');
        $codsubcuentacom = $this->request->get('codsubcuentacom', '');
        $codsubcuentaven = $this->request->get('codsubcuentaven', '');

        // Validate required fields
        if (empty($referencia)) {
            $this->response->setStatusCode(400);
            $this->response->setContent(json_encode([
                'ok' => false,
                'message' => Tools::lang()->trans('reference-required'),
            ]));
            return;
        }

        // Check if product already exists
        $variante = new Variante();
        if ($variante->loadFromCode('', [new DataBaseWhere('referencia', $referencia)])) {
            $this->response->setStatusCode(400);
            $this->response->setContent(json_encode([
                'ok' => false,
                'message' => Tools::lang()->trans('reference-already-exists'),
            ]));
            return;
        }

        // Create product (Variante is auto-created)
        $producto = new Producto();
        $producto->referencia = $referencia;
        $producto->descripcion = $descripcion;
        $producto->precio = $precio;

        if (!empty($codfamilia)) {
            $producto->codfamilia = $codfamilia;
        }
        if (!empty($codfabricante)) {
            $producto->codfabricante = $codfabricante;
        }
        if (!empty($codimpuesto)) {
            $producto->codimpuesto = $codimpuesto;
        }
        if (!empty($excepcioniva)) {
            $producto->excepcioniva = $excepcioniva;
        }
        if (!empty($codsubcuentacom)) {
            $producto->codsubcuentacom = $codsubcuentacom;
        }
        if (!empty($codsubcuentaven)) {
            $producto->codsubcuentaven = $codsubcuentaven;
        }

        if (false === $producto->save()) {
            $this->response->setStatusCode(500);
            $this->response->setContent(json_encode([
                'ok' => false,
                'message' => Tools::lang()->trans('product-creation-error'),
            ]));
            return;
        }

        // Get the auto-created variante
        $variante = new Variante();
        $variante->loadFromCode('', [new DataBaseWhere('idproducto', $producto->idproducto)]);

        $this->response->setContent(json_encode([
            'ok' => true,
            'message' => Tools::lang()->trans('product-created'),
            'data' => [
                'referencia' => $variante->referencia,
                'idproducto' => $producto->idproducto,
                'idvariante' => $variante->idvariante,
                'descripcion' => $producto->descripcion,
            ],
        ]));
    }

    protected function createAccount(): void
    {
        // Check permission
        if (false === $this->user->can('EditCuenta')) {
            $this->response->setStatusCode(403);
            $this->response->setContent(json_encode([
                'ok' => false,
                'message' => Tools::lang()->trans('permission-denied'),
            ]));
            return;
        }

        $codsubcuenta = $this->request->get('codsubcuenta', '');
        $descripcion = $this->request->get('descripcion', '');
        $codejercicio = $this->request->get('codejercicio', '');

        // Validate required fields
        if (empty($codsubcuenta) || empty($codejercicio)) {
            $this->response->setStatusCode(400);
            $this->response->setContent(json_encode([
                'ok' => false,
                'message' => Tools::lang()->trans('account-code-required'),
            ]));
            return;
        }

        // Load ejercicio to get required code length
        $ejercicio = new Ejercicio();
        if (false === $ejercicio->loadFromCode($codejercicio)) {
            $this->response->setStatusCode(400);
            $this->response->setContent(json_encode([
                'ok' => false,
                'message' => Tools::lang()->trans('exercise-not-found'),
            ]));
            return;
        }

        // Validate code length
        if (strlen($codsubcuenta) !== $ejercicio->longsubcuenta) {
            $this->response->setStatusCode(400);
            $this->response->setContent(json_encode([
                'ok' => false,
                'message' => Tools::lang()->trans(
                    'account-code-wrong-length',
                    ['%length%' => $ejercicio->longsubcuenta]
                ),
            ]));
            return;
        }

        // Check if subcuenta already exists
        $existingSubcuenta = new Subcuenta();
        if (
            $existingSubcuenta->loadFromCode('', [
            new DataBaseWhere('codsubcuenta', $codsubcuenta),
            new DataBaseWhere('codejercicio', $codejercicio),
            ])
        ) {
            $this->response->setStatusCode(400);
            $this->response->setContent(json_encode([
                'ok' => false,
                'message' => Tools::lang()->trans('account-already-exists'),
            ]));
            return;
        }

        // Find parent cuenta
        $codcuenta = substr($codsubcuenta, 0, strlen($codsubcuenta) - 2);
        $cuenta = new Cuenta();
        $parentFound = false;

        // Try progressively shorter codes to find parent
        while (strlen($codcuenta) >= 1) {
            if (
                $cuenta->loadFromCode('', [
                new DataBaseWhere('codcuenta', $codcuenta),
                new DataBaseWhere('codejercicio', $codejercicio),
                ])
            ) {
                $parentFound = true;
                break;
            }
            $codcuenta = substr($codcuenta, 0, -1);
        }

        if (false === $parentFound) {
            $this->response->setStatusCode(400);
            $this->response->setContent(json_encode([
                'ok' => false,
                'message' => Tools::lang()->trans('parent-account-not-found'),
            ]));
            return;
        }

        // Create subcuenta
        $subcuenta = new Subcuenta();
        $subcuenta->codsubcuenta = $codsubcuenta;
        $subcuenta->descripcion = $descripcion ?: $cuenta->descripcion;
        $subcuenta->codcuenta = $cuenta->codcuenta;
        $subcuenta->codejercicio = $codejercicio;
        $subcuenta->idcuenta = $cuenta->idcuenta;

        if (false === $subcuenta->save()) {
            $this->response->setStatusCode(500);
            $this->response->setContent(json_encode([
                'ok' => false,
                'message' => Tools::lang()->trans('account-creation-error'),
            ]));
            return;
        }

        $this->response->setContent(json_encode([
            'ok' => true,
            'message' => Tools::lang()->trans('account-created'),
            'data' => [
                'codsubcuenta' => $subcuenta->codsubcuenta,
                'idsubcuenta' => $subcuenta->idsubcuenta,
                'descripcion' => $subcuenta->descripcion,
            ],
        ]));
    }

    protected function getProductOptions(): void
    {
        // Check permission
        if (false === $this->user->can('EditProducto')) {
            $this->response->setStatusCode(403);
            $this->response->setContent(json_encode([
                'ok' => false,
                'message' => Tools::lang()->trans('permission-denied'),
            ]));
            return;
        }

        // Get families
        $familiaModel = new Familia();
        $familias = [];
        foreach ($familiaModel->all([], ['descripcion' => 'ASC']) as $familia) {
            $familias[] = [
                'value' => $familia->codfamilia,
                'label' => $familia->descripcion,
            ];
        }

        // Get manufacturers
        $fabricanteModel = new Fabricante();
        $fabricantes = [];
        foreach ($fabricanteModel->all([], ['nombre' => 'ASC']) as $fabricante) {
            $fabricantes[] = [
                'value' => $fabricante->codfabricante,
                'label' => $fabricante->nombre,
            ];
        }

        // Get taxes
        $impuestoModel = new Impuesto();
        $impuestos = [];
        $defaultTax = Tools::settings('default', 'codimpuesto', '');
        foreach ($impuestoModel->all([], ['descripcion' => 'ASC']) as $impuesto) {
            $impuestos[] = [
                'value' => $impuesto->codimpuesto,
                'label' => $impuesto->descripcion,
            ];
        }

        // Get VAT exceptions
        $excepciones = [];
        foreach (RegimenIVA::allExceptions() as $key => $value) {
            $excepciones[] = [
                'value' => $key,
                'label' => Tools::lang()->trans($value),
            ];
        }

        $this->response->setContent(json_encode([
            'ok' => true,
            'data' => [
                'familias' => $familias,
                'fabricantes' => $fabricantes,
                'impuestos' => $impuestos,
                'excepciones' => $excepciones,
                'defaultTax' => $defaultTax,
            ],
        ]));
    }

    protected function searchSubcuenta(): void
    {
        // Check permission
        if (false === $this->user->can('EditProducto')) {
            $this->response->setStatusCode(403);
            $this->response->setContent(json_encode([
                'ok' => false,
                'message' => Tools::lang()->trans('permission-denied'),
            ]));
            return;
        }

        $query = trim($this->request->get('query', ''));
        if (empty($query)) {
            $this->response->setContent(json_encode([
                'ok' => true,
                'data' => [],
            ]));
            return;
        }

        // Get current exercise
        $ejercicio = new Ejercicio();
        $ejercicio->loadFromCode('', [new DataBaseWhere('estado', 'ABIERTO')]);
        if (empty($ejercicio->codejercicio)) {
            $this->response->setContent(json_encode([
                'ok' => true,
                'data' => [],
            ]));
            return;
        }

        // Transform dot notation (e.g., "570.1" -> "5700000001")
        $transformedQuery = $this->transformCodsubcuenta($query, $ejercicio->longsubcuenta);

        // Search subcuentas
        $subcuenta = new Subcuenta();
        $where = [
            new DataBaseWhere('codejercicio', $ejercicio->codejercicio),
        ];

        // Search by code or description
        $whereCode = array_merge($where, [
            new DataBaseWhere('codsubcuenta', $transformedQuery . '%', 'LIKE'),
        ]);
        $whereDesc = array_merge($where, [
            new DataBaseWhere('descripcion', '%' . $query . '%', 'LIKE'),
        ]);

        $results = [];
        $foundCodes = [];

        // First search by code
        foreach ($subcuenta->all($whereCode, ['codsubcuenta' => 'ASC'], 0, 15) as $sub) {
            $results[] = [
                'codsubcuenta' => $sub->codsubcuenta,
                'descripcion' => $sub->descripcion,
                'idsubcuenta' => $sub->idsubcuenta,
            ];
            $foundCodes[] = $sub->codsubcuenta;
        }

        // Then search by description if we have room
        if (count($results) < 20) {
            $remaining = 20 - count($results);
            foreach ($subcuenta->all($whereDesc, ['descripcion' => 'ASC'], 0, $remaining) as $sub) {
                if (!in_array($sub->codsubcuenta, $foundCodes)) {
                    $results[] = [
                        'codsubcuenta' => $sub->codsubcuenta,
                        'descripcion' => $sub->descripcion,
                        'idsubcuenta' => $sub->idsubcuenta,
                    ];
                }
            }
        }

        // Calculate suggested code if query looks like a parent code prefix
        $suggestedCode = '';
        if (preg_match('/^\d{2,4}$/', $query)) {
            $suggestedCode = $this->getNextFreeSubcuentaCode($query, $ejercicio->codejercicio);
        }

        $this->response->setContent(json_encode([
            'ok' => true,
            'data' => $results,
            'suggestedCode' => $suggestedCode,
            'codejercicio' => $ejercicio->codejercicio,
            'longsubcuenta' => $ejercicio->longsubcuenta,
        ]));
    }

    protected function transformCodsubcuenta(string $code, int $longsubcuenta): string
    {
        $code = trim($code);
        if (strpos($code, '.') === false) {
            return $code;
        }

        $parts = explode('.', $code);
        if (count($parts) !== 2) {
            return $code;
        }

        $paddingLength = $longsubcuenta - strlen($parts[1]);
        return str_pad($parts[0], $paddingLength, '0', STR_PAD_RIGHT) . $parts[1];
    }

    protected function getNextFreeSubcuentaCode(string $prefix, string $codejercicio): string
    {
        $ejercicio = new Ejercicio();
        if (false === $ejercicio->loadFromCode($codejercicio)) {
            return '';
        }

        // Find parent cuenta
        $cuenta = new Cuenta();
        $where = [
            new DataBaseWhere('codcuenta', $prefix),
            new DataBaseWhere('codejercicio', $codejercicio),
        ];
        if (false === $cuenta->loadFromCode('', $where)) {
            return '';
        }

        // Try numbers 1, 2, 3... until 999
        $subcuenta = new Subcuenta();
        for ($i = 1; $i <= 999; $i++) {
            $suffix = (string) $i;
            $paddedPrefix = str_pad($prefix, $ejercicio->longsubcuenta - strlen($suffix), '0', STR_PAD_RIGHT);
            $newCode = $paddedPrefix . $suffix;

            $where = [
                new DataBaseWhere('codsubcuenta', $newCode),
                new DataBaseWhere('codejercicio', $codejercicio),
            ];
            if (false === $subcuenta->loadFromCode('', $where)) {
                return $newCode;
            }
        }

        return '';
    }

    protected function getExerciseInfo(): void
    {
        // Check permission
        if (false === $this->user->can('EditProducto')) {
            $this->response->setStatusCode(403);
            $this->response->setContent(json_encode([
                'ok' => false,
                'message' => Tools::lang()->trans('permission-denied'),
            ]));
            return;
        }

        // Get current open exercise
        $ejercicio = new Ejercicio();
        $ejercicio->loadFromCode('', [new DataBaseWhere('estado', 'ABIERTO')]);

        if (empty($ejercicio->codejercicio)) {
            $this->response->setStatusCode(404);
            $this->response->setContent(json_encode([
                'ok' => false,
                'message' => Tools::lang()->trans('exercise-not-found'),
            ]));
            return;
        }

        $this->response->setContent(json_encode([
            'ok' => true,
            'data' => [
                'codejercicio' => $ejercicio->codejercicio,
                'longsubcuenta' => $ejercicio->longsubcuenta,
                'nombre' => $ejercicio->nombre,
            ],
        ]));
    }

    protected function searchCuentas(): void
    {
        // Check permission
        if (false === $this->user->can('EditCuenta')) {
            $this->response->setStatusCode(403);
            $this->response->setContent(json_encode([
                'ok' => false,
                'message' => Tools::lang()->trans('permission-denied'),
            ]));
            return;
        }

        $query = trim($this->request->get('query', ''));

        // Get current exercise
        $ejercicio = new Ejercicio();
        $ejercicio->loadFromCode('', [new DataBaseWhere('estado', 'ABIERTO')]);
        if (empty($ejercicio->codejercicio)) {
            $this->response->setContent(json_encode([
                'ok' => true,
                'data' => [],
            ]));
            return;
        }

        // Search cuentas
        $cuenta = new Cuenta();
        $where = [
            new DataBaseWhere('codejercicio', $ejercicio->codejercicio),
        ];

        if (!empty($query)) {
            $where[] = new DataBaseWhere('codcuenta', $query . '%', 'LIKE', 'AND');
            $where[] = new DataBaseWhere('descripcion', '%' . $query . '%', 'LIKE', 'OR');
        }

        $results = [];
        foreach ($cuenta->all($where, ['codcuenta' => 'ASC'], 0, 50) as $c) {
            $results[] = [
                'idcuenta' => $c->idcuenta,
                'codcuenta' => $c->codcuenta,
                'descripcion' => $c->descripcion,
            ];
        }

        $this->response->setContent(json_encode([
            'ok' => true,
            'data' => $results,
            'codejercicio' => $ejercicio->codejercicio,
        ]));
    }

    protected function getNextSubcuentaCode(): void
    {
        // Check permission
        if (false === $this->user->can('EditCuenta')) {
            $this->response->setStatusCode(403);
            $this->response->setContent(json_encode([
                'ok' => false,
                'message' => Tools::lang()->trans('permission-denied'),
            ]));
            return;
        }

        $idcuenta = (int) $this->request->get('idcuenta', 0);
        if ($idcuenta <= 0) {
            $this->response->setStatusCode(400);
            $this->response->setContent(json_encode([
                'ok' => false,
                'message' => Tools::lang()->trans('parent-account-not-found'),
            ]));
            return;
        }

        $cuenta = new Cuenta();
        if (false === $cuenta->loadFromCode($idcuenta)) {
            $this->response->setStatusCode(404);
            $this->response->setContent(json_encode([
                'ok' => false,
                'message' => Tools::lang()->trans('parent-account-not-found'),
            ]));
            return;
        }

        $nextCode = $this->getNextFreeSubcuentaCode($cuenta->codcuenta, $cuenta->codejercicio);

        $this->response->setContent(json_encode([
            'ok' => true,
            'data' => [
                'codsubcuenta' => $nextCode,
                'codcuenta' => $cuenta->codcuenta,
                'descripcion' => $cuenta->descripcion,
            ],
        ]));
    }

    protected function createSubcuenta(): void
    {
        // Check permission
        if (false === $this->user->can('EditCuenta')) {
            $this->response->setStatusCode(403);
            $this->response->setContent(json_encode([
                'ok' => false,
                'message' => Tools::lang()->trans('permission-denied'),
            ]));
            return;
        }

        $idcuenta = (int) $this->request->get('idcuenta', 0);
        $codsubcuenta = trim($this->request->get('codsubcuenta', ''));
        $descripcion = trim($this->request->get('descripcion', ''));

        // Validate required fields
        if ($idcuenta <= 0 || empty($codsubcuenta)) {
            $this->response->setStatusCode(400);
            $this->response->setContent(json_encode([
                'ok' => false,
                'message' => Tools::lang()->trans('account-code-required'),
            ]));
            return;
        }

        // Load parent cuenta
        $cuenta = new Cuenta();
        if (false === $cuenta->loadFromCode($idcuenta)) {
            $this->response->setStatusCode(404);
            $this->response->setContent(json_encode([
                'ok' => false,
                'message' => Tools::lang()->trans('parent-account-not-found'),
            ]));
            return;
        }

        // Check if subcuenta already exists
        $existingSubcuenta = new Subcuenta();
        if (
            $existingSubcuenta->loadFromCode('', [
            new DataBaseWhere('codsubcuenta', $codsubcuenta),
            new DataBaseWhere('codejercicio', $cuenta->codejercicio),
            ])
        ) {
            $this->response->setStatusCode(400);
            $this->response->setContent(json_encode([
                'ok' => false,
                'message' => Tools::lang()->trans('account-already-exists'),
            ]));
            return;
        }

        // Create subcuenta
        $subcuenta = new Subcuenta();
        $subcuenta->codsubcuenta = $codsubcuenta;
        $subcuenta->descripcion = $descripcion ?: $cuenta->descripcion;
        $subcuenta->codcuenta = $cuenta->codcuenta;
        $subcuenta->codejercicio = $cuenta->codejercicio;
        $subcuenta->idcuenta = $cuenta->idcuenta;

        if (false === $subcuenta->save()) {
            $this->response->setStatusCode(500);
            $this->response->setContent(json_encode([
                'ok' => false,
                'message' => Tools::lang()->trans('account-creation-error'),
            ]));
            return;
        }

        $this->response->setContent(json_encode([
            'ok' => true,
            'message' => Tools::lang()->trans('account-created'),
            'data' => [
                'codsubcuenta' => $subcuenta->codsubcuenta,
                'idsubcuenta' => $subcuenta->idsubcuenta,
                'descripcion' => $subcuenta->descripcion,
            ],
        ]));
    }
}
