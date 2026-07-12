import type { Config } from "tailwindcss";
import plugin from "tailwindcss/plugin";
import tailwindcssAnimate from "tailwindcss-animate";

const addAuroraColorVariables = plugin(({ addBase, theme }) => {
	addBase({
		":root": {
			"--transparent": "transparent",
			"--white": theme("colors.white"),
			"--black": theme("colors.black"),
			"--blue-300": theme("colors.blue.300"),
			"--blue-400": theme("colors.blue.400"),
			"--blue-500": theme("colors.blue.500"),
			"--indigo-300": theme("colors.indigo.300"),
			"--violet-200": theme("colors.violet.200"),
		},
	});
});

export default {
	darkMode: ["class"],
	content: [
		"./pages/**/*.{ts,tsx}",
		"./components/**/*.{ts,tsx}",
		"./app/**/*.{ts,tsx}",
		"./src/**/*.{ts,tsx}",
	],
	prefix: "",
	theme: {
		container: {
			center: true,
			padding: {
				DEFAULT: '1rem',
				sm: '1.5rem',
				lg: '2rem',
				xl: '3rem',
			},
			screens: {
				'2xl': '1400px'
			}
		},
			extend: {
			colors: {
				forest: 'hsl(var(--forest))',
				paper: 'hsl(var(--paper))',
				ink: 'hsl(var(--ink))',
				border: 'hsl(var(--border))',
				input: 'hsl(var(--input))',
				ring: 'hsl(var(--ring))',
				background: 'hsl(var(--background))',
				foreground: 'hsl(var(--foreground))',
				primary: {
					DEFAULT: 'hsl(var(--primary))',
					foreground: 'hsl(var(--primary-foreground))'
				},
				secondary: {
					DEFAULT: 'hsl(var(--secondary))',
					foreground: 'hsl(var(--secondary-foreground))'
				},
				destructive: {
					DEFAULT: 'hsl(var(--destructive))',
					foreground: 'hsl(var(--destructive-foreground))'
				},
				success: {
					DEFAULT: 'hsl(var(--success))',
					foreground: 'hsl(var(--success-foreground))'
				},
				warning: {
					DEFAULT: 'hsl(var(--warning))',
					foreground: 'hsl(var(--warning-foreground))'
				},
				info: {
					DEFAULT: 'hsl(var(--info))',
					foreground: 'hsl(var(--info-foreground))'
				},
				muted: {
					DEFAULT: 'hsl(var(--muted))',
					foreground: 'hsl(var(--muted-foreground))'
				},
				accent: {
					DEFAULT: 'hsl(var(--accent))',
					foreground: 'hsl(var(--accent-foreground))'
				},
				popover: {
					DEFAULT: 'hsl(var(--popover))',
					foreground: 'hsl(var(--popover-foreground))'
				},
				card: {
					DEFAULT: 'hsl(var(--card))',
					foreground: 'hsl(var(--card-foreground))'
				},
				sidebar: {
					DEFAULT: 'hsl(var(--sidebar-background))',
					foreground: 'hsl(var(--sidebar-foreground))',
					primary: 'hsl(var(--sidebar-primary))',
					'primary-foreground': 'hsl(var(--sidebar-primary-foreground))',
					accent: 'hsl(var(--sidebar-accent))',
					'accent-foreground': 'hsl(var(--sidebar-accent-foreground))',
					border: 'hsl(var(--sidebar-border))',
					ring: 'hsl(var(--sidebar-ring))'
				}
			},
			borderRadius: {
				lg: 'var(--radius)',
				md: 'calc(var(--radius) - 2px)',
				sm: 'calc(var(--radius) - 4px)'
			},
			boxShadow: {
				paper: '0 12px 32px -24px hsl(var(--ink) / 0.38)',
				header: '0 8px 24px hsl(var(--ink) / 0.14)',
				dialog: '0 28px 80px -24px hsl(var(--ink) / 0.55)',
			},
		keyframes: {
			'accordion-down': {
				from: {
					height: '0'
				},
				to: {
					height: 'var(--radix-accordion-content-height)'
				}
			},
			'accordion-up': {
				from: {
					height: 'var(--radix-accordion-content-height)'
				},
				to: {
					height: '0'
				}
			},
			'typewriter': {
				'from': { width: '0' },
				'to': { width: '100%' }
			},
			'blink-caret': {
				'from, to': { borderColor: 'transparent' },
				'50%': { borderColor: 'hsl(var(--primary))' }
			},
			'color-wave': {
				'0%, 100%': { color: 'hsl(var(--primary))' },
				'25%': { color: 'hsl(var(--secondary))' },
				'50%': { color: 'hsl(var(--accent))' },
				'75%': { color: 'hsl(var(--primary))' }
			},
			'fade-in-up': {
				'0%': {
					opacity: '0',
					transform: 'translateY(40px)'
				},
				'100%': {
					opacity: '1',
					transform: 'translateY(0)'
				}
			},
			'fade-in-down': {
				'0%': {
					opacity: '0',
					transform: 'translateY(-40px)'
				},
				'100%': {
					opacity: '1',
					transform: 'translateY(0)'
				}
			},
			'fade-in-left': {
				'0%': {
					opacity: '0',
					transform: 'translateX(-40px)'
				},
				'100%': {
					opacity: '1',
					transform: 'translateX(0)'
				}
			},
			'fade-in-right': {
				'0%': {
					opacity: '0',
					transform: 'translateX(40px)'
				},
				'100%': {
					opacity: '1',
					transform: 'translateX(0)'
				}
			},
			'scale-in': {
				'0%': {
					opacity: '0',
					transform: 'scale(0.9)'
				},
				'100%': {
					opacity: '1',
					transform: 'scale(1)'
				}
			},
			'aurora': {
				from: {
					backgroundPosition: '50% 50%, 50% 50%'
				},
				to: {
					backgroundPosition: '350% 50%, 350% 50%'
				}
			}
		},
		animation: {
			'accordion-down': 'accordion-down 0.2s ease-out',
			'accordion-up': 'accordion-up 0.2s ease-out',
			'typewriter': 'typewriter 2s steps(18) 0.5s 1 normal both',
			'blink-caret': 'blink-caret 0.75s step-end infinite',
			'color-wave': 'color-wave 3s ease-in-out infinite',
			'fade-in-up': 'fade-in-up 0.6s ease-out',
			'fade-in-down': 'fade-in-down 0.6s ease-out',
			'fade-in-left': 'fade-in-left 0.6s ease-out',
			'fade-in-right': 'fade-in-right 0.6s ease-out',
			'scale-in': 'scale-in 0.5s ease-out',
			'aurora': 'aurora 60s linear infinite'
		},
			fontFamily: {
				sans: ["Raleway", "ui-sans-serif", "system-ui", "sans-serif"],
				display: ["Lora", "Georgia", "serif"],
			},
		}
	},
	plugins: [
		tailwindcssAnimate,
		addAuroraColorVariables,
	],
} satisfies Config;
