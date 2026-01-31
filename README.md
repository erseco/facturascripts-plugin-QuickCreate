# QuickCreate Plugin for FacturaScripts

A FacturaScripts plugin that adds "+" buttons next to autocomplete fields, allowing you to create products and accounting accounts without leaving the current form.

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

1. Download the latest `QuickCreate-X.X.X.zip` from [GitHub Releases](../../releases/latest)
2. Go to **Admin Panel → Plugins** in FacturaScripts
3. Click **Upload plugin** and select the downloaded ZIP file
4. Enable the plugin

> **Note**: Do not download the repository directly as a ZIP from GitHub's "Code" button. The release ZIP is specifically packaged for FacturaScripts and excludes development files.

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

## License

This plugin is released under the GNU LGPLv3 license. See [LICENSE](LICENSE) for details.

## Contributing

Contributions are welcome! Please open an issue or submit a pull request.

### Development Setup

```bash
# Clone the repository
git clone https://github.com/erseco/facturascripts-plugin-QuickCreate.git
cd facturascripts-plugin-QuickCreate

# Start development environment with Docker
make up

# Open http://localhost:8080 (login: admin / admin)

# Run tests
make test

# Create a release package
make package VERSION=1.0.0
```
