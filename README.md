# Hospital Inventory Management System (HIMS)
A modern web application for managing hospital inventory, built with Next.js and Tailwind CSS.

*Live Demo*: [https://hims-five.vercel.app/](https://hims-five.vercel.app/)

## 🚀 Features

- **Inventory Tracking**: Real-time monitoring of medical supplies
- **User Management**: Role-based access control
- **Responsive Design**: Works on all devices
- **Dashboard Analytics**: Visual data representation
- **Secure Authentication**: Protected routes and sessions

## 🛠️ Tech Stack

- **Framework**: Next.js (App Router)
- **Styling**: Tailwind CSS
- **Authentication**: NextAuth.js
- **Database**: Firebase Realtime Database
- **UI Components**: Shadcn/ui
- **Deployment**: Vercel
- **Form Handling**: React Hook Form
- **Data Visualization**: Chart.js

## 📦 Getting Started

### Prerequisites
- Node.js (v18 or later)
- npm (v9 or later)

### Installation
```bash
# Clone the repository
git clone https://github.com/ongsiewtyng/hims.git
cd hims

# Install dependencies
npm install

# Run development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## 🔧 Environment Variables

Create a `.env.local` file with the following variables:

```env
NEXT_PUBLIC_FIREBASE_API_KEY=your-key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your-domain
NEXT_PUBLIC_FIREBASE_DATABASE_URL=your-db-url
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your-id
```

## 📂 Project Structure

```
src/
├── app/               # Next.js app router
│   ├── api/           # API routes
│   ├── (auth)/        # Authentication pages
│   ├── dashboard/     # Protected routes
│   └── layout.tsx     # Root layout
├── components/        # Reusable components
├── lib/               # Utility functions
├── models/            # MongoDB models
├── public/            # Static assets
└── styles/            # Global styles
```

## 🚀 Deployment

1. Push your code to GitHub
2. Create a new project on [Vercel](https://vercel.com/)
3. Connect your GitHub repository
4. Add environment variables
5. Deploy!

## 📝 Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Create production build
- `npm run start` - Start production server
- `npm run lint` - Run ESLint

## 🤝 Contributing

Contributions are welcome! Please open an issue or submit a pull request.

## 📬 Contact

For questions or feedback, please contact:
**Ong Siew Tyng**
- Email: cybergenetic1@gmail.com
- GitHub: [@ongsiewtyng](https://github.com/ongsiewtyng)
