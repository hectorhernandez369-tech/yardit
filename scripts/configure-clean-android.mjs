import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const androidRoot = path.join(root, 'android');
const appRoot = path.join(androidRoot, 'app');
const mainRoot = path.join(appRoot, 'src', 'main');
const resRoot = path.join(mainRoot, 'res');

if (!fs.existsSync(androidRoot)) {
  throw new Error('Fresh Capacitor Android project was not generated');
}

const packageId = 'com.base690f554506edf795e5d84121.app';
const yarditLauncherLogoUrl = 'https://media.base44.com/images/public/690f554506edf795e5d84121/0f42669c8_file_00000000f5dc71f5a5c8b2e79fd116b0.png';

const variablesPath = path.join(androidRoot, 'variables.gradle');
let variables = fs.readFileSync(variablesPath, 'utf8');
variables = variables
  .replace(/compileSdkVersion\s*=\s*\d+/, 'compileSdkVersion = 36')
  .replace(/targetSdkVersion\s*=\s*\d+/, 'targetSdkVersion = 36');
fs.writeFileSync(variablesPath, variables);

const manifest = `<?xml version="1.0" encoding="utf-8"?>
<manifest xmlns:android="http://schemas.android.com/apk/res/android">

    <application
        android:allowBackup="true"
        android:icon="@mipmap/ic_launcher"
        android:label="@string/app_name"
        android:roundIcon="@mipmap/ic_launcher_round"
        android:supportsRtl="true"
        android:theme="@style/AppTheme">

        <activity
            android:configChanges="orientation|keyboardHidden|keyboard|screenSize|locale|smallestScreenSize|screenLayout|uiMode|navigation"
            android:name=".MainActivity"
            android:label="@string/title_activity_main"
            android:theme="@style/AppTheme.NoActionBarLaunch"
            android:launchMode="singleTask"
            android:exported="true">

            <intent-filter>
                <action android:name="android.intent.action.MAIN" />
                <category android:name="android.intent.category.LAUNCHER" />
            </intent-filter>

            <intent-filter>
                <action android:name="android.intent.action.VIEW" />
                <category android:name="android.intent.category.DEFAULT" />
                <category android:name="android.intent.category.BROWSABLE" />
                <data android:scheme="yardit" android:host="auth-callback" />
            </intent-filter>
        </activity>

        <provider
            android:name="androidx.core.content.FileProvider"
            android:authorities="\${applicationId}.fileprovider"
            android:exported="false"
            android:grantUriPermissions="true">
            <meta-data
                android:name="android.support.FILE_PROVIDER_PATHS"
                android:resource="@xml/file_paths" />
        </provider>
    </application>

    <uses-permission android:name="android.permission.INTERNET" />
    <uses-permission android:name="android.permission.ACCESS_COARSE_LOCATION" />
    <uses-permission android:name="android.permission.ACCESS_FINE_LOCATION" />
    <uses-permission android:name="android.permission.POST_NOTIFICATIONS" />
</manifest>
`;
fs.writeFileSync(path.join(mainRoot, 'AndroidManifest.xml'), manifest);

const buildGradle = `apply plugin: 'com.android.application'

def yarditKeystorePath = System.getenv('YARDIT_KEYSTORE_PATH')
def yarditKeystorePassword = System.getenv('YARDIT_KEYSTORE_PASSWORD')
def yarditKeyAlias = System.getenv('YARDIT_KEY_ALIAS')
def yarditKeyPassword = System.getenv('YARDIT_KEY_PASSWORD')
def yarditReleaseSigningReady = yarditKeystorePath && yarditKeystorePassword && yarditKeyAlias && yarditKeyPassword
def yarditLauncherLogoUrl = '${yarditLauncherLogoUrl}'

android {
    namespace "${packageId}"
    compileSdk rootProject.ext.compileSdkVersion
    defaultConfig {
        applicationId "${packageId}"
        minSdkVersion rootProject.ext.minSdkVersion
        targetSdkVersion rootProject.ext.targetSdkVersion
        versionCode = Integer.parseInt(System.getenv('YARDIT_VERSION_CODE') ?: '1')
        versionName = System.getenv('YARDIT_VERSION_NAME') ?: '1.0'
        testInstrumentationRunner "androidx.test.runner.AndroidJUnitRunner"
        aaptOptions {
            ignoreAssetsPattern '!.svn:!.git:!.ds_store:!*.scc:.*:!CVS:!thumbs.db:!picasa.ini:!*~'
        }
    }
    signingConfigs {
        if (yarditReleaseSigningReady) {
            release {
                storeFile file(yarditKeystorePath)
                storePassword yarditKeystorePassword
                keyAlias yarditKeyAlias
                keyPassword yarditKeyPassword
            }
        }
    }
    buildTypes {
        release {
            if (yarditReleaseSigningReady) {
                signingConfig signingConfigs.release
            }
            minifyEnabled false
            proguardFiles getDefaultProguardFile('proguard-android.txt'), 'proguard-rules.pro'
        }
    }
}

repositories {
    flatDir {
        dirs '../capacitor-cordova-android-plugins/src/main/libs', 'libs'
    }
}

dependencies {
    implementation fileTree(include: ['*.jar'], dir: 'libs')
    implementation "androidx.appcompat:appcompat:$androidxAppCompatVersion"
    implementation "androidx.coordinatorlayout:coordinatorlayout:$androidxCoordinatorLayoutVersion"
    implementation "androidx.core:core-splashscreen:$coreSplashScreenVersion"
    implementation project(':capacitor-android')
    testImplementation "junit:junit:$junitVersion"
    androidTestImplementation "androidx.test.ext:junit:$androidxJunitVersion"
    androidTestImplementation "androidx.test.espresso:espresso-core:$androidxEspressoCoreVersion"
    implementation project(':capacitor-cordova-android-plugins')
}

apply from: 'capacitor.build.gradle'

tasks.register('generateYarditLauncherIcons') {
    outputs.dir file('src/main/res')
    outputs.upToDateWhen { false }
    doLast {
        System.setProperty('java.awt.headless', 'true')
        def sourceImage = javax.imageio.ImageIO.read(new URL(yarditLauncherLogoUrl))
        if (sourceImage == null) {
            throw new GradleException('Unable to read the Yardit launcher logo source')
        }

        def densities = [
            mdpi: [launcher: 48, adaptive: 108],
            hdpi: [launcher: 72, adaptive: 162],
            xhdpi: [launcher: 96, adaptive: 216],
            xxhdpi: [launcher: 144, adaptive: 324],
            xxxhdpi: [launcher: 192, adaptive: 432]
        ]

        densities.each { density, sizes ->
            def outputDir = file("src/main/res/mipmap-\${density}")
            outputDir.mkdirs()
            [
                ic_launcher: sizes.launcher,
                ic_launcher_round: sizes.launcher,
                ic_launcher_foreground: sizes.adaptive,
                ic_launcher_background: sizes.adaptive,
                ic_launcher_monochrome: sizes.adaptive
            ].each { resourceName, size ->
                def outputImage = new java.awt.image.BufferedImage(size, size, java.awt.image.BufferedImage.TYPE_INT_ARGB)
                def graphics = outputImage.createGraphics()
                graphics.setRenderingHint(java.awt.RenderingHints.KEY_INTERPOLATION, java.awt.RenderingHints.VALUE_INTERPOLATION_BICUBIC)
                graphics.setRenderingHint(java.awt.RenderingHints.KEY_RENDERING, java.awt.RenderingHints.VALUE_RENDER_QUALITY)
                graphics.drawImage(sourceImage, 0, 0, size, size, null)
                graphics.dispose()
                javax.imageio.ImageIO.write(outputImage, 'png', new File(outputDir, "\${resourceName}.png"))
            }
        }
    }
}

tasks.register('verifyYarditNativePushWiring') {
    doLast {
        if (project.findProject(':onesignal-capacitor-plugin') == null) {
            throw new GradleException('OneSignal Capacitor plugin project is not linked')
        }
        def capacitorPlugins = file('src/main/assets/capacitor.plugins.json')
        if (!capacitorPlugins.exists() || !capacitorPlugins.text.contains('OneSignalCapacitor')) {
            throw new GradleException('OneSignalCapacitor is missing from the generated Capacitor plugin registry')
        }
    }
}

tasks.named('preBuild').configure {
    dependsOn tasks.named('generateYarditLauncherIcons')
    dependsOn tasks.named('verifyYarditNativePushWiring')
}
`;
fs.writeFileSync(path.join(appRoot, 'build.gradle'), buildGradle);

const adaptiveIcon = `<?xml version="1.0" encoding="utf-8"?>
<adaptive-icon xmlns:android="http://schemas.android.com/apk/res/android">
    <background android:drawable="@mipmap/ic_launcher_background"/>
    <foreground android:drawable="@mipmap/ic_launcher_foreground"/>
    <monochrome android:drawable="@mipmap/ic_launcher_monochrome"/>
</adaptive-icon>
`;
const adaptiveDir = path.join(resRoot, 'mipmap-anydpi-v26');
fs.mkdirSync(adaptiveDir, { recursive: true });
fs.writeFileSync(path.join(adaptiveDir, 'ic_launcher.xml'), adaptiveIcon);
fs.writeFileSync(path.join(adaptiveDir, 'ic_launcher_round.xml'), adaptiveIcon);

console.log('Configured clean Yardit Android shell:', {
  packageId,
  targetSdk: 36,
  deepLink: 'yardit://auth-callback',
  locationPermissions: true,
  notificationPermission: true,
  oneSignalGate: true,
  launcherSource: 'existing Yardit artwork',
});
