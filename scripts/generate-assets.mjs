#!/usr/bin/env node

import fs from "node:fs/promises";
import path from "node:path";

import sharp from "sharp";

const repoRoot = process.cwd();

const INPUT_DEFAULT = "finance-it-logo-upscaled-resized.png";
const OUTPUT_DIR = path.join(repoRoot, "assets", "images");

function hexToRgba(hex, alpha = 1) {
    const cleaned = String(hex || "")
        .replace(/^#/, "")
        .trim();
    if (!/^[0-9a-fA-F]{6}$/.test(cleaned)) {
        return { r: 255, g: 255, b: 255, alpha };
    }
    const r = Number.parseInt(cleaned.slice(0, 2), 16);
    const g = Number.parseInt(cleaned.slice(2, 4), 16);
    const b = Number.parseInt(cleaned.slice(4, 6), 16);
    return { r, g, b, alpha };
}

async function fileExists(filePath) {
    try {
        await fs.access(filePath);
        return true;
    } catch {
        return false;
    }
}

async function readAppJson() {
    const appJsonPath = path.join(repoRoot, "app.json");
    try {
        const raw = await fs.readFile(appJsonPath, "utf8");
        return JSON.parse(raw);
    } catch {
        return null;
    }
}

function getSplashBackgroundColor(appJson) {
    const plugins = appJson?.expo?.plugins;
    if (!Array.isArray(plugins)) return null;

    for (const plugin of plugins) {
        if (Array.isArray(plugin) && plugin[0] === "expo-splash-screen") {
            const cfg = plugin[1];
            if (cfg?.backgroundColor) return cfg.backgroundColor;
        }
    }

    return null;
}

async function ensureDir(dir) {
    await fs.mkdir(dir, { recursive: true });
}

function withExt(filename, ext) {
    const base = filename.replace(/\.[^.]+$/, "");
    return `${base}.${ext}`;
}

async function loadInputImage(inputPath) {
    const image = sharp(inputPath, { failOn: "none" });
    const meta = await image.metadata();

    if (!meta.width || !meta.height) {
        throw new Error("Could not read input image dimensions");
    }

    // Normalize to 1024x1024 (square) for consistent downstream processing.
    // If the image is already 1024x1024, this is a no-op.
    const normalized = image
        .resize(1024, 1024, {
            fit: "contain",
            background: { r: 0, g: 0, b: 0, alpha: 0 },
        })
        .ensureAlpha();

    const normalizedMeta = await normalized.metadata();

    return {
        image: normalized,
        meta: normalizedMeta,
        hadAlpha: Boolean(meta.hasAlpha),
    };
}

async function writePng(pipeline, outputPath) {
    await pipeline.png({ compressionLevel: 9 }).toFile(outputPath);
}

async function generateAssets({ inputPath, outputDir }) {
    const appJson = await readAppJson();

    const androidBgHex =
        appJson?.expo?.android?.adaptiveIcon?.backgroundColor ?? "#ffffff";
    const splashBgHex = getSplashBackgroundColor(appJson) ?? "#ffffff";

    const androidBg = hexToRgba(androidBgHex, 1);
    const splashBg = hexToRgba(splashBgHex, 1);

    const { image: logo, hadAlpha } = await loadInputImage(inputPath);

    // --- 1) App icon (1024x1024) ---
    // iOS icons must be opaque; we flatten against a background color.
    // Using Android adaptive backgroundColor keeps the brand consistent.
    const iconSize = 1024;
    const iconMarkSize = 900;

    const iconMark = await logo
        .clone()
        .resize(iconMarkSize, iconMarkSize, {
            fit: "contain",
            background: { r: 0, g: 0, b: 0, alpha: 0 },
        })
        .toBuffer();

    const icon = sharp({
        create: {
            width: iconSize,
            height: iconSize,
            channels: 4,
            background: androidBg,
        },
    }).composite([{ input: iconMark, gravity: "center" }]);

    await writePng(icon, path.join(outputDir, "icon.png"));

    // --- 2) Android adaptive icon foreground (transparent, padded) ---
    // Foreground should have extra padding for safe zone.
    const fgSize = 1024;
    const fgMarkSize = 768;

    const fgMark = await logo
        .clone()
        .resize(fgMarkSize, fgMarkSize, {
            fit: "contain",
            background: { r: 0, g: 0, b: 0, alpha: 0 },
        })
        .toBuffer();

    const foreground = sharp({
        create: {
            width: fgSize,
            height: fgSize,
            channels: 4,
            background: { r: 0, g: 0, b: 0, alpha: 0 },
        },
    }).composite([{ input: fgMark, gravity: "center" }]);

    await writePng(
        foreground,
        path.join(outputDir, "android-icon-foreground.png"),
    );

    // --- 3) Android adaptive icon background (solid color) ---
    const background = sharp({
        create: {
            width: 1024,
            height: 1024,
            channels: 4,
            background: androidBg,
        },
    });

    await writePng(
        background,
        path.join(outputDir, "android-icon-background.png"),
    );

    // --- 4) Android monochrome (best-effort) ---
    // For best results, the source logo should already have transparency.
    // If the source has no alpha, this will likely become a solid square.
    const mono = logo.clone().tint("#ffffff");
    await writePng(mono, path.join(outputDir, "android-icon-monochrome.png"));

    // --- 5) Web favicon (48x48) ---
    // Keep it simple: transparent PNG with contained mark.
    const favicon = sharp({
        create: {
            width: 48,
            height: 48,
            channels: 4,
            background: { r: 0, g: 0, b: 0, alpha: 0 },
        },
    }).composite([
        {
            input: await logo
                .clone()
                .resize(44, 44, {
                    fit: "contain",
                    background: { r: 0, g: 0, b: 0, alpha: 0 },
                })
                .toBuffer(),
            gravity: "center",
        },
    ]);

    await writePng(favicon, path.join(outputDir, "favicon.png"));

    // --- 6) Splash icon (512x512) ---
    // Expo splash-screen plugin scales it down; keep transparent mark.
    const splashMark = await logo
        .clone()
        .resize(512, 512, {
            fit: "contain",
            background: { r: 0, g: 0, b: 0, alpha: 0 },
        })
        .toBuffer();

    // Some teams prefer an opaque splash asset; we keep the mark transparent.
    // If you want it flattened, change the background to splashBg.
    const splash = sharp({
        create: {
            width: 512,
            height: 512,
            channels: 4,
            background: { r: 0, g: 0, b: 0, alpha: 0 },
        },
    }).composite([{ input: splashMark, gravity: "center" }]);

    await writePng(splash, path.join(outputDir, "splash-icon.png"));

    return {
        androidBgHex,
        splashBgHex,
        hadAlpha,
    };
}

async function main() {
    const args = process.argv.slice(2);
    const inputArg = args[0] && !args[0].startsWith("--") ? args[0] : null;

    const inputPath = path.join(repoRoot, inputArg ?? INPUT_DEFAULT);

    if (!(await fileExists(inputPath))) {
        console.error(
            `Input image not found: ${path.relative(repoRoot, inputPath)}\n` +
                `Expected: ${INPUT_DEFAULT} in repo root, or pass a path: node scripts/generate-assets.mjs path/to/logo.png`,
        );
        process.exit(1);
    }

    await ensureDir(OUTPUT_DIR);

    const result = await generateAssets({
        inputPath,
        outputDir: OUTPUT_DIR,
    });

    console.log("Generated assets in assets/images:");
    console.log("- icon.png");
    console.log("- android-icon-foreground.png");
    console.log("- android-icon-background.png");
    console.log("- android-icon-monochrome.png");
    console.log("- favicon.png");
    console.log("- splash-icon.png");
    console.log("");
    console.log(
        `Used android adaptive backgroundColor: ${result.androidBgHex}`,
    );
    console.log(
        `Splash backgroundColor (from app.json): ${result.splashBgHex}`,
    );
    if (!result.hadAlpha) {
        console.log(
            "Note: input logo has no alpha channel; monochrome/adaptive foreground may not look right. Consider exporting a transparent PNG.",
        );
    }
}

main().catch((err) => {
    console.error(err);
    process.exit(1);
});
