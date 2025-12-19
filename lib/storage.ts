// lib/storage.ts
// File storage operations

import fs from 'fs/promises';
import path from 'path';

// ============================================
// DOWNLOAD FILE
// ============================================

export async function downloadFile(fileUrl: string): Promise<Buffer> {
  // Check if it's a local file path
  if (fileUrl.startsWith('/') || fileUrl.startsWith('./') || fileUrl.startsWith('file://')) {
    const localPath = fileUrl.replace('file://', '');
    return await fs.readFile(localPath);
  }

  // Handle HTTP/HTTPS URLs
  if (fileUrl.startsWith('http://') || fileUrl.startsWith('https://')) {
    const response = await fetch(fileUrl);
    
    if (!response.ok) {
      throw new Error(`Failed to download file: ${response.status} ${response.statusText}`);
    }
    
    const arrayBuffer = await response.arrayBuffer();
    return Buffer.from(arrayBuffer);
  }

  // Handle Supabase storage URLs or relative paths
  // Adjust this based on your storage configuration
  const uploadsDir = process.env.UPLOADS_DIR || './uploads';
  const localPath = path.join(uploadsDir, fileUrl);
  
  try {
    return await fs.readFile(localPath);
  } catch {
    throw new Error(`File not found: ${localPath}`);
  }
}

// ============================================
// UPLOAD FILE
// ============================================

export async function uploadFile(
  buffer: Buffer,
  filename: string,
  directory: string = 'uploads'
): Promise<string> {
  const uploadsDir = process.env.UPLOADS_DIR || './uploads';
  const targetDir = path.join(uploadsDir, directory);
  
  // Ensure directory exists
  await fs.mkdir(targetDir, { recursive: true });
  
  const filePath = path.join(targetDir, filename);
  await fs.writeFile(filePath, buffer);
  
  return path.join(directory, filename);
}

// ============================================
// DELETE FILE
// ============================================

export async function deleteFile(filePath: string): Promise<void> {
  const uploadsDir = process.env.UPLOADS_DIR || './uploads';
  const fullPath = path.join(uploadsDir, filePath);
  
  try {
    await fs.unlink(fullPath);
  } catch (error) {
    console.warn(`Failed to delete file: ${fullPath}`, error);
  }
}

// ============================================
// CHECK FILE EXISTS
// ============================================

export async function fileExists(filePath: string): Promise<boolean> {
  const uploadsDir = process.env.UPLOADS_DIR || './uploads';
  const fullPath = filePath.startsWith('/') ? filePath : path.join(uploadsDir, filePath);
  
  try {
    await fs.access(fullPath);
    return true;
  } catch {
    return false;
  }
}
