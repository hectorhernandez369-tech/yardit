import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const androidRoot = path.join(root, 'android');
const appRoot = path.join(androidRoot, 'app');
const manifestPath = path.join(appRoot, 'src', 'main', 'AndroidManifest.xml');
const buildGradlePath = path.join(appRoot, 'build.gradle');
const variablesPath = path.join(androidRoot, 'variables.gradle');

if (!fs.existsSync(androidRoot)) throw new Error('Android project is missing');

let variables = fs.readFileSync(variablesPath, 'utf8');
variables = variables
  .replace(/compileSdkVersion\s*=\s*\d+/, 'compileSdkVersion = 36')
  .replace(/targetSdkVersion\s*=\s*\d+/, 'targetSdkVersion = 36');
fs.writeFileSync(variablesPath, variables);

let manifest = fs.readFileSync(manifestPath, 'utf8');
manifest = manifest.replace('android:allowBackup="true"', 'android:allowBackup="false"');
const requiredPermissions = [
  'android.permission.INTERNET',
  'android.permission.ACCESS_COARSE_LOCATION',
  'android.permission.ACCESS_FINE_LOCATION',
  'android.permission.POST_NOTIFICATIONS',
];
for (const permission of requiredPermissions) {
  if (!manifest.includes(permission)) {
    manifest = manifest.replace('</manifest>', `    <uses-permission android:name="${permission}" />\n</manifest>`);
  }
}
fs.writeFileSync(manifestPath, manifest);

let gradle = fs.readFileSync(buildGradlePath, 'utf8');
if (!gradle.includes('YARDIT_KEYSTORE_PATH')) {
  gradle = gradle.replace(
    "apply plugin: 'com.android.application'",
    `apply plugin: 'com.android.application'\n\ndef yarditKeystorePath = System.getenv('YARDIT_KEYSTORE_PATH')\ndef yarditKeystorePassword = System.getenv('YARDIT_KEYSTORE_PASSWORD')\ndef yarditKeyAlias = System.getenv('YARDIT_KEY_ALIAS')\ndef yarditKeyPassword = System.getenv('YARDIT_KEY_PASSWORD')\ndef yarditReleaseSigningReady = yarditKeystorePath && yarditKeystorePassword && yarditKeyAlias && yarditKeyPassword`
  );
}
gradle = gradle
  .replace(/versionCode\s+\d+/, `versionCode Integer.parseInt(System.getenv('YARDIT_VERSION_CODE') ?: '1')`)
  .replace(/versionName\s+"[^"]+"/, `versionName System.getenv('YARDIT_VERSION_NAME') ?: '1.0'`);

if (!gradle.includes('signingConfigs {')) {
  gradle = gradle.replace(
    /\n\s*buildTypes\s*\{/,
    `\n    signingConfigs {\n        if (yarditReleaseSigningReady) {\n            release {\n                storeFile file(yarditKeystorePath)\n                storePassword yarditKeystorePassword\n                keyAlias yarditKeyAlias\n                keyPassword yarditKeyPassword\n            }\n        }\n    }\n    buildTypes {`
  );
}
if (!gradle.includes('signingConfig signingConfigs.release')) {
  gradle = gradle.replace(
    /release\s*\{\n/,
    `release {\n            if (yarditReleaseSigningReady) signingConfig signingConfigs.release\n`
  );
}
fs.writeFileSync(buildGradlePath, gradle);

console.log('Configured Yardit native layer: push + notification/location permissions only');
