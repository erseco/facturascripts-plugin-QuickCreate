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

namespace FacturaScripts\Plugins\QuickCreate\Controller;

use FacturaScripts\Core\Base\Controller;
use FacturaScripts\Core\Base\DataBase\DataBaseWhere;
use FacturaScripts\Core\Tools;
use FacturaScripts\Core\Lib\RegimenIVA;
use FacturaScripts\Dinamic\Model\Cuenta;
use FacturaScripts\Dinamic\Model\Ejercicio;
use FacturaScripts\Dinamic\Model\Fabricante;
use FacturaScripts\Dinamic\Model\Familia;
use FacturaScripts\Dinamic\Model\Impuesto;
use FacturaScripts\Dinamic\Model\Producto;
use FacturaScripts\Dinamic\Model\Subcuenta;
use FacturaScripts\Dinamic\Model\Variante;
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

            default:
                $this->response->setStatusCode(Response::HTTP_BAD_REQUEST);
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
            $this->response->setStatusCode(Response::HTTP_FORBIDDEN);
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

        // Validate required fields
        if (empty($referencia)) {
            $this->response->setStatusCode(Response::HTTP_BAD_REQUEST);
            $this->response->setContent(json_encode([
                'ok' => false,
                'message' => Tools::lang()->trans('reference-required'),
            ]));
            return;
        }

        // Check if product already exists
        $variante = new Variante();
        if ($variante->loadFromCode('', [new DataBaseWhere('referencia', $referencia)])) {
            $this->response->setStatusCode(Response::HTTP_BAD_REQUEST);
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

        if (false === $producto->save()) {
            $this->response->setStatusCode(Response::HTTP_INTERNAL_SERVER_ERROR);
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
            $this->response->setStatusCode(Response::HTTP_FORBIDDEN);
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
            $this->response->setStatusCode(Response::HTTP_BAD_REQUEST);
            $this->response->setContent(json_encode([
                'ok' => false,
                'message' => Tools::lang()->trans('account-code-required'),
            ]));
            return;
        }

        // Load ejercicio to get required code length
        $ejercicio = new Ejercicio();
        if (false === $ejercicio->loadFromCode($codejercicio)) {
            $this->response->setStatusCode(Response::HTTP_BAD_REQUEST);
            $this->response->setContent(json_encode([
                'ok' => false,
                'message' => Tools::lang()->trans('exercise-not-found'),
            ]));
            return;
        }

        // Validate code length
        if (strlen($codsubcuenta) !== $ejercicio->longsubcuenta) {
            $this->response->setStatusCode(Response::HTTP_BAD_REQUEST);
            $this->response->setContent(json_encode([
                'ok' => false,
                'message' => Tools::lang()->trans('account-code-wrong-length', ['%length%' => $ejercicio->longsubcuenta]),
            ]));
            return;
        }

        // Check if subcuenta already exists
        $existingSubcuenta = new Subcuenta();
        if ($existingSubcuenta->loadFromCode('', [
            new DataBaseWhere('codsubcuenta', $codsubcuenta),
            new DataBaseWhere('codejercicio', $codejercicio),
        ])) {
            $this->response->setStatusCode(Response::HTTP_BAD_REQUEST);
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
            if ($cuenta->loadFromCode('', [
                new DataBaseWhere('codcuenta', $codcuenta),
                new DataBaseWhere('codejercicio', $codejercicio),
            ])) {
                $parentFound = true;
                break;
            }
            $codcuenta = substr($codcuenta, 0, -1);
        }

        if (false === $parentFound) {
            $this->response->setStatusCode(Response::HTTP_BAD_REQUEST);
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
            $this->response->setStatusCode(Response::HTTP_INTERNAL_SERVER_ERROR);
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
            $this->response->setStatusCode(Response::HTTP_FORBIDDEN);
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
}
