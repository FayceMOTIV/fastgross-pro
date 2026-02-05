import {
  ref,
  uploadBytes,
  uploadString,
  getDownloadURL,
  deleteObject,
  listAll,
  UploadMetadata
} from 'firebase/storage';
import { storage } from './config';

// Dossiers de stockage
export const STORAGE_PATHS = {
  MENUS: 'menus',
  PRODUCTS: 'products',
  QUOTES: 'quotes',
  DOCUMENTS: 'documents',
  AVATARS: 'avatars',
} as const;

// Upload un fichier
export const uploadFile = async (
  path: string,
  file: File,
  metadata?: UploadMetadata
): Promise<string> => {
  const storageRef = ref(storage, path);
  await uploadBytes(storageRef, file, metadata);
  return getDownloadURL(storageRef);
};

// Upload une image en base64
export const uploadBase64Image = async (
  path: string,
  base64Data: string,
  contentType: string = 'image/jpeg'
): Promise<string> => {
  const storageRef = ref(storage, path);
  await uploadString(storageRef, base64Data, 'base64', { contentType });
  return getDownloadURL(storageRef);
};

// Obtenir l'URL de téléchargement
export const getFileUrl = async (path: string): Promise<string> => {
  const storageRef = ref(storage, path);
  return getDownloadURL(storageRef);
};

// Supprimer un fichier
export const deleteFile = async (path: string): Promise<void> => {
  const storageRef = ref(storage, path);
  await deleteObject(storageRef);
};

// Lister les fichiers d'un dossier
export const listFiles = async (path: string): Promise<string[]> => {
  const storageRef = ref(storage, path);
  const result = await listAll(storageRef);
  return Promise.all(result.items.map(item => getDownloadURL(item)));
};

// Générer un nom de fichier unique
export const generateFileName = (originalName: string): string => {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 8);
  const extension = originalName.split('.').pop();
  return `${timestamp}-${random}.${extension}`;
};

// Upload un menu scanné
export const uploadMenuScan = async (file: File): Promise<string> => {
  const fileName = generateFileName(file.name);
  const path = `${STORAGE_PATHS.MENUS}/${fileName}`;
  return uploadFile(path, file, { contentType: file.type });
};

// Upload un devis PDF
export const uploadQuotePdf = async (pdfBlob: Blob, quoteId: string): Promise<string> => {
  const path = `${STORAGE_PATHS.QUOTES}/${quoteId}.pdf`;
  const file = new File([pdfBlob], `${quoteId}.pdf`, { type: 'application/pdf' });
  return uploadFile(path, file);
};
