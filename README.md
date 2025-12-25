# Metrrik: Your Co-Pilot for Construction Intelligence

![Metrrik Dashboard](https://i.imgur.com/example-screenshot.png) <!-- Replace with an actual screenshot -->

Metrrik is an AI-native platform designed to serve as an intelligent co-pilot for Quantity Surveyors, contractors, and builders. It streamlines the creation of essential construction documentation, from preliminary estimates to detailed Bills of Quantities (BQs), by leveraging the power of the Google Gemini API.

## Key Features

- **AI-Powered Chat**: Engage in a natural conversation with an AI assistant to get quick cost estimates, draft proposals, and get answers to complex construction-related questions.
- **Intelligent Document Generation**: Effortlessly create professional documents like Proposals, BQ Drafts, and Site Reports using AI prompts or pre-defined templates.
- **Floor Plan Analysis**: Upload architectural drawings (images/PDFs) and have the AI automatically analyze them to generate a detailed and editable Bill of Quantities.
- **Interactive BQ Editor**: Fine-tune AI-generated BQs. The editor provides visual feedback by highlighting corresponding elements directly on the uploaded floor plan.
# Metrrik: Your Co-Pilot for Construction Intelligence

![Metrrik Dashboard](https://i.imgur.com/example-screenshot.png) <!-- Replace with an actual screenshot -->

Metrrik is an expert AI assistant for Quantity Surveyors in Kenya. It acts as an intelligent co-pilot, helping with tasks like creating cost estimates, drafting Bills of Quantities (BQs), and generating professional construction documents.

## Features

- **AI-Powered Analysis:** Use Google Gemini to analyze floor plans and generate detailed reports.
- **Project Management:** Organize your construction projects, documents, and measurements in one place.
- **Cost Estimation:** Generate preliminary estimates and detailed BQs with the help of AI.
- **Knowledge Base:** Access a comprehensive library of construction materials, rates, and standards.
- **Collaboration:** Share projects and documents with your team and clients.

## Getting Started

### Prerequisites

Because this is a simple static application using ES modules, you need a local server to handle requests correctly.

1.  **Start a local server:**
    The easiest way is to use the `serve` package. If you don't have it installed globally, you can run it with `npx`.

    ```bash
    npx serve
    ```

2.  **Open the app:**
    The server will start and give you a local URL, typically `http://localhost:3000`. Open this URL in your web browser.

    You should now see the Metrrik landing page!

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

## Documentation

- [Developer Mode Guide](docs/DEVELOPER_MODE_GUIDE.md) - Bypass free analysis limit for testing
- [API Setup Guide](docs/API_SETUP.md)
- [AWS S3 Setup](docs/AWS_S3_SETUP.md)
- [Database Usage Examples](docs/DATABASE_USAGE_EXAMPLES.md)
- [MongoDB Setup](docs/MONGODB_SETUP.md)
- [Knowledge Base Architecture](docs/KNOWLEDGE_BASE_ARCHITECTURE.md)

## Contributing

Contributions are welcome! If you have suggestions for improvements or find any issues, please feel free to open an issue or submit a pull request.

## License

This project is licensed under the MIT License - see the LICENSE.md file for details.
