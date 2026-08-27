// /**
//  * Utility functions for parsing form data (TypeScript version)
//  */
//
// interface UploadedFile {
//     filename: string;
//     originalname: string;
//     mimetype: string;
//     size: number;
// }
//
// // interface UploadedFiles {
// //     profileImage?: UploadedFile[];
// //     media?: UploadedFile[];
// //     documents?: UploadedFile[];
// //     [key: string]: UploadedFile[] | undefined;
// // }
//
// type UploadedFiles =
//     | { [fieldname: string]: UploadedFile[] }
//     | UploadedFile[];
//
// type Primitive = string | number | boolean | null | undefined;
// type JSONValue = Primitive | JSONObject | JSONArray;
// interface JSONObject {
//     [key: string]: JSONValue;
// }
// interface JSONArray extends Array<JSONValue> {}
//
// type FieldValue = string | number | boolean | object | null | undefined | string[];
//
// interface FormBody {
//     [key: string]: FieldValue;
// }
//
// // ---------------- Utility Parsers ---------------- //
//
// export const parseJSONField = (value: any): any => {
//     if (!value) return undefined;
//     try {
//         return JSON.parse(value);
//     } catch {
//         return value; // Return as string if not valid JSON
//     }
// };
//
// export const parseArrayField = (value: any): any[] => {
//     if (!value) return [];
//     if (Array.isArray(value)) return value;
//     if (typeof value === "string") {
//         try {
//             const parsed = JSON.parse(value);
//             return Array.isArray(parsed) ? parsed : [value];
//         } catch {
//             return value
//                 .split(",")
//                 .map((item) => item.trim())
//                 .filter((item) => item);
//         }
//     }
//     return [value];
// };
//
// export const parseBooleanField = (value: any): boolean | undefined => {
//     if (value === undefined || value === null) return undefined;
//     if (typeof value === "boolean") return value;
//     if (typeof value === "string") {
//         return value.toLowerCase() === "true" || value === "1";
//     }
//     return Boolean(value);
// };
//
// export const parseNumberField = (value: any): number | undefined => {
//     if (value === undefined || value === null || value === "") return undefined;
//     const num = Number(value);
//     return isNaN(num) ? undefined : num;
// };
//
// export const parseDateField = (value: any): Date | undefined => {
//     if (!value) return undefined;
//     const date = new Date(value);
//     return isNaN(date.getTime()) ? undefined : date;
// };
//
// // ---------------- Main Parser ---------------- //
//
// export const parseFormData = (body: FormBody, files: UploadedFiles = {}): FormBody => {
//     const parsed: FormBody = { ...body };
//
//     // Parse common array fields
//     if (parsed.spokenLanguages) parsed.spokenLanguages = parseArrayField(parsed.spokenLanguages);
//     if (parsed.genre) parsed.genre = parseArrayField(parsed.genre);
//     if (parsed.media) parsed.media = parseArrayField(parsed.media);
//
//     // Parse number fields
//     if (parsed.children !== undefined) parsed.children = parseNumberField(parsed.children);
//     if (parsed.pets !== undefined) parsed.pets = parseNumberField(parsed.pets);
//     if (parsed.influencerSince !== undefined)
//         parsed.influencerSince = parseNumberField(parsed.influencerSince);
//
//     // Parse social media objects (instagram, facebook, linkedin, youtube)
//     const socialPlatforms = ["instagram", "facebook", "linkedin", "youtube"] as const;
//
//     socialPlatforms.forEach((platform) => {
//         const data = parsed[platform];
//         if (typeof data === "string") parsed[platform] = parseJSONField(data);
//         const socialData = parsed[platform] as any;
//
//         if (socialData && typeof socialData === "object") {
//             if (socialData.followers) {
//                 if (socialData.followers.actual !== undefined)
//                     socialData.followers.actual = parseNumberField(socialData.followers.actual);
//                 if (socialData.followers.bought !== undefined)
//                     socialData.followers.bought = parseNumberField(socialData.followers.bought);
//             }
//
//             if (platform === "instagram" && socialData.engagement) {
//                 if (socialData.engagement.averagePerPost !== undefined)
//                     socialData.engagement.averagePerPost = parseNumberField(
//                         socialData.engagement.averagePerPost
//                     );
//                 if (socialData.engagement.topEngagementPerPost !== undefined)
//                     socialData.engagement.topEngagementPerPost = parseNumberField(
//                         socialData.engagement.topEngagementPerPost
//                     );
//                 if (socialData.engagement.maximumLikesPerPost !== undefined)
//                     socialData.engagement.maximumLikesPerPost = parseNumberField(
//                         socialData.engagement.maximumLikesPerPost
//                     );
//             }
//
//             if (platform === "youtube") {
//                 if (socialData.followers !== undefined)
//                     socialData.followers = parseNumberField(socialData.followers);
//                 if (socialData.videosPosted !== undefined)
//                     socialData.videosPosted = parseNumberField(socialData.videosPosted);
//                 if (socialData.maximumLikesPerVideo !== undefined)
//                     socialData.maximumLikesPerVideo = parseNumberField(socialData.maximumLikesPerVideo);
//             }
//         }
//     });
//
//     // Parse date fields
//     if (parsed.dateOfBirth) parsed.dateOfBirth = parseDateField(parsed.dateOfBirth);
//
//     // Parse boolean fields
//     if (parsed.isActive !== undefined) parsed.isActive = parseBooleanField(parsed.isActive);
//
//     // Parse nested addresses
//     if (parsed.addresses) {
//         if (typeof parsed.addresses === "string") parsed.addresses = parseJSONField(parsed.addresses);
//     } else {
//         const addressFields = ["streetAddress", "state", "country", "pinCode", "latitude", "longitude"];
//         const addresses: Record<string, any> = {};
//         let hasAddressField = false;
//
//         addressFields.forEach((field) => {
//             const key1 = `addresses.${field}`;
//             const key2 = `address_${field}`;
//             if (parsed[key1] || parsed[key2]) {
//                 addresses[field] = parsed[key1] || parsed[key2];
//                 hasAddressField = true;
//                 delete parsed[key1];
//                 delete parsed[key2];
//             }
//         });
//
//         if (hasAddressField) parsed.addresses = addresses;
//     }
//
//     // Handle uploaded files
//     if (files.profileImage?.[0]) {
//         parsed.profileImage = files.profileImage[0].filename;
//     }
//
//     if (files.media?.length) {
//         parsed.uploadedMedia = files.media.map((file) => ({
//             filename: file.filename,
//             originalName: file.originalname,
//             mimetype: file.mimetype,
//             size: file.size,
//         }));
//     }
//
//     if (files.documents?.length) {
//         parsed.uploadedDocuments = files.documents.map((file) => ({
//             filename: file.filename,
//             originalName: file.originalname,
//             mimetype: file.mimetype,
//             size: file.size,
//         }));
//     }
//
//     return parsed;
// };