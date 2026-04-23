/**
 * Standard API Response Handler
 * Follows company best practices for consistent API responses
 */

export const ApiResponse = {
    // Success response
    success: (data, message = "Success", statusCode = 200) => ({
        status: "success",
        statusCode,
        message,
        data,
        timestamp: new Date().toISOString(),
    }),

    // Error response
    error: (statusCode, errorCode, message, details = null) => ({
        status: "error",
        statusCode,
        error: {
            code: errorCode,
            message,
            ...(details && { details }),
        },
        timestamp: new Date().toISOString(),
    }),

    // Validation error (400)
    validationError: (message, details = null) => ({
        status: "error",
        statusCode: 400,
        error: {
            code: "VALIDATION_ERROR",
            message: message || "Invalid input provided",
            ...(details && { details }),
        },
        timestamp: new Date().toISOString(),
    }),

    // Unauthorized (401)
    unauthorized: (message = "Unauthorized access") => ({
        status: "error",
        statusCode: 401,
        error: {
            code: "UNAUTHORIZED",
            message,
        },
        timestamp: new Date().toISOString(),
    }),

    // Server error (500)
    serverError: (message = "Internal server error") => ({
        status: "error",
        statusCode: 500,
        error: {
            code: "INTERNAL_SERVER_ERROR",
            message,
        },
        timestamp: new Date().toISOString(),
    }),

    // Content policy violation (403)
    contentPolicyViolation: (message = "Request violates content policy") => ({
        status: "error",
        statusCode: 403,
        error: {
            code: "CONTENT_POLICY_VIOLATION",
            message,
        },
        timestamp: new Date().toISOString(),
    }),
};

export default ApiResponse;
