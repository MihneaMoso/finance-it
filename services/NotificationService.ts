// IMPORTANT:
// This file is intentionally web/SSR-safe.
//
// Native implementation: `NotificationService.native.ts`
// Web implementation: `NotificationService.web.ts`
//
// Some Metro/SSR setups may resolve this `.ts` file even during web bundling.
// Re-exporting the web implementation here prevents `expo-notifications`
// from being pulled into the web bundle (and avoids the `warnOfExpoGoPushUsage`
// resolution error).

export * from "./NotificationService.web";
