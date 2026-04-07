# prism-logic

This project was created with Shipper.

## 🚀 Tech Stack

- **Framework:** React
- **Package Manager:** bun

## 📋 Prerequisites

Before you begin, ensure you have the following installed:

- [Node.js](https://nodejs.org/) (v18 or higher recommended)
- [bun](https://www.npmjs.com/package/bun)

## 🛠️ Getting Started

### 1. Install Dependencies

```bash
bun install
```

### 2. Configure Accounts (Optional in local dev)

Copy `.env.example` to `.env.local` and add your Supabase values:

```bash
cp .env.example .env.local
```

Required vars:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

If these vars are missing, the app still runs, but account features stay disabled.

Apply the included migration in your Supabase project:

- [supabase/migrations/20260407_create_users_table.sql](/Users/marcdeblasie/Desktop/Orbital-Polymeter-Shipper-3a7c1ed059ce0222269ce4d939b199e8ae3442d7/supabase/migrations/20260407_create_users_table.sql)

This creates the `public.users` table used for:

- account identity
- future free/pro plan metadata
- comped access
- onboarding state

### 3. Run the Development Server

```bash
bun dev
```

The application will start and display the local URL in your terminal.

## 📜 Available Scripts

- `bun dev` - Start development server
- `bun build` - Build for production
- `bun lint` - Run linter

## 🏗️ Building for Production

```bash
bun build
```

## 📚 Learn More

- [React Documentation](https://react.dev)
- [React Tutorial](https://react.dev/learn)
- [React GitHub](https://github.com/facebook/react)
## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

---

Built with ❤️ using [Shipper](https://shipper.now)
