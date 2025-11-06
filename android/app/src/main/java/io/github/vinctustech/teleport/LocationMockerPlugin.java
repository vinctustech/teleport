package io.github.vinctustech.teleport;

import android.Manifest;
import android.content.Context;
import android.location.Location;
import android.location.LocationManager;
import android.location.provider.ProviderProperties;
import android.os.Build;
import android.os.SystemClock;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.getcapacitor.annotation.Permission;
import com.getcapacitor.annotation.PermissionCallback;

@CapacitorPlugin(
    name = "LocationMocker",
    permissions = {
        @Permission(strings = { Manifest.permission.ACCESS_FINE_LOCATION }, alias = "location"),
        @Permission(strings = { Manifest.permission.ACCESS_COARSE_LOCATION }, alias = "coarseLocation")
    }
)
public class LocationMockerPlugin extends Plugin {

    private LocationManager locationManager;
    private static final String MOCK_PROVIDER = LocationManager.GPS_PROVIDER;
    private boolean isMockLocationEnabled = false;

    @Override
    public void load() {
        locationManager = (LocationManager) getContext().getSystemService(Context.LOCATION_SERVICE);
    }

    @PluginMethod
    public void enableMockLocation(PluginCall call) {
        // Check and request permissions if needed
        if (!hasRequiredPermissions()) {
            requestAllPermissions(call, "enableMockLocationCallback");
            return;
        }

        enableMockLocationCallback(call);
    }

    @PermissionCallback
    private void enableMockLocationCallback(PluginCall call) {
        try {
            // Remove test provider if it already exists
            try {
                locationManager.removeTestProvider(MOCK_PROVIDER);
            } catch (IllegalArgumentException e) {
                // Provider doesn't exist as a test provider, that's fine
            }

            // Add test provider for GPS
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
                // Android 12+ (API 31+) - use new API with ProviderProperties
                ProviderProperties properties = new ProviderProperties.Builder()
                    .setHasAltitudeSupport(true)
                    .setHasBearingSupport(true)
                    .setHasSpeedSupport(true)
                    .setPowerUsage(ProviderProperties.POWER_USAGE_LOW)
                    .setAccuracy(ProviderProperties.ACCURACY_FINE)
                    .build();
                locationManager.addTestProvider(MOCK_PROVIDER, properties);
            } else {
                // Older Android versions - use deprecated API
                locationManager.addTestProvider(
                    MOCK_PROVIDER,
                    false,
                    false,
                    false,
                    false,
                    true,
                    true,
                    true,
                    ProviderProperties.POWER_USAGE_LOW,
                    ProviderProperties.ACCURACY_FINE
                );
            }

            locationManager.setTestProviderEnabled(MOCK_PROVIDER, true);
            isMockLocationEnabled = true;

            JSObject ret = new JSObject();
            ret.put("success", true);
            call.resolve(ret);
        } catch (SecurityException e) {
            call.reject("Security exception: " + e.getMessage());
        } catch (Exception e) {
            call.reject("Failed to enable mock location: " + e.getMessage());
        }
    }

    @PluginMethod
    public void disableMockLocation(PluginCall call) {
        try {
            if (isMockLocationEnabled) {
                locationManager.setTestProviderEnabled(MOCK_PROVIDER, false);
                locationManager.removeTestProvider(MOCK_PROVIDER);
                isMockLocationEnabled = false;
            }

            JSObject ret = new JSObject();
            ret.put("success", true);
            call.resolve(ret);
        } catch (Exception e) {
            call.reject("Failed to disable mock location: " + e.getMessage());
        }
    }

    @PluginMethod
    public void setMockLocation(PluginCall call) {
        Double latitude = call.getDouble("latitude");
        Double longitude = call.getDouble("longitude");
        Double accuracy = call.getDouble("accuracy", 1.0);

        if (latitude == null || longitude == null) {
            call.reject("Must provide latitude and longitude");
            return;
        }

        if (!isMockLocationEnabled) {
            call.reject("Mock location not enabled. Call enableMockLocation first.");
            return;
        }

        try {
            Location mockLocation = new Location(MOCK_PROVIDER);
            mockLocation.setLatitude(latitude);
            mockLocation.setLongitude(longitude);
            mockLocation.setAccuracy(accuracy.floatValue());
            mockLocation.setTime(System.currentTimeMillis());
            mockLocation.setElapsedRealtimeNanos(SystemClock.elapsedRealtimeNanos());

            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                mockLocation.setBearingAccuracyDegrees(0.1f);
                mockLocation.setVerticalAccuracyMeters(0.1f);
                mockLocation.setSpeedAccuracyMetersPerSecond(0.01f);
            }

            locationManager.setTestProviderLocation(MOCK_PROVIDER, mockLocation);

            JSObject ret = new JSObject();
            ret.put("success", true);
            call.resolve(ret);
        } catch (SecurityException e) {
            call.reject("Security exception: " + e.getMessage());
        } catch (Exception e) {
            call.reject("Failed to set mock location: " + e.getMessage());
        }
    }

    @PluginMethod
    public void getCurrentLocation(PluginCall call) {
        // Check and request permissions if needed
        if (!hasRequiredPermissions()) {
            requestAllPermissions(call, "getCurrentLocationCallback");
            return;
        }

        getCurrentLocationCallback(call);
    }

    @PermissionCallback
    private void getCurrentLocationCallback(PluginCall call) {
        try {
            Location location = locationManager.getLastKnownLocation(MOCK_PROVIDER);

            if (location == null) {
                // Try other providers if GPS is not available
                location = locationManager.getLastKnownLocation(LocationManager.NETWORK_PROVIDER);
            }

            if (location == null) {
                call.reject("No location available");
                return;
            }

            JSObject ret = new JSObject();
            ret.put("latitude", location.getLatitude());
            ret.put("longitude", location.getLongitude());
            ret.put("accuracy", location.getAccuracy());
            call.resolve(ret);
        } catch (SecurityException e) {
            call.reject("Security exception: " + e.getMessage());
        } catch (Exception e) {
            call.reject("Failed to get current location: " + e.getMessage());
        }
    }
}
