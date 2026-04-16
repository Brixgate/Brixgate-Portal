import type { Config } from 'tailwindcss'

const config: Config = {
  darkMode: ['class'],
  content: [
    './pages/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    './app/**/*.{ts,tsx}',
  ],
  theme: {
    container: {
      center: true,
      padding: '2rem',
      screens: { '2xl': '1400px' },
    },
    extend: {
      // ─── Brixgate Design Tokens ────────────────────────────────────────────
      colors: {
        // CSS variable bridge for shadcn
        background: 'var(--background)',
        foreground: 'var(--foreground)',
        border: 'hsl(var(--border))',
        input: 'hsl(var(--input))',
        ring: 'hsl(var(--ring))',
        card: {
          DEFAULT: 'hsl(var(--card))',
          foreground: 'hsl(var(--card-foreground))',
        },
        popover: {
          DEFAULT: 'hsl(var(--popover))',
          foreground: 'hsl(var(--popover-foreground))',
        },
        muted: {
          DEFAULT: 'hsl(var(--muted))',
          foreground: 'hsl(var(--muted-foreground))',
        },
        secondary: {
          DEFAULT: 'hsl(var(--secondary))',
          foreground: 'hsl(var(--secondary-foreground))',
        },
        destructive: {
          DEFAULT: 'hsl(var(--destructive))',
          foreground: 'hsl(var(--destructive-foreground))',
        },
        accent: {
          DEFAULT: 'hsl(var(--accent))',
          foreground: 'hsl(var(--accent-foreground))',
        },

        // ── Background layers (no borders — use shade contrast)
        bg: {
          canvas:  '#F7F8FA', // outer page background
          surface: '#FFFFFF', // sidebar, topbar, cards
          sunken:  '#F3F4F6', // stat card bg, search input bg, table header
          hover:   '#F9FAFB', // hover state on surface rows
        },

        // ── Brixgate Primary Red — CTAs, active nav, primary actions
        'brix-red': {
          DEFAULT: '#D51520',
          hover:   '#B81119',
          subtle:  '#FEF2F2', // tinted bg (active nav pill, banner bg)
          border:  '#FECACA',
          light:   '#FFF1F0',
        },

        // ── Brixgate Orange — past sessions, indicators, secondary accents
        'brix-orange': {
          DEFAULT: '#FF5748',
          subtle:  '#FFF1F0',
        },

        // ── Purple — notifications, promo banners (decorative only)
        'brix-purple': {
          DEFAULT:  '#922BF7',
          deep:     '#542186',
          subtle:   '#ECD9FF',
          soft:     '#F5F0FF',
          gradient: 'linear-gradient(135deg, #542186 19%, rgba(73,9,135,0.9) 29%, #922BF7 100%)',
        },

        // ── Text scale
        'text-pri':  '#111827',
        'text-sec':  '#6B7280',
        'text-mute': '#9CA3AF',
        'text-dis':  '#D1D5DB',

        // ── Borders (very subtle — minimal use)
        'border-def':    '#E5E7EB',
        'border-strong': '#D1D5DB',
        'border-faint':  '#F3F4F6',

        // ── Semantic states
        'status-success': '#12B76A',
        'status-success-bg': '#ECFDF3',
        'status-warning': '#F59E0B',
        'status-warning-bg': '#FFFBEB',
        'status-error':   '#D51520',
        'status-error-bg': '#FEF2F2',
        'status-info':    '#0EA5E9',
        'status-info-bg': '#F0F9FF',

        // ── Icon accent tints for stat cards (each has bg tint + icon colour)
        'icon-purple-bg':  '#ECD9FF',
        'icon-purple':     '#7C3AED',
        'icon-gold-bg':    '#FFF6DE',
        'icon-gold':       '#D97706',
        'icon-teal-bg':    '#CCFBF1',
        'icon-teal':       '#0D9488',
        'icon-blue-bg':    '#DBEAFE',
        'icon-blue':       '#2563EB',
        'icon-rose-bg':    '#FFE4E6',
        'icon-rose':       '#E11D48',
        'icon-green-bg':   '#D1FAE5',
        'icon-green':      '#059669',
      },

      // ─── Typography ────────────────────────────────────────────────────────
      fontFamily: {
        display: ['var(--font-dm-sans)', 'DM Sans', 'sans-serif'],
        body: [
          "'Segoe UI'",
          'var(--font-inter)',
          'Inter',
          '-apple-system',
          'BlinkMacSystemFont',
          'sans-serif',
        ],
        mono: ['JetBrains Mono', 'Fira Code', 'Consolas', 'monospace'],
      },

      // ─── Border Radius ─────────────────────────────────────────────────────
      borderRadius: {
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 2px)',
        sm: 'calc(var(--radius) - 4px)',
        '2': '2px',
        '4': '4px',
        '6': '6px',
        '8': '8px',
        '10': '10px',
        '12': '12px',
        '16': '16px',
      },

      // ─── Shadows (elevation system) ────────────────────────────────────────
      boxShadow: {
        xs:         '0px 1px 2px rgba(16,24,40,0.05)',
        sm:         '0px 1px 3px rgba(16,24,40,0.10), 0px 1px 2px rgba(16,24,40,0.06)',
        md:         '0px 4px 8px -2px rgba(16,24,40,0.10), 0px 2px 4px -2px rgba(16,24,40,0.06)',
        lg:         '0px 12px 16px -4px rgba(16,24,40,0.08), 0px 4px 6px -2px rgba(16,24,40,0.03)',
        card:       '0px 1px 3px rgba(16,24,40,0.06)',
        'card-hover': '0px 4px 12px rgba(16,24,40,0.10)',
      },

      // ─── Fixed layout dimensions ───────────────────────────────────────────
      width: {
        sidebar: '260px',
      },
      height: {
        topbar: '64px',
      },

      keyframes: {
        'accordion-down': {
          from: { height: '0' },
          to: { height: 'var(--radix-accordion-content-height)' },
        },
        'accordion-up': {
          from: { height: 'var(--radix-accordion-content-height)' },
          to: { height: '0' },
        },
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
        'fade-in': {
          from: { opacity: '0', transform: 'translateY(4px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
      },
      animation: {
        'accordion-down': 'accordion-down 0.2s ease-out',
        'accordion-up': 'accordion-up 0.2s ease-out',
        shimmer: 'shimmer 1.5s infinite linear',
        'fade-in': 'fade-in 0.15s ease-out',
      },
    },
  },
  plugins: [require('tailwindcss-animate')],
}

export default config
