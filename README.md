# QuantFlow - Quantitative Finance Platform

A modern React application for quantitative finance analysis and portfolio management.

## 🚀 Quick Start

### Prerequisites
- Node.js (v16 or higher)
- npm or yarn
- Supabase account

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd quantflow
```

2. Install dependencies:
```bash
npm install
```

3. Set up Supabase:
   - Follow the instructions in [SUPABASE_SETUP.md](./SUPABASE_SETUP.md)
   - Create a `.env.local` file with your Supabase credentials

4. Start the development server:
```bash
npm start
```

The app will be available at [http://localhost:3000](http://localhost:3000)

## 🔧 Project Structure

```
src/
├── lib/           # Supabase and utility functions
├── types/         # TypeScript type definitions
├── components/    # React components
├── pages/         # Page components
└── contexts/      # React contexts
```

## 🛠️ Built With

- **React 19** - Frontend framework
- **TypeScript** - Type safety
- **Supabase** - Backend and authentication
- **Tailwind CSS** - Styling
- **React Hook Form** - Form handling
- **React Router** - Navigation
- **Chart.js** - Data visualization

## Available Scripts

In the project directory, you can run:

### `npm start`

Runs the app in the development mode.\
Open [http://localhost:3000](http://localhost:3000) to view it in the browser.

The page will reload if you make edits.\
You will also see any lint errors in the console.

### `npm test`

Launches the test runner in the interactive watch mode.\
See the section about [running tests](https://facebook.github.io/create-react-app/docs/running-tests) for more information.

### `npm run build`

Builds the app for production to the `build` folder.\
It correctly bundles React in production mode and optimizes the build for the best performance.

The build is minified and the filenames include the hashes.\
Your app is ready to be deployed!

See the section about [deployment](https://facebook.github.io/create-react-app/docs/deployment) for more information.

### `npm run eject`

**Note: this is a one-way operation. Once you `eject`, you can’t go back!**

If you aren’t satisfied with the build tool and configuration choices, you can `eject` at any time. This command will remove the single build dependency from your project.

Instead, it will copy all the configuration files and the transitive dependencies (webpack, Babel, ESLint, etc) right into your project so you have full control over them. All of the commands except `eject` will still work, but they will point to the copied scripts so you can tweak them. At this point you’re on your own.

You don’t have to ever use `eject`. The curated feature set is suitable for small and middle deployments, and you shouldn’t feel obligated to use this feature. However we understand that this tool wouldn’t be useful if you couldn’t customize it when you are ready for it.

## Learn More

You can learn more in the [Create React App documentation](https://facebook.github.io/create-react-app/docs/getting-started).

To learn React, check out the [React documentation](https://reactjs.org/).
