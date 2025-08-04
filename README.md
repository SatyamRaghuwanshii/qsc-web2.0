# QSC Web App (Quantity Surveying and Construction)

**Quantify, Structure, Conquer.**

This is a web application designed to assist in civil engineering and construction projects by providing tools for material quantity estimation and basic floor plan design. The app helps users calculate the required materials for construction tasks, manage these calculations as projects, and even generate a basic floor plan that can be used for further calculations.

## 🚀 Features

* **Material Calculation**: Calculate quantities for concrete and brickwork based on user-provided dimensions and material mixes.
* **Project Management**: Save, load, update, and delete multiple projects, each containing a list of individual material calculations.
* **Report Generation**: Generate detailed project reports in both CSV and PDF formats for easy sharing and record-keeping.
* **Interactive Floor Plan Designer**: A simple, interactive tool to draw walls, select, and move elements on a canvas. Dimensions from the floor plan can be exported directly to the material calculator for quantity surveying.
* **Responsive Design**: The application is designed to be accessible and usable on various devices, from desktops to mobile phones.

## ⚙️ Technology Stack

**Backend**:
* **Node.js**: A JavaScript runtime environment for building server-side applications.
* **Express.js**: A minimal and flexible Node.js web application framework that provides a robust set of features for web and mobile applications.
* **MongoDB**: A NoSQL document database used to store project data, including all calculations.
* **Mongoose**: An elegant MongoDB object modeling tool for Node.js, providing a straightforward, schema-based solution to model your application data.
* **PDFKit**: A PDF generation library for Node.js to create and download the PDF reports.
* **CORS**: A Node.js package for providing a Connect/Express middleware that can be used to enable Cross-Origin Resource Sharing.
* **Dotenv**: A module to load environment variables from a `.env` file, ensuring sensitive information like database connection strings are kept out of the source code.
* **Google Generative AI**: An API client to be used for implementing AI-driven floor plan generation. (Currently mocked for demonstration).

**Frontend**:
* **HTML5**: The markup language for structuring the web pages.
* **CSS3**: For styling the application, including a responsive and clean user interface.
* **JavaScript**: For all client-side logic, including handling user interactions, performing calculations, managing the application state, and communicating with the backend API.

## 🛠️ Installation and Setup

### Prerequisites

* Node.js (LTS version recommended)
* MongoDB installed and running on your local machine.

### Step-by-Step Instructions

1.  **Clone the repository:**
    ```bash
    git clone [https://github.com/your-username/qsc-web2.0.git](https://github.com/your-username/qsc-web2.0.git)
    cd qsc-web2.0
    ```

2.  **Setup the Backend:**
    * Navigate to the `backend` directory.
    * Install the required Node.js packages:
        ```bash
        cd backend
        npm install
        ```
    * Create a `.env` file in the `backend` directory and add your environment variables. Make sure your MongoDB URI is correct.
        ```dotenv
        PORT=5000
        MONGODB_URI=mongodb://localhost:27017/qsc_app
        GOOGLE_API_KEY=your_google_api_key
        ```
    * Start the backend server:
        ```bash
        node server.js
        ```
        The server will start on `http://localhost:5000`. You will see a confirmation message in your terminal indicating that both the server and MongoDB have connected successfully.

3.  **Access the Frontend:**
    * The frontend is served by the Express server. Simply open your web browser and navigate to `http://localhost:5000`.
    * You can directly access the main tools via these URLs:
        * **Home Page**: `http://localhost:5000`
        * **QSC Calculator**: `http://localhost:5000/qsc.html`
        * **Floor Plan Designer**: `http://localhost:5000/floorplan_designer.html`
