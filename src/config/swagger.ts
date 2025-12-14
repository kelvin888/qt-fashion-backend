import swaggerJsdoc from 'swagger-jsdoc';
import { SwaggerDefinition } from 'swagger-jsdoc';

const swaggerDefinition: SwaggerDefinition = {
  openapi: '3.0.0',
  info: {
    title: 'QT Fashion API',
    version: '1.0.0',
    description: 'AI-powered fashion marketplace with body measurements and virtual try-on',
    contact: {
      name: 'QT Fashion Team',
      email: 'support@qtfashion.com',
    },
    license: {
      name: 'ISC',
      url: 'https://opensource.org/licenses/ISC',
    },
  },
  servers: [
    {
      url: process.env.API_URL || 'http://localhost:5000',
      description: 'Development server',
    },
    {
      url: 'https://api.qtfashion.com',
      description: 'Production server',
    },
  ],
  components: {
    securitySchemes: {
      bearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        description: 'Enter your JWT token',
      },
    },
    schemas: {
      User: {
        type: 'object',
        properties: {
          id: {
            type: 'string',
            description: 'User ID',
          },
          email: {
            type: 'string',
            format: 'email',
            description: 'User email address',
          },
          name: {
            type: 'string',
            description: 'User full name',
          },
          phone: {
            type: 'string',
            description: 'User phone number',
          },
          role: {
            type: 'string',
            enum: ['CUSTOMER', 'DESIGNER', 'ADMIN'],
            description: 'User role',
          },
          createdAt: {
            type: 'string',
            format: 'date-time',
          },
          updatedAt: {
            type: 'string',
            format: 'date-time',
          },
        },
      },
      Design: {
        type: 'object',
        properties: {
          id: {
            type: 'string',
            description: 'Design ID',
          },
          name: {
            type: 'string',
            description: 'Design name',
          },
          description: {
            type: 'string',
            description: 'Design description',
          },
          category: {
            type: 'string',
            description: 'Design category',
          },
          price: {
            type: 'number',
            description: 'Design price',
          },
          images: {
            type: 'array',
            items: {
              type: 'string',
            },
            description: 'Array of image URLs',
          },
          designerId: {
            type: 'string',
            description: 'Designer user ID',
          },
          isActive: {
            type: 'boolean',
            description: 'Design active status',
          },
          createdAt: {
            type: 'string',
            format: 'date-time',
          },
          updatedAt: {
            type: 'string',
            format: 'date-time',
          },
        },
      },
      Measurement: {
        type: 'object',
        properties: {
          id: {
            type: 'string',
            description: 'Measurement ID',
          },
          userId: {
            type: 'string',
            description: 'User ID',
          },
          height: {
            type: 'number',
            description: 'Height in cm',
          },
          weight: {
            type: 'number',
            description: 'Weight in kg',
          },
          chest: {
            type: 'number',
            description: 'Chest measurement in cm',
          },
          waist: {
            type: 'number',
            description: 'Waist measurement in cm',
          },
          hips: {
            type: 'number',
            description: 'Hips measurement in cm',
          },
          inseam: {
            type: 'number',
            description: 'Inseam measurement in cm',
          },
          shoulder: {
            type: 'number',
            description: 'Shoulder measurement in cm',
          },
          bodyImageUrl: {
            type: 'string',
            description: 'URL of body image used for measurements',
          },
          isActive: {
            type: 'boolean',
            description: 'Active status',
          },
          createdAt: {
            type: 'string',
            format: 'date-time',
          },
          updatedAt: {
            type: 'string',
            format: 'date-time',
          },
        },
      },
      Error: {
        type: 'object',
        properties: {
          message: {
            type: 'string',
            description: 'Error message',
          },
          error: {
            type: 'string',
            description: 'Error details',
          },
        },
      },
    },
  },
  security: [
    {
      bearerAuth: [],
    },
  ],
};

const options = {
  swaggerDefinition,
  // Path to the API routes
  apis: ['./src/routes/*.ts', './src/routes/*.js', './dist/routes/*.js'],
};

const swaggerSpec = swaggerJsdoc(options);

export default swaggerSpec;
