<?php

/**
 * Copyright (C) 2026 Ernesto Serrano <info@ernesto.es>
 * SPDX-License-Identifier: LGPL-3.0-or-later
 */

namespace FacturaScripts\Test\Plugins\QuickCreate;

use FacturaScripts\Core\Base\ControllerPermissions;
use FacturaScripts\Core\Lib\AssetManager;
use FacturaScripts\Core\Request;
use FacturaScripts\Core\Response;
use FacturaScripts\Core\Session;
use FacturaScripts\Core\Tools;
use FacturaScripts\Core\Where;
use FacturaScripts\Dinamic\Model\Almacen;
use FacturaScripts\Dinamic\Model\Cuenta;
use FacturaScripts\Dinamic\Model\Ejercicio;
use FacturaScripts\Dinamic\Model\Fabricante;
use FacturaScripts\Dinamic\Model\Familia;
use FacturaScripts\Dinamic\Model\Impuesto;
use FacturaScripts\Dinamic\Model\Producto;
use FacturaScripts\Dinamic\Model\Proveedor;
use FacturaScripts\Dinamic\Model\Subcuenta;
use FacturaScripts\Dinamic\Model\User;
use FacturaScripts\Dinamic\Model\Variante;
use FacturaScripts\Plugins\QuickCreate\Controller\QuickCreateAction;
use FacturaScripts\Plugins\QuickCreate\Extension\Controller\EditFacturaCliente as QuickCreateExtension;
use FacturaScripts\Plugins\QuickCreate\Init;
use PHPUnit\Framework\TestCase;

final class QuickCreateFlowTest extends TestCase
{
    private array $cleanup = [];
    private $originalPermissions;

    protected function setUp(): void
    {
        $this->originalPermissions = Session::get('permissions');
    }

    protected function tearDown(): void
    {
        foreach (array_reverse($this->cleanup) as $model) {
            $model->delete();
        }
        Session::set('permissions', $this->originalPermissions);
        Tools::log()->clear();
    }

    public function testAllActionsRequireTheirPermission(): void
    {
        foreach (
            [
            'create-product', 'create-account', 'get-product-options', 'search-subcuenta',
            'get-exercise-info', 'search-cuentas', 'get-next-subcuenta-code', 'create-subcuenta',
            ] as $action
        ) {
            $result = $this->call($action, [], 403, false);
            self::assertFalse($result['ok']);
        }
        self::assertFalse($this->call('unknown', [], 400)['ok']);
        $init = new Init();
        $init->init();
        $init->update();
        $init->uninstall();
        self::assertFalse((new QuickCreateAction('QuickCreateAction'))->getPageData()['showonmenu']);
    }

    public function testExtensionLoadsAssetsOnlyWithPermissions(): void
    {
        try {
            foreach (
                [
                new \FacturaScripts\Core\Controller\EditFacturaCliente('EditFacturaCliente'),
                new \FacturaScripts\Core\Controller\EditAsiento('EditAsiento'),
                ] as $page
            ) {
                $page->user = $this->getMockBuilder(User::class)->onlyMethods(['can'])->getMock();
                $page->user->method('can')->willReturn(false, false, true, true);
                AssetManager::clear();
                (new QuickCreateExtension())->createViews()->call($page);
                self::assertSame([], AssetManager::getJs());
                (new QuickCreateExtension())->createViews()->call($page);
                self::assertNotEmpty(AssetManager::getJs());
                self::assertNotEmpty(AssetManager::getCss());
            }
            $host = new class () {
                public $user;
            };
            $host->user = new class () {
                public function can(string $page): bool
                {
                    throw new \RuntimeException('Permission service unavailable');
                }
            };
            (new QuickCreateExtension())->createViews()->call($host);
            self::assertNotEmpty(Tools::log()->read('', ['error']));
        } finally {
            AssetManager::clear();
        }
    }

    public function testProductCreationPersistsVariantAndRejectsDuplicates(): void
    {
        $family = new Familia();
        $family->descripcion = 'Quick coverage';
        self::assertTrue($family->save());
        $this->cleanup[] = $family;
        $manufacturer = new Fabricante();
        $manufacturer->nombre = 'Quick coverage';
        self::assertTrue($manufacturer->save());
        $this->cleanup[] = $manufacturer;
        $supplier = new Proveedor();
        $supplier->nombre = 'Quick coverage';
        $supplier->cifnif = substr(uniqid(), -9);
        self::assertTrue($supplier->save(), json_encode(Tools::log()->read('', ['warning', 'error'])));
        $this->cleanup[] = $supplier;
        $tax = new Impuesto();
        $tax->codimpuesto = 'Q' . substr(uniqid(), -6);
        $tax->descripcion = 'Quick coverage';
        $tax->iva = 0;
        self::assertTrue($tax->save());
        $this->cleanup[] = $tax;
        $reference = uniqid('QC-');
        $result = $this->call('create-product', [
            'referencia' => $reference, 'descripcion' => 'Created through API', 'precio' => '12.5',
            'codfamilia' => $family->codfamilia, 'codfabricante' => $manufacturer->codfabricante,
            'codimpuesto' => $tax->codimpuesto, 'nostock' => 'TRUE', 'ventasinstock' => 'TRUE',
            'publico' => 'TRUE', 'codbarras' => '123456789', 'codproveedor' => $supplier->codproveedor,
            'preciocompra' => '10', 'dtopor' => '10', 'margen' => '20',
        ]);
        self::assertTrue($result['ok']);
        $product = Producto::find($result['data']['idproducto']);
        self::assertNotNull($product);
        $this->cleanup[] = $product;
        $variant = Variante::find($result['data']['idvariante']);
        self::assertEquals(9, $variant->coste);
        self::assertSame('123456789', $variant->codbarras);
        self::assertTrue($product->nostock);
        self::assertFalse($this->call('create-product', ['referencia' => $reference], 400)['ok']);
        self::assertFalse($this->call('create-product', [], 400)['ok']);
        self::assertFalse($this->call('create-product', ['referencia' => str_repeat('x', 100)], 500)['ok']);
        $options = $this->call('get-product-options')['data'];
        self::assertContains(
            (string)$family->codfamilia,
            array_map('strval', array_column($options['familias'], 'value'))
        );
        self::assertContains(
            (string)$manufacturer->codfabricante,
            array_map('strval', array_column($options['fabricantes'], 'value'))
        );
        self::assertContains(
            (string)$supplier->codproveedor,
            array_map('strval', array_column($options['proveedores'], 'value'))
        );
        self::assertNotEmpty($options['impuestos']);
    }

    public function testProductWithoutMarginAndWithInitialStock(): void
    {
        $warehouses = Almacen::all();
        self::assertNotEmpty($warehouses);
        foreach ([0, 5] as $cost) {
            $result = $this->call('create-product', [
                'referencia' => uniqid('QCS-'), 'descripcion' => 'Stock fixture', 'precio' => '15',
                'stock' => '3', 'codalmacen' => $warehouses[0]->codalmacen, 'preciocompra' => (string)$cost,
            ]);
            self::assertTrue($result['ok']);
            $product = Producto::find($result['data']['idproducto']);
            $this->cleanup[] = $product;
            $variant = Variante::find($result['data']['idvariante']);
            self::assertEquals(15, $variant->precio);
            self::assertEquals($cost, $variant->coste);
        }
    }

    public function testAccountsAndSuggestionsUseRealExercise(): void
    {
        [$exercise, $account] = $this->account();
        $code = str_pad($account->codcuenta, $exercise->longsubcuenta - 1, '0') . '1';
        $result = $this->call('create-account', [
            'codsubcuenta' => $code, 'codejercicio' => $exercise->codejercicio,
        ]);
        self::assertTrue($result['ok']);
        $sub = Subcuenta::find($result['data']['idsubcuenta']);
        $this->cleanup[] = $sub;
        self::assertSame($account->descripcion, $sub->descripcion);
        self::assertEquals($account->idcuenta, $sub->idcuenta);
        self::assertFalse($this->call('create-account', [
            'codsubcuenta' => $code, 'codejercicio' => $exercise->codejercicio,
        ], 400)['ok']);
        $next = $this->call('get-next-subcuenta-code', ['idcuenta' => (string)$account->idcuenta]);
        self::assertSame(substr($code, 0, -1) . '2', $next['data']['codsubcuenta']);
        $result = $this->call('create-subcuenta', [
            'idcuenta' => (string)$account->idcuenta, 'codsubcuenta' => $next['data']['codsubcuenta'],
            'codejercicio' => $exercise->codejercicio, 'descripcion' => 'Distinct search label',
        ]);
        self::assertTrue($result['ok']);
        $this->cleanup[] = Subcuenta::find($result['data']['idsubcuenta']);
        self::assertFalse($this->call('create-subcuenta', [
            'idcuenta' => (string)$account->idcuenta, 'codsubcuenta' => $next['data']['codsubcuenta'],
        ], 400)['ok']);
        $queries = [$account->codcuenta, $account->codcuenta . '.1', $account->codcuenta . '.3', 'Distinct search'];
        foreach ($queries as $query) {
            $search = $this->call('search-subcuenta', ['query' => $query]);
            self::assertTrue($search['ok']);
            self::assertSame($exercise->codejercicio, $search['codejercicio']);
        }
        self::assertSame([], $this->call('search-subcuenta')['data']);
        self::assertNotEmpty($this->call('search-cuentas')['data']);
        $search = $this->call('search-cuentas', ['query' => $account->codcuenta]);
        self::assertContains((int)$account->idcuenta, array_map('intval', array_column($search['data'], 'idcuenta')));
        self::assertSame($exercise->codejercicio, $this->call('get-exercise-info')['data']['codejercicio']);
    }

    public function testInvalidAccountRequestsDoNotCreateRecords(): void
    {
        [$exercise, $account] = $this->account();
        foreach (
            [
            ['create-account', [], 400],
            ['create-account', ['codsubcuenta' => '123', 'codejercicio' => 'missing'], 400],
            ['create-account', ['codsubcuenta' => '123', 'codejercicio' => $exercise->codejercicio], 400],
            ['create-account', [
                'codsubcuenta' => str_repeat('x', $exercise->longsubcuenta),
                'codejercicio' => $exercise->codejercicio,
            ], 400],
            ['get-next-subcuenta-code', [], 400],
            ['get-next-subcuenta-code', ['idcuenta' => '2147483647'], 404],
            ['get-next-subcuenta-code', ['idcuenta' => (string)$account->idcuenta, 'codejercicio' => 'missing'], 400],
            ['create-subcuenta', [], 400],
            ['create-subcuenta', ['idcuenta' => '2147483647', 'codsubcuenta' => '123'], 404],
            ['create-subcuenta', [
                'idcuenta' => (string)$account->idcuenta, 'codsubcuenta' => '123', 'codejercicio' => 'missing',
            ], 400],
            ['create-subcuenta', ['idcuenta' => (string)$account->idcuenta, 'codsubcuenta' => 'bad'], 500],
            ] as [$action, $data, $status]
        ) {
            self::assertFalse($this->call($action, $data, $status)['ok']);
        }
    }

    private function account(): array
    {
        $exercise = new Ejercicio();
        self::assertTrue($exercise->loadWhere([Where::eq('estado', 'ABIERTO')]));
        $account = new Cuenta();
        for ($prefix = 850; $prefix < 1000; $prefix++) {
            $where = [Where::eq('codcuenta', (string)$prefix), Where::eq('codejercicio', $exercise->codejercicio)];
            if (!Cuenta::count($where)) {
                $account->codcuenta = (string)$prefix;
                break;
            }
        }
        $account->codejercicio = $exercise->codejercicio;
        $account->descripcion = uniqid('Quick coverage ');
        self::assertTrue($account->save());
        $this->cleanup[] = $account;
        return [$exercise, $account];
    }

    private function call(string $action, array $data = [], int $status = 200, bool $allowed = true): array
    {
        $user = $this->getMockBuilder(User::class)->onlyMethods(['can'])->getMock();
        $user->method('can')->willReturn($allowed);
        $user->nick = 'quick-test';
        $controller = new QuickCreateAction('QuickCreateAction');
        $controller->request = new Request(['request' => ['action' => $action] + $data]);
        $response = new Response();
        $permissions = new ControllerPermissions();
        $permissions->allowAccess = true;
        $controller->privateCore($response, $user, $permissions);
        $result = json_decode($response->getContent(), true, 512, JSON_THROW_ON_ERROR);
        self::assertSame($status, $response->getHttpCode(), json_encode($result));
        return $result;
    }
}
