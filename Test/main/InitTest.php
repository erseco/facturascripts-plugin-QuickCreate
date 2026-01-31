<?php

/**
 * This file is part of QuickCreate plugin for FacturaScripts.
 * Copyright (C) 2026 Ernesto Serrano <info@ernesto.es>
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Lesser General Public License as
 * published by the Free Software Foundation, either version 3 of the
 * License, or (at your option) any later version.
 */

namespace FacturaScripts\Test\Plugins\QuickCreate;

use FacturaScripts\Core\Template\InitClass;
use FacturaScripts\Plugins\QuickCreate\Init;
use PHPUnit\Framework\TestCase;
use ReflectionClass;

class InitTest extends TestCase
{
    private ReflectionClass $reflection;

    protected function setUp(): void
    {
        $this->reflection = new ReflectionClass(Init::class);
    }

    // =========================================================================
    // CLASS STRUCTURE TESTS
    // =========================================================================

    public function testClassExists(): void
    {
        $this->assertTrue(
            class_exists(Init::class),
            'Init class should exist'
        );
    }

    public function testExtendsInitClass(): void
    {
        $this->assertTrue(
            is_subclass_of(Init::class, InitClass::class),
            'Init should extend InitClass'
        );
    }

    public function testCorrectNamespace(): void
    {
        $this->assertEquals(
            'FacturaScripts\\Plugins\\QuickCreate',
            $this->reflection->getNamespaceName(),
            'Init should be in correct namespace'
        );
    }

    public function testClassIsNotAbstract(): void
    {
        $this->assertFalse(
            $this->reflection->isAbstract(),
            'Init class should not be abstract'
        );
    }

    public function testClassIsNotFinal(): void
    {
        $this->assertFalse(
            $this->reflection->isFinal(),
            'Init class should not be final'
        );
    }

    // =========================================================================
    // METHOD EXISTENCE TESTS
    // =========================================================================

    public function testInitMethodExists(): void
    {
        $this->assertTrue(
            method_exists(Init::class, 'init'),
            'init method should exist'
        );
    }

    public function testUpdateMethodExists(): void
    {
        $this->assertTrue(
            method_exists(Init::class, 'update'),
            'update method should exist'
        );
    }

    public function testUninstallMethodExists(): void
    {
        $this->assertTrue(
            method_exists(Init::class, 'uninstall'),
            'uninstall method should exist'
        );
    }

    // =========================================================================
    // METHOD VISIBILITY TESTS
    // =========================================================================

    public function testInitMethodIsPublic(): void
    {
        $method = $this->reflection->getMethod('init');
        $this->assertTrue($method->isPublic(), 'init method should be public');
    }

    public function testUpdateMethodIsPublic(): void
    {
        $method = $this->reflection->getMethod('update');
        $this->assertTrue($method->isPublic(), 'update method should be public');
    }

    public function testUninstallMethodIsPublic(): void
    {
        $method = $this->reflection->getMethod('uninstall');
        $this->assertTrue($method->isPublic(), 'uninstall method should be public');
    }

    // =========================================================================
    // METHOD RETURN TYPE TESTS
    // =========================================================================

    public function testInitMethodReturnType(): void
    {
        $method = $this->reflection->getMethod('init');
        $returnType = $method->getReturnType();
        $this->assertNotNull($returnType, 'init method should have a return type');
        $this->assertEquals('void', $returnType->getName());
    }

    public function testUpdateMethodReturnType(): void
    {
        $method = $this->reflection->getMethod('update');
        $returnType = $method->getReturnType();
        $this->assertNotNull($returnType, 'update method should have a return type');
        $this->assertEquals('void', $returnType->getName());
    }

    public function testUninstallMethodReturnType(): void
    {
        $method = $this->reflection->getMethod('uninstall');
        $returnType = $method->getReturnType();
        $this->assertNotNull($returnType, 'uninstall method should have a return type');
        $this->assertEquals('void', $returnType->getName());
    }

    // =========================================================================
    // EXTENSION CLASSES EXISTENCE TESTS
    // =========================================================================

    public function testClientDocumentExtensionsExist(): void
    {
        $clientExtensions = [
            'FacturaScripts\\Plugins\\QuickCreate\\Extension\\Controller\\EditPresupuestoCliente',
            'FacturaScripts\\Plugins\\QuickCreate\\Extension\\Controller\\EditPedidoCliente',
            'FacturaScripts\\Plugins\\QuickCreate\\Extension\\Controller\\EditAlbaranCliente',
            'FacturaScripts\\Plugins\\QuickCreate\\Extension\\Controller\\EditFacturaCliente',
        ];

        foreach ($clientExtensions as $extensionClass) {
            $this->assertTrue(
                class_exists($extensionClass),
                "Client extension class {$extensionClass} should exist"
            );
        }
    }

    public function testSupplierDocumentExtensionsExist(): void
    {
        $supplierExtensions = [
            'FacturaScripts\\Plugins\\QuickCreate\\Extension\\Controller\\EditPresupuestoProveedor',
            'FacturaScripts\\Plugins\\QuickCreate\\Extension\\Controller\\EditPedidoProveedor',
            'FacturaScripts\\Plugins\\QuickCreate\\Extension\\Controller\\EditAlbaranProveedor',
            'FacturaScripts\\Plugins\\QuickCreate\\Extension\\Controller\\EditFacturaProveedor',
        ];

        foreach ($supplierExtensions as $extensionClass) {
            $this->assertTrue(
                class_exists($extensionClass),
                "Supplier extension class {$extensionClass} should exist"
            );
        }
    }

    public function testAccountingExtensionExists(): void
    {
        $this->assertTrue(
            class_exists('FacturaScripts\\Plugins\\QuickCreate\\Extension\\Controller\\EditAsiento'),
            'EditAsiento extension should exist'
        );
    }

    // =========================================================================
    // EXTENSION CLASSES STRUCTURE TESTS
    // =========================================================================

    public function testAllExtensionsAreInstantiable(): void
    {
        $extensions = [
            'FacturaScripts\\Plugins\\QuickCreate\\Extension\\Controller\\EditPresupuestoCliente',
            'FacturaScripts\\Plugins\\QuickCreate\\Extension\\Controller\\EditPedidoCliente',
            'FacturaScripts\\Plugins\\QuickCreate\\Extension\\Controller\\EditAlbaranCliente',
            'FacturaScripts\\Plugins\\QuickCreate\\Extension\\Controller\\EditFacturaCliente',
            'FacturaScripts\\Plugins\\QuickCreate\\Extension\\Controller\\EditPresupuestoProveedor',
            'FacturaScripts\\Plugins\\QuickCreate\\Extension\\Controller\\EditPedidoProveedor',
            'FacturaScripts\\Plugins\\QuickCreate\\Extension\\Controller\\EditAlbaranProveedor',
            'FacturaScripts\\Plugins\\QuickCreate\\Extension\\Controller\\EditFacturaProveedor',
            'FacturaScripts\\Plugins\\QuickCreate\\Extension\\Controller\\EditAsiento',
        ];

        foreach ($extensions as $extensionClass) {
            $reflection = new ReflectionClass($extensionClass);
            $this->assertTrue(
                $reflection->isInstantiable(),
                "Extension {$extensionClass} should be instantiable"
            );
        }
    }

    public function testExtensionCount(): void
    {
        // We expect exactly 9 extensions: 4 client + 4 supplier + 1 accounting
        $extensions = [
            'FacturaScripts\\Plugins\\QuickCreate\\Extension\\Controller\\EditPresupuestoCliente',
            'FacturaScripts\\Plugins\\QuickCreate\\Extension\\Controller\\EditPedidoCliente',
            'FacturaScripts\\Plugins\\QuickCreate\\Extension\\Controller\\EditAlbaranCliente',
            'FacturaScripts\\Plugins\\QuickCreate\\Extension\\Controller\\EditFacturaCliente',
            'FacturaScripts\\Plugins\\QuickCreate\\Extension\\Controller\\EditPresupuestoProveedor',
            'FacturaScripts\\Plugins\\QuickCreate\\Extension\\Controller\\EditPedidoProveedor',
            'FacturaScripts\\Plugins\\QuickCreate\\Extension\\Controller\\EditAlbaranProveedor',
            'FacturaScripts\\Plugins\\QuickCreate\\Extension\\Controller\\EditFacturaProveedor',
            'FacturaScripts\\Plugins\\QuickCreate\\Extension\\Controller\\EditAsiento',
        ];

        $existingCount = 0;
        foreach ($extensions as $ext) {
            if (class_exists($ext)) {
                $existingCount++;
            }
        }

        $this->assertEquals(9, $existingCount, 'Should have exactly 9 extension classes');
    }

    // =========================================================================
    // EXTENSION CLASSES NAMESPACE TESTS
    // =========================================================================

    public function testExtensionsHaveCorrectNamespace(): void
    {
        $extensions = [
            'FacturaScripts\\Plugins\\QuickCreate\\Extension\\Controller\\EditPresupuestoCliente',
            'FacturaScripts\\Plugins\\QuickCreate\\Extension\\Controller\\EditPedidoCliente',
            'FacturaScripts\\Plugins\\QuickCreate\\Extension\\Controller\\EditAlbaranCliente',
            'FacturaScripts\\Plugins\\QuickCreate\\Extension\\Controller\\EditFacturaCliente',
            'FacturaScripts\\Plugins\\QuickCreate\\Extension\\Controller\\EditPresupuestoProveedor',
            'FacturaScripts\\Plugins\\QuickCreate\\Extension\\Controller\\EditPedidoProveedor',
            'FacturaScripts\\Plugins\\QuickCreate\\Extension\\Controller\\EditAlbaranProveedor',
            'FacturaScripts\\Plugins\\QuickCreate\\Extension\\Controller\\EditFacturaProveedor',
            'FacturaScripts\\Plugins\\QuickCreate\\Extension\\Controller\\EditAsiento',
        ];

        $expectedNamespace = 'FacturaScripts\\Plugins\\QuickCreate\\Extension\\Controller';

        foreach ($extensions as $extensionClass) {
            $reflection = new ReflectionClass($extensionClass);
            $this->assertEquals(
                $expectedNamespace,
                $reflection->getNamespaceName(),
                "Extension {$extensionClass} should be in correct namespace"
            );
        }
    }

    // =========================================================================
    // EDGE CASES
    // =========================================================================

    public function testInitClassCanBeInstantiated(): void
    {
        // Init should be instantiable (without constructor args)
        $init = new Init();
        $this->assertInstanceOf(Init::class, $init);
    }

    public function testInitInheritsLoadExtensionMethod(): void
    {
        $this->assertTrue(
            method_exists(Init::class, 'loadExtension'),
            'Init should inherit loadExtension method from InitClass'
        );
    }
}
