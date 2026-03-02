console.log("✅ Tailwind config cargado: EAFIT");

/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        eafit: {
          primary: "#000066",
          secondary: "#00A9E0",
          bg: "#F8F9FB",
          surface: "#FFFFFF",
          border: "#E5E7EB",
          text: "#111827",
          muted: "#6B7280",
          fg: "#0B1220",
          subtle: "#F3F5F9",
          ring: "rgba(0,169,224,.25)",
        },
        status: {
          success: "#16A34A",
          danger: "#DC2626",
          warning: "#F59E0B",
          info: "#2563EB",
          neutral: "#4B5563",
        },
      },

      // ✅ más “institucional”
      borderRadius: {
        card: "12px",
        input: "10px",
        btn: "10px",
        pill: "9999px",
      },

      // ✅ sombras más sutiles (menos “glow”)
      boxShadow: {
        soft: "0 6px 18px rgba(17,24,39,0.06)",
        card: "0 8px 22px rgba(17,24,39,0.08)",
        hover: "0 12px 28px rgba(17,24,39,0.10)",
        top: "0 -6px 18px rgba(0,0,0,0.06)",
      },

      maxWidth: { content: "1440px" },
      backdropBlur: { glass: "14px" },

      // si sientes que esto “ensucia” lo visual, puedes dejarlo pero úsalo solo en landing,
      // no en pantallas de sistema
      backgroundImage: {
        "app-radial":
          "radial-gradient(900px circle at 20% 0%, rgba(0,169,224,0.10), transparent 55%), radial-gradient(700px circle at 80% 10%, rgba(0,0,102,0.08), transparent 50%)",
        "card-glow":
          "radial-gradient(600px circle at 0% 0%, rgba(0,169,224,0.10), transparent 55%)",
      },
    },
  },
  plugins: [],
};