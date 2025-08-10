# SEMS Monitoring App

This is a Next.js application for Smart Electric Metering System (SEMS) Monitoring.

## Running the App Locally

### Prerequisites

- Node.js (version 16 or higher recommended)
- npm (comes with Node.js)

### Steps to Run Locally

1. **Extract the Zip File**

   Unzip the project archive to a folder on your laptop.

2. **Install Dependencies**

   Open a terminal in the project folder and run:

   ```
   npm install
   ```

3. **Build the Application**

   Run the following command to create an optimized production build:

   ```
   npm run build
   ```

4. **Start the Production Server**

   Start the Next.js production server with:

   ```
   npm start
   ```

   The app will be available at [http://localhost:3000](http://localhost:3000).

5. **Development Mode (Optional)**

   For development with hot reload, run:

   ```
   npm run dev
   ```

   The development server runs on port 8000 by default. Access the app at [http://localhost:8000](http://localhost:8000).

## Notes

- Ensure your Firebase configuration and environment variables are set up correctly for authentication and data fetching.
- The app uses Tailwind CSS for styling.
- For any issues or further assistance, please contact the developer.
