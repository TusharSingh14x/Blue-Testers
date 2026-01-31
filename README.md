# IIT Goa Community Interface

A modern web application built to facilitate community interaction, event management, and resource sharing for IIT Goa. This platform leverages the latest web technologies to provide a fast, responsive, and accessible user experience.

## 🚀 Tech Stack

- **Framework**: [Next.js 16](https://nextjs.org/) (App Router)
- **Language**: [TypeScript](https://www.typescriptlang.org/)
- **Styling**: [Tailwind CSS 4](https://tailwindcss.com/) & [Shadcn UI](https://ui.shadcn.com/)
- **Database & Auth**: [Supabase](https://supabase.com/)
- **Icons**: [Lucide React](https://lucide.dev/)
- **Charts**: [Recharts](https://recharts.org/)

## 🛠️ Getting Started

Follow these instructions to get the project up and running on your local machine.

### Prerequisites

Ensure you have the following installed:
- [Node.js](https://nodejs.org/) (v18 or higher recommended)
- `npm` or `pnpm`

### Installation

1.  **Clone the repository**
    ```bash
    git clone <repository-url>
    cd <project-directory>
    ```

2.  **Install dependencies**
    ```bash
    npm install
    # or
    pnpm install
    ```

3.  **Environment Setup**
    Create a `.env.local` file in the root directory by copying the example:
    ```bash
    cp .env.example .env.local
    ```
    
    Open `.env.local` and populate the required Supabase credentials:
    ```env
    NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
    NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
    ```
    > You can find these values in your Supabase Project Settings > API.

### Running the Application

Start the development server:
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser to view the application.

## 📜 Scripts

### Build & Run
- `npm run dev`: Starts the development server.
- `npm run build`: Builds the application for production.
- `npm run start`: Starts the production server.
- `npm run lint`: Runs ESLint to check for code quality issues.

### Admin Utilities
The `scripts/` directory contains utility scripts for administrative tasks and data maintenance (e.g., fixing orphan users, deleting attendees).

To run these scripts, you can use `ts-node` or execute them directly if configured in your environment. Example:
```bash
npx tsx scripts/fix_orphan_user.ts
```

## 📂 Project Structure

- `app/`: Next.js App Router pages and layouts.
- `components/`: Reusable UI components (buttons, dialogs, charts).
- `lib/`: Utility functions and shared helpers.
- `scripts/`: Backend/Admin utility scripts.
- `public/`: Static assets (images, icons).

## 🤝 Contributing

1.  Fork the repository.
2.  Create a feature branch (`git checkout -b feature/amazing-feature`).
3.  Commit your changes (`git commit -m 'Add some amazing feature'`).
4.  Push to the branch (`git push origin feature/amazing-feature`).
5.  Open a Pull Request.