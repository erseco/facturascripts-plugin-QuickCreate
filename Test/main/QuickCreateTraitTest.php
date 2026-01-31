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

use Closure;
use FacturaScripts\Plugins\QuickCreate\Trait\QuickCreateTrait;
use PHPUnit\Framework\TestCase;
use ReflectionClass;

class QuickCreateTraitTest extends TestCase
{
    private const TRAIT_NAME = 'FacturaScripts\\Plugins\\QuickCreate\\Trait\\QuickCreateTrait';

    // =========================================================================
    // TRAIT STRUCTURE TESTS
    // =========================================================================

    public function testTraitExists(): void
    {
        $this->assertTrue(
            trait_exists(self::TRAIT_NAME),
            'QuickCreateTrait should exist'
        );
    }

    public function testTraitIsNotAClass(): void
    {
        $this->assertFalse(
            class_exists(self::TRAIT_NAME),
            'QuickCreateTrait should be a trait, not a class'
        );
    }

    public function testTraitHasCorrectNamespace(): void
    {
        $reflection = new ReflectionClass(self::TRAIT_NAME);
        $this->assertEquals(
            'FacturaScripts\\Plugins\\QuickCreate\\Trait',
            $reflection->getNamespaceName(),
            'Trait should be in correct namespace'
        );
    }

    // =========================================================================
    // TRAIT METHOD TESTS
    // =========================================================================

    public function testTraitHasCreateViewsMethod(): void
    {
        $reflection = new ReflectionClass(self::TRAIT_NAME);
        $this->assertTrue(
            $reflection->hasMethod('createViews'),
            'QuickCreateTrait should have createViews method'
        );
    }

    public function testCreateViewsMethodIsPublic(): void
    {
        $reflection = new ReflectionClass(self::TRAIT_NAME);
        $method = $reflection->getMethod('createViews');
        $this->assertTrue(
            $method->isPublic(),
            'createViews method should be public'
        );
    }

    public function testCreateViewsMethodHasReturnType(): void
    {
        $reflection = new ReflectionClass(self::TRAIT_NAME);
        $method = $reflection->getMethod('createViews');
        $returnType = $method->getReturnType();

        $this->assertNotNull($returnType, 'createViews should have a return type');
        $this->assertEquals('Closure', $returnType->getName());
    }

    public function testCreateViewsMethodHasNoParameters(): void
    {
        $reflection = new ReflectionClass(self::TRAIT_NAME);
        $method = $reflection->getMethod('createViews');

        $this->assertEquals(
            0,
            $method->getNumberOfParameters(),
            'createViews should have no parameters'
        );
    }

    // =========================================================================
    // CLOSURE RETURN TESTS
    // =========================================================================

    public function testCreateViewsReturnsClosure(): void
    {
        $mockClass = new class {
            use QuickCreateTrait;
        };

        $result = $mockClass->createViews();

        $this->assertInstanceOf(
            Closure::class,
            $result,
            'createViews should return a Closure'
        );
    }

    public function testCreateViewsReturnsCallableClosure(): void
    {
        $mockClass = new class {
            use QuickCreateTrait;
        };

        $result = $mockClass->createViews();

        $this->assertTrue(
            is_callable($result),
            'createViews should return a callable Closure'
        );
    }

    public function testMultipleCallsReturnDifferentClosures(): void
    {
        $mockClass = new class {
            use QuickCreateTrait;
        };

        $closure1 = $mockClass->createViews();
        $closure2 = $mockClass->createViews();

        // Each call should return a new Closure instance
        $this->assertNotSame(
            $closure1,
            $closure2,
            'Multiple calls should return different Closure instances'
        );
    }

    // =========================================================================
    // EXTENSION USAGE TESTS
    // =========================================================================

    public function testExtensionsUseTrait(): void
    {
        $extensions = $this->getExtensionClasses();

        foreach ($extensions as $extensionClass) {
            $traits = class_uses($extensionClass);
            $this->assertContains(
                self::TRAIT_NAME,
                $traits,
                "Extension {$extensionClass} should use QuickCreateTrait"
            );
        }
    }

    public function testAllExtensionsHaveCreateViewsMethod(): void
    {
        $extensions = $this->getExtensionClasses();

        foreach ($extensions as $extensionClass) {
            $this->assertTrue(
                method_exists($extensionClass, 'createViews'),
                "Extension {$extensionClass} should have createViews method from trait"
            );
        }
    }

    public function testExtensionsCanCallCreateViews(): void
    {
        $extensions = $this->getExtensionClasses();

        foreach ($extensions as $extensionClass) {
            $instance = new $extensionClass();
            $result = $instance->createViews();

            $this->assertInstanceOf(
                Closure::class,
                $result,
                "Extension {$extensionClass}::createViews() should return Closure"
            );
        }
    }

    // =========================================================================
    // EDGE CASES
    // =========================================================================

    public function testTraitCanBeUsedInAnonymousClass(): void
    {
        $anonymous = new class {
            use QuickCreateTrait;
        };

        $this->assertInstanceOf(
            Closure::class,
            $anonymous->createViews()
        );
    }

    public function testTraitDoesNotDefineProperties(): void
    {
        $reflection = new ReflectionClass(self::TRAIT_NAME);
        $properties = $reflection->getProperties();

        $this->assertEmpty(
            $properties,
            'QuickCreateTrait should not define any properties'
        );
    }

    public function testTraitDoesNotDefineConstants(): void
    {
        $reflection = new ReflectionClass(self::TRAIT_NAME);
        $constants = $reflection->getConstants();

        $this->assertEmpty(
            $constants,
            'QuickCreateTrait should not define any constants'
        );
    }

    public function testTraitOnlyDefinesOneMethod(): void
    {
        $reflection = new ReflectionClass(self::TRAIT_NAME);
        $methods = $reflection->getMethods();

        $this->assertCount(
            1,
            $methods,
            'QuickCreateTrait should only define one method (createViews)'
        );
    }

    // =========================================================================
    // CLIENT EXTENSIONS TESTS
    // =========================================================================

    public function testClientExtensionsUseTrait(): void
    {
        $clientExtensions = [
            'FacturaScripts\\Plugins\\QuickCreate\\Extension\\Controller\\EditPresupuestoCliente',
            'FacturaScripts\\Plugins\\QuickCreate\\Extension\\Controller\\EditPedidoCliente',
            'FacturaScripts\\Plugins\\QuickCreate\\Extension\\Controller\\EditAlbaranCliente',
            'FacturaScripts\\Plugins\\QuickCreate\\Extension\\Controller\\EditFacturaCliente',
        ];

        foreach ($clientExtensions as $extensionClass) {
            $traits = class_uses($extensionClass);
            $this->assertContains(
                self::TRAIT_NAME,
                $traits,
                "Client extension {$extensionClass} should use QuickCreateTrait"
            );
        }
    }

    // =========================================================================
    // SUPPLIER EXTENSIONS TESTS
    // =========================================================================

    public function testSupplierExtensionsUseTrait(): void
    {
        $supplierExtensions = [
            'FacturaScripts\\Plugins\\QuickCreate\\Extension\\Controller\\EditPresupuestoProveedor',
            'FacturaScripts\\Plugins\\QuickCreate\\Extension\\Controller\\EditPedidoProveedor',
            'FacturaScripts\\Plugins\\QuickCreate\\Extension\\Controller\\EditAlbaranProveedor',
            'FacturaScripts\\Plugins\\QuickCreate\\Extension\\Controller\\EditFacturaProveedor',
        ];

        foreach ($supplierExtensions as $extensionClass) {
            $traits = class_uses($extensionClass);
            $this->assertContains(
                self::TRAIT_NAME,
                $traits,
                "Supplier extension {$extensionClass} should use QuickCreateTrait"
            );
        }
    }

    // =========================================================================
    // ACCOUNTING EXTENSION TESTS
    // =========================================================================

    public function testAccountingExtensionUsesTrait(): void
    {
        $extensionClass = 'FacturaScripts\\Plugins\\QuickCreate\\Extension\\Controller\\EditAsiento';
        $traits = class_uses($extensionClass);

        $this->assertContains(
            self::TRAIT_NAME,
            $traits,
            'EditAsiento extension should use QuickCreateTrait'
        );
    }

    // =========================================================================
    // HELPER METHODS
    // =========================================================================

    private function getExtensionClasses(): array
    {
        return [
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
    }
}
