# Environment Monitor

> Wind Generation & Weather Monitoring Dashboard

A real-time instrument panel for wind turbine generation and a 9-channel weather monitoring station. This dashboard visualizes rotor speed, generator output, battery status, and environmental sensor telemetry in an intuitive, responsive interface.

## Features

- **Real-Time Data Visualization**: Monitors wind turbine performance including rotor speed, generator output, and battery status.
- **Weather Monitoring**: Comprehensive 9-channel weather monitoring station telemetry.
- **Authentication**: Secure sign-in and sign-up functionality. Includes a built-in demo account for quick access.
- **Responsive Design**: Beautiful UI built with custom CSS, utilizing modern fonts like *Fraunces*, *Inter*, and *IBM Plex Mono*.
- **Local Database**: Uses `sql.js` (WebAssembly) for lightweight client-side data management.

## Demo

You can try out the application using the built-in demo account:
- **Email**: `admin@monitor.com`
- **Password**: `monitor@admin1`

## Technologies Used

- **HTML5**: Semantic structure and dashboard layout.
- **CSS3**: Custom styling, layout grid, and responsive design elements.
- **JavaScript**: Dashboard interactivity, data mocking/handling, and UI state management.
- **sql.js**: WebAssembly SQLite port for handling data operations.

## Installation and Setup

Since this is a client-side application, you don't need any complex build tools to run it.

1. **Clone the repository:**
   ```bash
   git clone https://github.com/Yashwant-Rangrej/AeroLeaf.git
   ```
2. **Navigate to the directory:**
   ```bash
   cd AeroLeaf
   ```
3. **Open the application:**
   Simply open `index.html` in any modern web browser.
   ```bash
   # On Mac
   open index.html

   # On Windows
   start index.html
   ```

## Usage

1. Open `index.html` in your browser.
2. Sign in using the demo account or create a new account via the sign-up page.
3. View real-time turbine performance and weather monitoring metrics directly from the dashboard.

## Contributing

Contributions are welcome! If you'd like to improve the dashboard or add new features:
1. Fork the project.
2. Create your feature branch (`git checkout -b feature/AmazingFeature`).
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`).
4. Push to the branch (`git push origin feature/AmazingFeature`).
5. Open a Pull Request.

## License

Distributed under the MIT License. See `LICENSE` for more information.