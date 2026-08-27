import { apiClient } from "@/config/api";
import {API_ENDPOINTS, ApiResponse} from "@/utils/network_utils";

// Define the expected structure of the form data
export interface ContactFormData {
  fullName: string;
  email: string;
  mobile: string;
  message: string;
}

// Submit Contact Form
export const submitContactForm = async (
    formData: ContactFormData
): Promise<ApiResponse> => {
  console.log(formData);
  try {
    const response = await apiClient.post<ApiResponse>(API_ENDPOINTS.CREATE_INQUIRY, formData);
    return response.data;
  } catch (error: unknown) {
    console.error("Error submitting contact form:", error);
    throw error;
  }
};
