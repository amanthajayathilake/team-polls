import dotenv from "dotenv";
import swaggerJSDoc from "swagger-jsdoc";
import swaggerUi from "swagger-ui-express";

dotenv.config();

const swaggerOptions = {
  swaggerDefinition: {
    openapi: "3.0.0",
    info: {
      title: "Team Polls",
      version: "1.0.0",
      description: "API documentation for Team Polls",
    },
    servers: [
      {
        url: `${process.env.BACKEND_URL}`,
        description: "Development server",
      },
    ],
    components: {
      schemas: {
        Product: {
          type: "object",
          properties: {
            id: {
              type: "number",
              description: "Unique identifier for the poll",
            },
          },
          required: ["naidme"],
        },
      },
    },
  },
  apis: ["./src/routes/*.ts"], // Path to the API docs
};

const swaggerSpec = swaggerJSDoc(swaggerOptions);

const setupSwagger = (app: any) => {
  app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec));
};

export default setupSwagger;
