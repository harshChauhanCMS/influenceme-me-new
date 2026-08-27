import { Response } from "express";

export interface Pagination {
    total?: number;
    page?: number;
    limit?: number;
    [key: string]: any; // allow custom keys
}

export interface ApiResponse<T = any> {
    status: boolean;
    code: number;
    message: string;
    data: T | null;
    pagination?: Pagination;
}

export const successResponse = <T>(
    res: Response,
    message: string,
    data: T | null = null,
    statusCode: number = 200,
    pagination: Pagination | null = null
): Response<ApiResponse<T>> => {
    const response: ApiResponse<T> = {
        status: true,
        code: statusCode,
        message,
        data,
    };

    if (pagination) {
        response.pagination = pagination;
    }

    return res.status(statusCode).json(response);
};

export const errorResponse = <T> (
    res: Response,
    message: string,
    statusCode: number = 200,
    data: T | null = null
): Response<ApiResponse<T>> => {
    const response: ApiResponse<T> = {
        status: false,
        code: statusCode,
        message,
        data,
    };

    return res.status(statusCode).json(response);
};

export const paginatedResponse = <T>(
    res: Response,
    message: string,
    data: T,
    pagination: Pagination,
    statusCode: number = 200
): Response<ApiResponse<T>> => {
    return successResponse(res, message, data, statusCode, pagination);
};
