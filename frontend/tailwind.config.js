/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        // Tally-inspired palette
        gateway: "#10245c",   // deep gateway blue
        panel: "#eef1f8",
        accent: "#f4b942",    // Tally highlight yellow
        ink: "#1a2233",
      },
      fontFamily: {
        mono: ["ui-monospace", "SFMono-Regular", "Menlo", "Consolas", "monospace"],
      },
    },
  },
  plugins: [],
};
