import axios from 'axios';
import FormData from 'form-data';
import { Readable } from 'stream';
import fs from 'fs';

interface FileUploadResponse {
    success: boolean;
    message: string;
    data: {
        fileId: string;
        fileName: string;
        originalFileName: string;
        fileSize: number;
        fileType: string;
        mimeType: string;
        folder: string;
        projectId: string;
        url: string;
        directUrl: string;
        optimized: boolean;
        uploadedAt: string;
    };
}

interface FileListResponse {
    success: boolean;
    message: string;
    data: {
        files: Array<{
            fileName: string;
            fileSize: number;
            folder: string;
            mimeType: string;
            projectId: string;
            lastModified: string;
            url: string;
        }>;
        totalFiles: number;
        totalSize: number;
    };
}

class FileStorageService {
    private baseUrl: string;
    private apiKey: string;
    private projectId: string;

    constructor() {
        this.baseUrl = process.env.FILE_STORAGE_BASE_URL || 'https://files.influence-me.in';
        this.apiKey = process.env.FILE_STORAGE_API_KEY || 'influence_api_key_2025_secure';
        this.projectId = process.env.FILE_STORAGE_PROJECT_ID || 'influenceme';
    }

    /**
     * Upload a single file to the file storage microservice
     * @param file - Express.Multer.File object or Buffer with metadata
     * @param folder - Folder name to organize files (e.g., 'profile_images', 'campaign_images', 'documents')
     * @returns Promise with the file URL
     */
    async uploadFile(
        file: Express.Multer.File | { buffer: Buffer; originalname: string; mimetype: string },
        folder: string
    ): Promise<string> {
        try {
            const formData = new FormData();

            // Handle both disk storage (file.path) and memory storage (file.buffer)
            let fileStream: NodeJS.ReadableStream;
            if ('path' in file && file.path && fs.existsSync(file.path)) {
                // File is on disk (diskStorage)
                fileStream = fs.createReadStream(file.path);
            } else if ('buffer' in file && file.buffer) {
                // File is in memory (memoryStorage)
                fileStream = Readable.from(file.buffer);
            } else {
                throw new Error('File buffer or path not found');
            }
            
            formData.append('file', fileStream, {
                filename: file.originalname,
                contentType: file.mimetype,
            });
            formData.append('folder', folder);

            const response = await axios.post<FileUploadResponse>(
                `${this.baseUrl}/api/upload`,
                formData,
                {
                    headers: {
                        ...formData.getHeaders(),
                        'X-API-Key': this.apiKey,
                        'X-Project-Id': this.projectId,
                    },
                    maxBodyLength: Infinity,
                    maxContentLength: Infinity,
                }
            );

            if (response.data.success) {
                // Return the URL (not directUrl as per requirements)
                return response.data.data.url;
            } else {
                throw new Error(response.data.message || 'File upload failed');
            }
        } catch (error: any) {
            console.error('File upload error:', error.response?.data || error.message);
            throw new Error(`File upload failed: ${error.response?.data?.message || error.message}`);
        }
    }

    /**
     * Upload multiple files to the file storage microservice
     * @param files - Array of Express.Multer.File objects
     * @param folder - Folder name to organize files
     * @returns Promise with array of file URLs
     */
    async uploadMultipleFiles(
        files: Express.Multer.File[],
        folder: string
    ): Promise<string[]> {
        try {
            if (!files || !Array.isArray(files) || files.length === 0) {
                return [];
            }
            const uploadPromises = files.map(file => this.uploadFile(file, folder));
            return await Promise.all(uploadPromises);
        } catch (error: any) {
            console.error('Multiple file upload error:', error.message);
            console.error('Files received:', files);
            throw new Error(`Multiple file upload failed: ${error.message}`);
        }
    }

    /**
     * List files in a specific folder
     * @param folder - Folder name
     * @returns Promise with list of files
     */
    async listFiles(folder?: string): Promise<FileListResponse['data']> {
        try {
            const url = folder
                ? `${this.baseUrl}/api/files?folder=${folder}`
                : `${this.baseUrl}/api/files`;

            const response = await axios.get<FileListResponse>(url, {
                headers: {
                    'X-API-Key': this.apiKey,
                    'X-Project-Id': this.projectId,
                },
            });

            if (response.data.success) {
                return response.data.data;
            } else {
                throw new Error(response.data.message || 'Failed to list files');
            }
        } catch (error: any) {
            console.error('List files error:', error.response?.data || error.message);
            throw new Error(`Failed to list files: ${error.response?.data?.message || error.message}`);
        }
    }

    /**
     * Delete a file from the file storage microservice
     * @param fileId - The file ID (UUID)
     * @param folder - Folder name
     * @returns Promise<boolean>
     */
    async deleteFile(fileId: string, folder: string): Promise<boolean> {
        try {
            const response = await axios.delete(
                `${this.baseUrl}/api/file/delete`,
                {
                    headers: {
                        'X-API-Key': this.apiKey,
                        'X-Project-Id': this.projectId,
                        'Content-Type': 'application/json',
                    },
                    data: {
                        fileId,
                        folder,
                    },
                }
            );

            return response.data.success;
        } catch (error: any) {
            console.error('Delete file error:', error.response?.data || error.message);
            throw new Error(`Failed to delete file: ${error.response?.data?.message || error.message}`);
        }
    }

    /**
     * Get the file storage base URL
     * @returns Base URL of the file storage service
     */
    getBaseUrl(): string {
        return this.baseUrl;
    }

    /**
     * Extract file ID from URL
     * @param url - Full URL or path
     * @returns File ID (UUID)
     */
    extractFileIdFromUrl(url: string): string | null {
        const match = url.match(/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})/i);
        return match ? match[1] : null;
    }

    /**
     * Extract folder from URL
     * @param url - Full URL or path
     * @returns Folder name
     */
    extractFolderFromUrl(url: string): string | null {
        const match = url.match(/\/api\/file\/[^/]+\/([^/]+)\//);
        return match ? match[1] : null;
    }
}

// Export a singleton instance
export const fileStorageService = new FileStorageService();
export default fileStorageService;

