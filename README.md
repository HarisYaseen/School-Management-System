# SMS Connect - School Management System (Electron Edition)

A high-performance, offline-first School Management System built with **Vanilla JS**, **Electron**, and **SQLite (sql.js)**. 

## Features

- **Offline-First**: Operates entirely locally without requiring an internet connection.
- **Fast Performance**: Instant loading and ultra-responsive UI built with modern Vanilla JS.
- **SQLite Powered**: Robust data persistence using SQL.js for local data storage.
- **Comprehensive Modules**:
  - Student & Teacher Management
  - Attendance Tracking
  - Fee Collection & Financial Ledgers
  - Inventory & Point of Sale (POS)
  - Bank Transaction Logging
  - Expense Management

## Tech Stack

- **Core**: HTML5, Vanilla JavaScript
- **Styling**: Tailwind CSS (Local build)
- **Runtime**: Electron
- **Database**: SQLite (via SQL.js)

## Development

1. **Install Dependencies**:
   ```bash
   npm install
   ```

2. **Run Locally**:
   ```bash
   npm start
   ```

3. **Lint Code**:
   ```bash
   npm run lint
   ```

4. **Build Installer**:
   ```bash
   npm run build
   ```

## CI/CD and Dependencies

Note: **Electron** is listed in `devDependencies`. This is intentional for local development and `electron-builder` usage. If deploying via a CI/CD pipeline that only installs production dependencies (`npm install --production`), ensure that `electron` and `electron-builder` are available or use `npm install` without the production flag to ensure the build environment is complete.

## Security

The custom C# installer (`installer.cs`) includes:
- **SHA256 Integrity Verification**: Ensures the payload hasn't been tampered with.
- **Path Traversal Protection**: Prevents malicious zip entries from writing outside the install directory.
- **PowerShell Escaping**: Prevents command injection during shortcut creation.

## License

MIT License
