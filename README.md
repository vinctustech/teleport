# teleport

<img src="public/logo.png" alt="teleport logo" width="128" height="128" />

A mobile app for Android that allows you to mock GPS locations and simulate realistic driver movement between coordinates.

## Features

- **Mock Location Testing** - Set your device to a specific GPS location (e.g., Times Square, NYC)
- **Driver Simulation** - Simulate realistic movement between two locations
  - Configure start and end coordinates
  - Set travel speed (km/h)
  - Pause/resume simulation in progress
  - Real-time progress tracking with current coordinates
- **Responsive UI** - Compact layout optimized for small phone screens
- **Dark Mode** - Automatically adapts to your device's light/dark mode preference

## Screenshots

The app provides two main screens:

1. **Test Screen** - Quick location mocking with preset coordinates
2. **Simulation Screen** - Full driver simulation with customizable parameters

## Requirements

- Android device with Developer Options enabled
- "Allow mock locations" enabled in Developer Options
- Node.js and npm installed (for development)

## Installation

### For Users

1. Download the APK from releases
2. Install on your Android device
3. Enable Developer Options on your device
4. Enable "Allow mock locations" in Developer Options
5. Grant the app mock location permission:
   ```bash
   adb shell appops set io.github.vinctustech.teleport android:mock_location allow
   ```

### For Developers

1. Clone the repository:
   ```bash
   git clone https://github.com/vinctustech/teleport.git
   cd teleport
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Build the app:
   ```bash
   npm run build
   ```

4. Sync with Android:
   ```bash
   npx cap sync android
   ```

5. Run on device/emulator:
   ```bash
   npx cap run android --target <device-name>
   ```

## Usage

### Test Screen

1. Tap the flask icon in the toolbar to access the test screen
2. Click "Enable Mock Location" to activate mock location provider
3. Click "Set Mock Location" to set your device to Times Square, NYC
4. Click "Get Current Location" to verify the mock location
5. Click "Disable Mock Location" when done

### Driver Simulation Screen

1. Tap the car icon in the toolbar to access the simulation screen
2. Enter start coordinates (latitude and longitude)
3. Enter end coordinates (latitude and longitude)
4. Set desired speed in km/h
5. Click "Start" to begin simulation
6. Use "Pause"/"Resume" buttons to control the simulation
7. Click "Stop" to end the simulation and disable mock location

The simulation uses the Haversine formula to calculate distance and interpolates your position along a straight line between the two points, updating your location every second based on the configured speed.

## Development

### Available Scripts

- `npm run build` - Build the React app for production
- `npm run dev` - Start development server
- `npx cap sync android` - Sync web assets with Android project
- `npx cap run android` - Build and run on Android device/emulator
- `npx cap open android` - Open Android project in Android Studio

### Project Structure

```
teleport/
├── src/
│   ├── components/
│   │   └── DriverSimulation.tsx    # Simulation UI component
│   ├── pages/
│   │   ├── Home.tsx                # Main app screen with both test and simulation
│   │   └── Home.css                # App styles
│   ├── plugins/
│   │   └── LocationMocker.ts       # TypeScript interface for native plugin
│   └── theme/
│       └── variables.css           # Ionic theme with dark mode support
├── android/
│   └── app/src/main/java/io/github/vinctustech/teleport/
│       ├── MainActivity.java       # Android main activity
│       └── LocationMockerPlugin.java  # Native location mocking plugin
└── public/
    ├── icon.png                    # App icon
    └── logo.png                    # App logo
```

## Technologies

- **Ionic Framework** - Cross-platform mobile UI components
- **React** - UI framework
- **TypeScript** - Type-safe JavaScript
- **Capacitor** - Native mobile runtime
- **Android LocationManager API** - GPS location mocking

## How It Works

The app uses Android's `LocationManager` test provider API to mock GPS locations. When enabled, it creates a test GPS provider that overrides the device's actual location. The driver simulation calculates the distance between two points using the Haversine formula and updates the mock location at regular intervals to simulate realistic movement.

## Permissions

The app requires the following Android permissions:
- `ACCESS_FINE_LOCATION` - To access GPS provider
- `ACCESS_COARSE_LOCATION` - For location services
- `android:mock_location` - To set mock locations (requires ADB command)

## License

MIT
