# Q-Sci: Your Co-Pilot for Construction Intelligence
<<img width="1206" height="734" alt="Screenshot 2025-09-22 at 16 42 16" src="https://github.com/user-attachments/assets/b1ac16ce-8d8f-447b-90ac-60a0caa1ba29" />

Q-Sci is an AI-native platform designed to serve as an intelligent co-pilot for Quantity Surveyors, contractors, and builders. It streamlines the creation of essential construction documentation, from preliminary estimates to detailed Bills of Quantities (BQs), by leveraging the power of the Google Gemini API.

## Key Features

- **AI-Powered Chat**: Engage in a natural conversation with an AI assistant to get quick cost estimates, draft proposals, and get answers to complex construction-related questions.
- **Intelligent Document Generation**: Effortlessly create professional documents like Proposals, BQ Drafts, and Site Reports using AI prompts or pre-defined templates.
- **Floor Plan Analysis**: Upload architectural drawings (images/PDFs) and have the AI automatically analyze them to generate a detailed and editable Bill of Quantities.
- **Interactive BQ Editor**: Fine-tune AI-generated BQs. The editor provides visual feedback by highlighting corresponding elements directly on the uploaded floor plan.
- **Project Workspace**: A centralized hub for each project, organizing AI chats, generated documents, and source files in one place.
- **Version Control**: Automatically track changes to your documents, with the ability to view and revert to previous versions.

## Tech Stack

- **Frontend**: [React](https://reactjs.org/), [TypeScript](https://www.typescriptlang.org/), [Tailwind CSS](https://tailwindcss.com/)
- **AI Backend**: [Google Gemini API](https://ai.google.dev/) via the `@google/genai` SDK.

---

## Getting Started

Follow these instructions to get a copy of the project up and running on your local machine for development and testing purposes.

### Prerequisites

You need a modern web browser and a way to serve the static files. While `npm` is not required to install dependencies (as they are handled by an `importmap`), you will need it to run the local server via `npx`.

- [Node.js](https://nodejs.org/) (which includes npm)

### Installation & Setup

1.  **Clone the repository:**
    ```bash
    git clone https://github.com/your-username/q-sci.git
    cd q-sci
    ```

2.  **Set up Environment Variables:**
    The application requires a Google Gemini API key to function.

    -   Create a new file named `.env` in the root of the project directory.
    -   Add your API key to this file:

    ```
    API_KEY=YOUR_GEMINI_API_KEY_HERE
    ```
    -   You can get your API key from [Google AI Studio](https://aistudio.google.com/app/apikey).

    > **Note**: This project setup is for client-side development and assumes the API key is available in the environment. In a production application, you should **never** expose your API key on the client side. Instead, you would create a backend service that proxies requests to the Gemini API.

3.  **No `npm install` needed!**
    This project uses an `importmap` in `index.html` to load libraries like React and `@google/genai` directly from a CDN. This simplifies the setup for this prototype.

### Running the Application

Because this is a simple static application using ES modules, you need a local server to handle requests correctly.

1.  **Start a local server:**
    The easiest way is to use the `serve` package. If you don't have it installed globally, you can run it with `npx`.

    ```bash
    npx serve
    ```

2.  **Open the app:**
    The server will start and give you a local URL, typically `http://localhost:3000`. Open this URL in your web browser.

    You should now see the Q-Sci landing page!

---

## Project Structure

```
/
├── components/         # React components organized by feature
│   ├── dashboard/
│   ├── layout/
│   ├── project/
│   ├── projects/
│   ├── settings/
│   └── ui/             # Reusable UI elements (Icons, Logo, etc.)
├── services/           # Modules for external services (e.g., Gemini API calls)
│   └── geminiService.ts
├── types/              # TypeScript type definitions
│   └── index.ts
├── App.tsx             # Main application component
├── index.html          # Entry point of the web app
├── index.tsx           # React root renderer
├── README.md           # This file
└── metadata.json       # Application metadata
```

## Contributing

Contributions are welcome! If you have suggestions for improvements or find any issues, please feel free to open an issue or submit a pull request.

## License

This project is licensed under the MIT License - see the LICENSE.md file for details.
