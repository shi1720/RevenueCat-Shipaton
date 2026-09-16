const { AndroidConfig, withAndroidManifest, withGradleProperties } = require('expo/config-plugins');

/** Preserve a pending RevenueCat checkout when returning from an external payment app. */
module.exports = function withUnpauseAndroid(config) {
  config = withGradleProperties(config, configWithProperties => {
    const key = 'AsyncStorage_db_size_in_MB';
    configWithProperties.modResults = configWithProperties.modResults.filter(item => item.type !== 'property' || item.key !== key);
    // Keep a complete old and new 20 MB generation until the pointer commits.
    configWithProperties.modResults.push({ type: 'property', key, value: '64' });
    return configWithProperties;
  });
  return withAndroidManifest(config, configWithManifest => {
    const activity = AndroidConfig.Manifest.getMainActivityOrThrow(configWithManifest.modResults);
    activity.$['android:launchMode'] = 'singleTop';
    activity.$['android:resizeableActivity'] = 'true';
    return configWithManifest;
  });
};
