// swift-tools-version: 5.9
import PackageDescription

// DO NOT MODIFY THIS FILE - managed by Capacitor CLI commands
let package = Package(
    name: "CapApp-SPM",
    platforms: [.iOS(.v15)],
    products: [
        .library(
            name: "CapApp-SPM",
            targets: ["CapApp-SPM"])
    ],
    dependencies: [
        .package(url: "https://github.com/ionic-team/capacitor-swift-pm.git", exact: "8.2.0"),
        .package(name: "CapacitorApp", path: "../../../../../../node_modules/.pnpm/@capacitor+app@8.1.0_@capacitor+core@8.2.0/node_modules/@capacitor/app"),
        .package(name: "CapacitorCamera", path: "../../../../../../node_modules/.pnpm/@capacitor+camera@8.2.1_@capacitor+core@8.2.0/node_modules/@capacitor/camera"),
        .package(name: "CapacitorFilesystem", path: "../../../../../../node_modules/.pnpm/@capacitor+filesystem@8.1.2_@capacitor+core@8.2.0/node_modules/@capacitor/filesystem"),
        .package(name: "CapacitorPreferences", path: "../../../../../../node_modules/.pnpm/@capacitor+preferences@8.0.1_@capacitor+core@8.2.0/node_modules/@capacitor/preferences"),
        .package(name: "CapacitorPushNotifications", path: "../../../../../../node_modules/.pnpm/@capacitor+push-notifications@8.0.0_@capacitor+core@8.2.0/node_modules/@capacitor/push-notifications"),
        .package(name: "CapacitorShare", path: "../../../../../../node_modules/.pnpm/@capacitor+share@8.0.1_@capacitor+core@8.2.0/node_modules/@capacitor/share"),
        .package(name: "CapawesomeCapacitorGoogleSignIn", path: "../../../../../../node_modules/.pnpm/@capawesome+capacitor-google-sign-in@0.1.2_@capacitor+core@8.2.0/node_modules/@capawesome/capacitor-google-sign-in"),
        .package(name: "CapgoCapacitorNativeBiometric", path: "../../../../../../node_modules/.pnpm/@capgo+capacitor-native-biometric@8.4.2_@capacitor+core@8.2.0/node_modules/@capgo/capacitor-native-biometric")
    ],
    targets: [
        .target(
            name: "CapApp-SPM",
            dependencies: [
                .product(name: "Capacitor", package: "capacitor-swift-pm"),
                .product(name: "Cordova", package: "capacitor-swift-pm"),
                .product(name: "CapacitorApp", package: "CapacitorApp"),
                .product(name: "CapacitorCamera", package: "CapacitorCamera"),
                .product(name: "CapacitorFilesystem", package: "CapacitorFilesystem"),
                .product(name: "CapacitorPreferences", package: "CapacitorPreferences"),
                .product(name: "CapacitorPushNotifications", package: "CapacitorPushNotifications"),
                .product(name: "CapacitorShare", package: "CapacitorShare"),
                .product(name: "CapawesomeCapacitorGoogleSignIn", package: "CapawesomeCapacitorGoogleSignIn"),
                .product(name: "CapgoCapacitorNativeBiometric", package: "CapgoCapacitorNativeBiometric")
            ]
        )
    ]
)
