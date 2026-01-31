# QuickCreate Plugin for FacturaScripts

A FacturaScripts plugin that adds "+" buttons next to autocomplete fields for creating products and accounting accounts without leaving the current form.

## Features

- **Quick Product Creation**: Add products directly from sales/purchase document lines
- **Quick Account Creation**: Add subcuentas directly from accounting entries (asientos)
- **Permission-Aware**: Buttons only appear for users with appropriate permissions
- **Dynamic Content Support**: Works with dynamically added document lines
- **Bootstrap 5 Compatible**: Uses native Bootstrap 5 modals

## Requirements

- FacturaScripts 2025 or later
- PHP 8.2+

## Installation

1. Download the plugin ZIP file
2. Go to **Admin Panel → Plugins** in FacturaScripts
3. Click **Upload plugin** and select the ZIP file
4. Enable the plugin

Or clone this repository directly into your Plugins directory:

```bash
cd /path/to/facturascripts/Plugins
git clone https://github.com/yourusername/QuickCreate.git
```

Then enable the plugin from the admin panel.

## Usage

### Products

When editing sales or purchase documents (quotes, orders, delivery notes, invoices), you'll see a "+" button next to the product reference field. Click it to:

1. Enter product reference (required)
2. Enter description (optional)
3. Enter price (optional)
4. Click Save

The new product is created and automatically selected in the document line.

### Accounting Accounts

When editing accounting entries (asientos), you'll see a "+" button next to subcuenta fields. Click it to:

1. Enter account code (must match the exercise's required length)
2. Enter description (optional, defaults to parent account description)
3. Click Save

The new subcuenta is created and automatically selected in the entry line.

## Supported Controllers

### Sales Documents
- EditPresupuestoCliente (Customer Quotes)
- EditPedidoCliente (Customer Orders)
- EditAlbaranCliente (Customer Delivery Notes)
- EditFacturaCliente (Customer Invoices)

### Purchase Documents
- EditPresupuestoProveedor (Supplier Quotes)
- EditPedidoProveedor (Supplier Orders)
- EditAlbaranProveedor (Supplier Delivery Notes)
- EditFacturaProveedor (Supplier Invoices)

### Accounting
- EditAsiento (Journal Entries)

## Permissions

The plugin respects FacturaScripts permissions:

- **EditProducto**: Required to see the product quick-create button
- **EditCuenta**: Required to see the account quick-create button

Users without these permissions will not see the "+" buttons.

## Development

### Quick Start with Docker

```bash
# Start development environment
make upd

# Open http://localhost:8080
# Login: admin / admin

# Run tests
make test

# Stop environment
make down
```

### Project Structure

```
QuickCreate/
├── Assets/
│   ├── CSS/
│   │   └── QuickCreate.css
│   └── JS/
│       └── QuickCreate.js
├── Controller/
│   └── ApiQuickCreate.php
├── Extension/
│   └── Controller/
│       ├── EditAlbaranCliente.php
│       ├── EditAlbaranProveedor.php
│       ├── EditAsiento.php
│       ├── EditFacturaCliente.php
│       ├── EditFacturaProveedor.php
│       ├── EditPedidoCliente.php
│       ├── EditPedidoProveedor.php
│       ├── EditPresupuestoCliente.php
│       └── EditPresupuestoProveedor.php
├── Trait/
│   └── QuickCreateTrait.php
├── Translation/
│   ├── en_EN.json
│   └── es_ES.json
├── Init.php
├── facturascripts.ini
└── README.md
```

## Technical Notes

### Product Creation
When saving a new Producto via `save()`, FacturaScripts automatically creates a default Variante. The plugin returns the variante reference for use in document lines.

### Account Code Validation
Each Ejercicio has a `longsubcuenta` property that defines the required length for subcuenta codes. The plugin validates this before creation.

### Parent Account Requirement
If the parent cuenta for a new subcuenta doesn't exist, an error message is shown asking the user to create it first. Parent accounts are NOT auto-created.

### Dynamic Content Detection
Document lines use JavaScript for dynamic rendering. A MutationObserver ensures "+" buttons appear on newly added lines.

## License

This plugin is released under the GNU LGPLv3 license. See [LICENSE](LICENSE) for details.

## Author

Created by [Ernesto Serrano](https://github.com/erseco)

## Contributing

Contributions are welcome! Please open an issue or submit a pull request.
