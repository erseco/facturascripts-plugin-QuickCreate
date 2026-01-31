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

use FacturaScripts\Core\Base\Controller;
use FacturaScripts\Plugins\QuickCreate\Controller\QuickCreateAction;
use PHPUnit\Framework\Attributes\DataProvider;
use PHPUnit\Framework\TestCase;
use ReflectionClass;
use ReflectionMethod;

class QuickCreateActionTest extends TestCase
{
    private QuickCreateAction $controller;
    private ReflectionMethod $transformMethod;
    private ReflectionClass $reflection;

    protected function setUp(): void
    {
        $this->reflection = new ReflectionClass(QuickCreateAction::class);
        $this->controller = $this->reflection->newInstanceWithoutConstructor();

        $this->transformMethod = $this->reflection->getMethod('transformCodsubcuenta');
        $this->transformMethod->setAccessible(true);
    }

    // =========================================================================
    // CLASS STRUCTURE TESTS
    // =========================================================================

    public function testClassExists(): void
    {
        $this->assertTrue(
            class_exists(QuickCreateAction::class),
            'QuickCreateAction class should exist'
        );
    }

    public function testExtendsController(): void
    {
        $this->assertTrue(
            is_subclass_of(QuickCreateAction::class, Controller::class),
            'QuickCreateAction should extend Controller'
        );
    }

    public function testCorrectNamespace(): void
    {
        $this->assertEquals(
            'FacturaScripts\\Plugins\\QuickCreate\\Controller',
            $this->reflection->getNamespaceName(),
            'Class should be in correct namespace'
        );
    }

    // =========================================================================
    // METHOD EXISTENCE TESTS
    // =========================================================================

    public function testGetPageDataMethodExists(): void
    {
        $this->assertTrue(
            method_exists(QuickCreateAction::class, 'getPageData'),
            'getPageData method should exist'
        );
    }

    public function testPrivateCoreMethodExists(): void
    {
        $this->assertTrue(
            method_exists(QuickCreateAction::class, 'privateCore'),
            'privateCore method should exist'
        );
    }

    public function testRequiredActionsExist(): void
    {
        $requiredMethods = [
            'createProduct',
            'createAccount',
            'getProductOptions',
            'searchSubcuenta',
            'getExerciseInfo',
            'searchCuentas',
            'getNextSubcuentaCode',
            'createSubcuenta',
            'transformCodsubcuenta',
            'getNextFreeSubcuentaCode',
        ];

        foreach ($requiredMethods as $method) {
            $this->assertTrue(
                $this->reflection->hasMethod($method),
                "Method {$method} should exist in QuickCreateAction"
            );
        }
    }

    // =========================================================================
    // METHOD VISIBILITY TESTS
    // =========================================================================

    public function testPublicMethodsVisibility(): void
    {
        $publicMethods = ['getPageData', 'privateCore'];

        foreach ($publicMethods as $methodName) {
            $method = $this->reflection->getMethod($methodName);
            $this->assertTrue(
                $method->isPublic(),
                "Method {$methodName} should be public"
            );
        }
    }

    public function testProtectedMethodsVisibility(): void
    {
        $protectedMethods = [
            'createProduct',
            'createAccount',
            'getProductOptions',
            'searchSubcuenta',
            'getExerciseInfo',
            'searchCuentas',
            'getNextSubcuentaCode',
            'createSubcuenta',
            'transformCodsubcuenta',
            'getNextFreeSubcuentaCode',
        ];

        foreach ($protectedMethods as $methodName) {
            $method = $this->reflection->getMethod($methodName);
            $this->assertTrue(
                $method->isProtected(),
                "Method {$methodName} should be protected"
            );
        }
    }

    // =========================================================================
    // TRANSFORM CODSUBCUENTA - BASIC TESTS
    // =========================================================================

    public function testTransformWithoutDot(): void
    {
        $result = $this->transformMethod->invoke($this->controller, '570', 10);
        $this->assertEquals('570', $result);
    }

    public function testTransformWithDot(): void
    {
        $result = $this->transformMethod->invoke($this->controller, '570.1', 10);
        $this->assertEquals('5700000001', $result);
    }

    public function testTransformWithLongerSuffix(): void
    {
        $result = $this->transformMethod->invoke($this->controller, '570.123', 10);
        $this->assertEquals('5700000123', $result);
    }

    public function testTransformWith8Digits(): void
    {
        $result = $this->transformMethod->invoke($this->controller, '43.1', 8);
        $this->assertEquals('43000001', $result);
    }

    // =========================================================================
    // TRANSFORM CODSUBCUENTA - EDGE CASES: DOTS
    // =========================================================================

    public function testTransformWithMultipleDots(): void
    {
        $result = $this->transformMethod->invoke($this->controller, '570.1.2', 10);
        $this->assertEquals('570.1.2', $result, 'Multiple dots should return as-is');
    }

    public function testTransformWithOnlyDot(): void
    {
        // Single dot splits into ['', ''], which is 2 parts, so it transforms
        // paddingLength = 10 - 0 = 10, str_pad('', 10, '0') = '0000000000'
        $result = $this->transformMethod->invoke($this->controller, '.', 10);
        $this->assertEquals('0000000000', $result);
    }

    public function testTransformWithDotAtBeginning(): void
    {
        $result = $this->transformMethod->invoke($this->controller, '.123', 10);
        // Parts: ['', '123'] - prefix='', suffix='123'
        // paddingLength = 10 - 3 = 7, str_pad('', 7, '0') = '0000000'
        $result = $this->transformMethod->invoke($this->controller, '.123', 10);
        $this->assertEquals('0000000123', $result);
    }

    public function testTransformWithDotAtEnd(): void
    {
        $result = $this->transformMethod->invoke($this->controller, '570.', 10);
        // Parts: ['570', ''] - prefix='570', suffix=''
        // paddingLength = 10 - 0 = 10, str_pad('570', 10, '0') = '5700000000'
        $this->assertEquals('5700000000', $result);
    }

    public function testTransformWithConsecutiveDots(): void
    {
        $result = $this->transformMethod->invoke($this->controller, '570..1', 10);
        $this->assertEquals('570..1', $result, 'Consecutive dots means >2 parts, return as-is');
    }

    // =========================================================================
    // TRANSFORM CODSUBCUENTA - EDGE CASES: WHITESPACE
    // =========================================================================

    public function testTransformWithLeadingWhitespace(): void
    {
        $result = $this->transformMethod->invoke($this->controller, '   570', 10);
        $this->assertEquals('570', $result);
    }

    public function testTransformWithTrailingWhitespace(): void
    {
        $result = $this->transformMethod->invoke($this->controller, '570   ', 10);
        $this->assertEquals('570', $result);
    }

    public function testTransformWithBothWhitespace(): void
    {
        $result = $this->transformMethod->invoke($this->controller, '  570  ', 10);
        $this->assertEquals('570', $result);
    }

    public function testTransformWithTabCharacter(): void
    {
        $result = $this->transformMethod->invoke($this->controller, "\t570\t", 10);
        $this->assertEquals('570', $result);
    }

    public function testTransformWithNewlineCharacter(): void
    {
        $result = $this->transformMethod->invoke($this->controller, "\n570\n", 10);
        $this->assertEquals('570', $result);
    }

    public function testTransformWithMixedWhitespace(): void
    {
        $result = $this->transformMethod->invoke($this->controller, " \t\n570 \t\n", 10);
        $this->assertEquals('570', $result);
    }

    public function testTransformWithWhitespaceAroundDot(): void
    {
        // Trim only affects outer whitespace, not around dot
        $result = $this->transformMethod->invoke($this->controller, '  570.1  ', 10);
        $this->assertEquals('5700000001', $result);
    }

    // =========================================================================
    // TRANSFORM CODSUBCUENTA - EDGE CASES: EMPTY/NULL-ISH VALUES
    // =========================================================================

    public function testTransformWithEmptyString(): void
    {
        $result = $this->transformMethod->invoke($this->controller, '', 10);
        $this->assertEquals('', $result);
    }

    public function testTransformWithOnlyWhitespace(): void
    {
        $result = $this->transformMethod->invoke($this->controller, '   ', 10);
        $this->assertEquals('', $result);
    }

    public function testTransformWithZero(): void
    {
        $result = $this->transformMethod->invoke($this->controller, '0', 10);
        $this->assertEquals('0', $result);
    }

    public function testTransformWithZeroDotZero(): void
    {
        $result = $this->transformMethod->invoke($this->controller, '0.0', 10);
        $this->assertEquals('0000000000', $result);
    }

    // =========================================================================
    // TRANSFORM CODSUBCUENTA - EDGE CASES: DIFFERENT LENGTHS
    // =========================================================================

    public function testTransformWithLength6(): void
    {
        $result = $this->transformMethod->invoke($this->controller, '43.1', 6);
        $this->assertEquals('430001', $result);
    }

    public function testTransformWithLength8(): void
    {
        $result = $this->transformMethod->invoke($this->controller, '43.1', 8);
        $this->assertEquals('43000001', $result);
    }

    public function testTransformWithLength10(): void
    {
        $result = $this->transformMethod->invoke($this->controller, '43.1', 10);
        $this->assertEquals('4300000001', $result);
    }

    public function testTransformWithLength12(): void
    {
        $result = $this->transformMethod->invoke($this->controller, '43.1', 12);
        $this->assertEquals('430000000001', $result);
    }

    public function testTransformWithVeryShortLength(): void
    {
        $result = $this->transformMethod->invoke($this->controller, '4.1', 4);
        $this->assertEquals('4001', $result);
    }

    public function testTransformWithMinimalLength(): void
    {
        $result = $this->transformMethod->invoke($this->controller, '4.1', 2);
        // paddingLength = 2 - 1 = 1, str_pad('4', 1, '0') = '4' (no padding needed)
        $this->assertEquals('41', $result);
    }

    // =========================================================================
    // TRANSFORM CODSUBCUENTA - EDGE CASES: PREFIX/SUFFIX LENGTHS
    // =========================================================================

    public function testTransformWithVeryLongPrefix(): void
    {
        $result = $this->transformMethod->invoke($this->controller, '12345678.1', 10);
        // paddingLength = 10 - 1 = 9, str_pad('12345678', 9, '0') = '123456780'
        $this->assertEquals('1234567801', $result);
    }

    public function testTransformWithPrefixEqualToLength(): void
    {
        $result = $this->transformMethod->invoke($this->controller, '1234567890.1', 10);
        // paddingLength = 10 - 1 = 9, but prefix is 10 chars
        // str_pad doesn't truncate, so result will be longer
        $this->assertEquals('12345678901', $result);
    }

    public function testTransformWithVeryLongSuffix(): void
    {
        $result = $this->transformMethod->invoke($this->controller, '5.123456789', 10);
        // paddingLength = 10 - 9 = 1, str_pad('5', 1, '0') = '5'
        $this->assertEquals('5123456789', $result);
    }

    public function testTransformWithSuffixLongerThanSpace(): void
    {
        $result = $this->transformMethod->invoke($this->controller, '570.12345678', 10);
        // paddingLength = 10 - 8 = 2, str_pad('570', 2, '0') = '570' (already >= 2)
        $this->assertEquals('57012345678', $result);
    }

    public function testTransformWithSingleDigitPrefix(): void
    {
        $result = $this->transformMethod->invoke($this->controller, '4.1', 10);
        $this->assertEquals('4000000001', $result);
    }

    public function testTransformWithSingleDigitSuffix(): void
    {
        $result = $this->transformMethod->invoke($this->controller, '4300.1', 10);
        $this->assertEquals('4300000001', $result);
    }

    // =========================================================================
    // TRANSFORM CODSUBCUENTA - EDGE CASES: SPECIAL CHARACTERS
    // =========================================================================

    public function testTransformWithLettersInCode(): void
    {
        $result = $this->transformMethod->invoke($this->controller, 'ABC', 10);
        $this->assertEquals('ABC', $result, 'Letters without dot should pass through');
    }

    public function testTransformWithLettersAndDot(): void
    {
        $result = $this->transformMethod->invoke($this->controller, 'ABC.1', 10);
        // This will still transform: paddingLength = 10 - 1 = 9
        $this->assertEquals('ABC0000001', $result);
    }

    public function testTransformWithMixedAlphanumeric(): void
    {
        $result = $this->transformMethod->invoke($this->controller, '5A0.1', 10);
        $this->assertEquals('5A00000001', $result);
    }

    public function testTransformWithSpecialCharacters(): void
    {
        $result = $this->transformMethod->invoke($this->controller, '570-1', 10);
        $this->assertEquals('570-1', $result, 'Special chars without dot pass through');
    }

    public function testTransformWithUnderscore(): void
    {
        $result = $this->transformMethod->invoke($this->controller, '570_1', 10);
        $this->assertEquals('570_1', $result);
    }

    // =========================================================================
    // TRANSFORM CODSUBCUENTA - DATA PROVIDER TESTS
    // =========================================================================

    public static function transformCodsubcuentaProvider(): array
    {
        return [
            // [input, longsubcuenta, expected, description]
            'simple code' => ['570', 10, '570'],
            'dot notation basic' => ['570.1', 10, '5700000001'],
            'dot notation long suffix' => ['570.999', 10, '5700000999'],
            'short length' => ['43.1', 6, '430001'],
            'medium length' => ['43.1', 8, '43000001'],
            'long length' => ['43.1', 12, '430000000001'],
            'empty string' => ['', 10, ''],
            'only zeros' => ['000.000', 10, '0000000000'],
            'trailing zeros in suffix' => ['57.100', 10, '5700000100'],
            'common account 400' => ['400.1', 10, '4000000001'],
            'common account 430' => ['430.1', 10, '4300000001'],
            'common account 570' => ['570.1', 10, '5700000001'],
            'common account 600' => ['600.1', 10, '6000000001'],
            'common account 700' => ['700.1', 10, '7000000001'],
        ];
    }

    /**
     * @dataProvider transformCodsubcuentaProvider
     */
    #[DataProvider('transformCodsubcuentaProvider')]
    public function testTransformCodsubcuentaWithProvider(
        string $input,
        int $longsubcuenta,
        string $expected
    ): void {
        $result = $this->transformMethod->invoke($this->controller, $input, $longsubcuenta);
        $this->assertEquals($expected, $result);
    }

    // =========================================================================
    // TRANSFORM CODSUBCUENTA - BOUNDARY TESTS
    // =========================================================================

    public function testTransformWithMaxReasonableLength(): void
    {
        $result = $this->transformMethod->invoke($this->controller, '4.1', 20);
        $this->assertEquals('40000000000000000001', $result);
    }

    public function testTransformResultLength(): void
    {
        // Verify that result length equals longsubcuenta for valid transformations
        $result = $this->transformMethod->invoke($this->controller, '570.1', 10);
        $this->assertEquals(10, strlen($result));

        $result = $this->transformMethod->invoke($this->controller, '43.1', 8);
        $this->assertEquals(8, strlen($result));
    }

    public function testTransformPreservesNumericValue(): void
    {
        // After transformation, the numeric suffix should be preserved
        $result = $this->transformMethod->invoke($this->controller, '570.42', 10);
        $this->assertStringEndsWith('42', $result);
        $this->assertStringStartsWith('570', $result);
    }

    // =========================================================================
    // GETPAGEDATA TESTS
    // =========================================================================

    public function testGetPageDataReturnsArray(): void
    {
        $method = $this->reflection->getMethod('getPageData');
        // We can't call this without a full controller setup, but we can verify return type
        $returnType = $method->getReturnType();
        $this->assertEquals('array', $returnType->getName());
    }

    // =========================================================================
    // REGRESSION TESTS - REAL WORLD SCENARIOS
    // =========================================================================

    public function testRealWorldScenarioClientAccount(): void
    {
        // Common pattern: 430.1 for first client in Spanish accounting
        $result = $this->transformMethod->invoke($this->controller, '430.1', 10);
        $this->assertEquals('4300000001', $result);
    }

    public function testRealWorldScenarioSupplierAccount(): void
    {
        // Common pattern: 400.1 for first supplier in Spanish accounting
        $result = $this->transformMethod->invoke($this->controller, '400.1', 10);
        $this->assertEquals('4000000001', $result);
    }

    public function testRealWorldScenarioBankAccount(): void
    {
        // Common pattern: 572.1 for bank account
        $result = $this->transformMethod->invoke($this->controller, '572.1', 10);
        $this->assertEquals('5720000001', $result);
    }

    public function testRealWorldScenarioCashAccount(): void
    {
        // Common pattern: 570.1 for cash account
        $result = $this->transformMethod->invoke($this->controller, '570.1', 10);
        $this->assertEquals('5700000001', $result);
    }

    public function testRealWorldScenarioSalesAccount(): void
    {
        // Common pattern: 700.1 for sales account
        $result = $this->transformMethod->invoke($this->controller, '700.1', 10);
        $this->assertEquals('7000000001', $result);
    }

    public function testRealWorldScenarioPurchaseAccount(): void
    {
        // Common pattern: 600.1 for purchases account
        $result = $this->transformMethod->invoke($this->controller, '600.1', 10);
        $this->assertEquals('6000000001', $result);
    }

    public function testRealWorldScenarioWith8DigitSystem(): void
    {
        // Some systems use 8-digit account codes
        $result = $this->transformMethod->invoke($this->controller, '430.1', 8);
        $this->assertEquals('43000001', $result);
    }

    public function testRealWorldScenarioHighClientNumber(): void
    {
        // Client number 999
        $result = $this->transformMethod->invoke($this->controller, '430.999', 10);
        $this->assertEquals('4300000999', $result);
    }

    public function testRealWorldScenarioSubAccount(): void
    {
        // Sub-account pattern: 4300001.1 (sub-client)
        // paddingLength = 10 - 1 = 9
        // str_pad('4300001', 9, '0', STR_PAD_RIGHT) = '430000100'
        // Result = '430000100' + '1' = '4300001001'
        $result = $this->transformMethod->invoke($this->controller, '4300001.1', 10);
        $this->assertEquals('4300001001', $result);
    }
}
