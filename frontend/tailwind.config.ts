import type { Config } from "tailwindcss";
// @ts-expect-error - daisyui does not ship type declarations
import daisyui from "daisyui";

const config = {
    content: [
        "./pages/**/*.{js,ts,jsx,tsx,mdx}",
        "./components/**/*.{js,ts,jsx,tsx,mdx}",
        "./app/**/*.{js,ts,jsx,tsx,mdx}",
    ],
    theme: {
        extend: {},
    },
    plugins: [daisyui],
    daisyui: {
        themes: ["light", "dark"],
    },
} satisfies Config & { daisyui: object };

export default config;