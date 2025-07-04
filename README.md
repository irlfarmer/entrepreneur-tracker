# Entrepreneur Sales & Inventory Tracker

A modern, mobile-first web application built for entrepreneurs to track sales, manage inventory, and monitor business expenses. Built with Next.js, TypeScript, MongoDB, and Tailwind CSS.

## Features

### 🏪 Inventory Management
- Add, edit, and delete products
- Track stock levels with low-stock alerts
- Search and filter products by category
- Cost and sale price tracking with profit margin calculations
- SKU management and product categorization

### 💰 Sales Tracking
- Record sales with product selection
- Real-time profit calculations
- Sales analytics and reporting
- Date range filtering and search
- Revenue and profit margin tracking

### 📊 Expense Management
- Categorized expense tracking
- Receipt upload support
- Date-based filtering
- Expense category analytics
- Monthly/weekly expense summaries

### 📈 Dashboard Analytics
- Today's sales and profit overview
- Weekly and monthly performance metrics
- Low stock product alerts
- Top-performing products
- Visual charts and graphs
- Recent activity timeline

### 🔐 Authentication
- Secure email/password authentication
- Google OAuth integration
- Session management with NextAuth.js
- User-specific data isolation

### 📱 Mobile-First Design
- Responsive design for all screen sizes
- Touch-friendly interface
- Mobile navigation with sidebar
- Optimized for entrepreneurs on-the-go

## Tech Stack

- **Frontend**: Next.js 14, React, TypeScript
- **Styling**: Tailwind CSS, Headless UI
- **Database**: MongoDB Atlas
- **Authentication**: NextAuth.js
- **Charts**: Chart.js with React-Chartjs-2
- **Icons**: Heroicons
- **Deployment**: Vercel

## Getting Started

### Prerequisites

- Node.js 18+ and npm
- MongoDB Atlas account
- Google OAuth credentials (optional)

### Environment Setup

1. Clone the repository:
```bash
git clone <repository-url>
cd entrepreneur-tracker
```

2. Install dependencies:
```bash
npm install
```

3. Create environment variables:
```bash
cp env.template .env.local
```

4. Configure your `.env.local` file:
```env
# Database
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/entrepreneur-tracker?retryWrites=true&w=majority

# NextAuth.js
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your-nextauth-secret-here

# Google OAuth (Optional)
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
```

### MongoDB Setup

1. Create a MongoDB Atlas account at [mongodb.com](https://www.mongodb.com/atlas)
2. Create a new cluster
3. Create a database user with read/write permissions
4. Get your connection string and add it to `.env.local`
5. Whitelist your IP address or use 0.0.0.0/0 for development

### Google OAuth Setup (Optional)

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing
3. Enable Google+ API
4. Create OAuth 2.0 credentials
5. Add authorized redirect URI: `http://localhost:3000/api/auth/callback/google`
6. Add client ID and secret to `.env.local`

### Running the Application

1. Start the development server:
```bash
npm run dev
```

2. Open [http://localhost:3000](http://localhost:3000) in your browser

3. Create an account or sign in with Google

## Deployment to Vercel

### Automatic Deployment

1. Push your code to GitHub
2. Connect your repository to Vercel
3. Add environment variables in Vercel dashboard
4. Deploy automatically on every push

### Manual Deployment

1. Install Vercel CLI:
```bash
npm install -g vercel
```

2. Deploy:
```bash
vercel
```

3. Set environment variables:
```bash
vercel env add MONGODB_URI
vercel env add NEXTAUTH_SECRET
vercel env add NEXTAUTH_URL
vercel env add GOOGLE_CLIENT_ID
vercel env add GOOGLE_CLIENT_SECRET
```

### Environment Variables for Production

Make sure to set these in your Vercel dashboard:

- `MONGODB_URI`: Your MongoDB connection string
- `NEXTAUTH_URL`: Your production domain (e.g., https://yourapp.vercel.app)
- `NEXTAUTH_SECRET`: A secure random string
- `GOOGLE_CLIENT_ID`: Google OAuth client ID
- `GOOGLE_CLIENT_SECRET`: Google OAuth client secret

## Usage Guide

### Getting Started
1. **Sign Up**: Create an account or sign in with Google
2. **Add Products**: Start by adding your inventory items
3. **Record Sales**: Track sales as they happen
4. **Monitor Expenses**: Keep track of business costs
5. **View Analytics**: Monitor your business performance

### Key Workflows

#### Adding Products
1. Navigate to "Inventory" → "Add Product"
2. Fill in product details (name, category, pricing, stock)
3. Set cost and sale prices for automatic profit calculations
4. Save and manage stock levels

#### Recording Sales
1. Go to "Sales" → "Record Sale"
2. Select product from dropdown
3. Enter quantity and confirm unit price
4. Add customer name and notes (optional)
5. Save to automatically update inventory

#### Tracking Expenses
1. Visit "Expenses" → "Add Expense"
2. Choose category and enter description
3. Set amount and date
4. Upload receipt (optional)
5. Track spending by category

#### Dashboard Insights
- View real-time sales metrics
- Monitor low stock alerts
- Track profit margins
- Analyze business trends

## API Routes

The application includes RESTful API routes:

### Products
- `GET /api/products` - List products with filtering
- `POST /api/products` - Create new product
- `GET /api/products/[id]` - Get product by ID
- `PUT /api/products/[id]` - Update product
- `DELETE /api/products/[id]` - Delete product

### Sales
- `GET /api/sales` - List sales with filtering
- `POST /api/sales` - Record new sale

### Expenses
- `GET /api/expenses` - List expenses with filtering
- `POST /api/expenses` - Record new expense

### Authentication
- `POST /api/auth/register` - User registration
- NextAuth.js handles OAuth and session management

## Project Structure

```
entrepreneur-tracker/
├── src/
│   ├── app/                 # Next.js app directory
│   │   ├── api/            # API routes
│   │   ├── auth/           # Authentication pages
│   │   ├── dashboard/      # Dashboard pages
│   │   ├── inventory/      # Inventory management
│   │   ├── sales/          # Sales tracking
│   │   ├── expenses/       # Expense management
│   │   └── layout.tsx      # Root layout
│   ├── components/         # React components
│   │   ├── Dashboard/      # Dashboard components
│   │   ├── Inventory/      # Inventory components
│   │   ├── Sales/          # Sales components
│   │   ├── Expenses/       # Expense components
│   │   └── Layout/         # Layout components
│   ├── lib/               # Utilities and configurations
│   │   ├── auth.ts        # NextAuth configuration
│   │   ├── database.ts    # Database operations
│   │   ├── mongodb.ts     # MongoDB connection
│   │   ├── types.ts       # TypeScript types
│   │   └── utils.ts       # Utility functions
│   └── types/             # Type definitions
├── public/                # Static assets
├── .env.template         # Environment variables template
├── vercel.json          # Vercel deployment config
└── README.md           # This file
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## Support

For issues and questions:
1. Check the documentation
2. Search existing issues
3. Create a new issue with detailed information

## License

This project is licensed under the MIT License.

---

**Built for entrepreneurs, by entrepreneurs. Start tracking your business success today!**
