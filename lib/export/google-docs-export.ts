// =============================================================================
// lib/export/google-docs-export.ts
// Google Docs export using OAuth tokens
// =============================================================================
//
// Requires: googleapis package
// npm install googleapis
//
// User must have connected Google account via OAuth
// =============================================================================

import { google, docs_v1 } from 'googleapis';
import { OAuth2Client } from 'google-auth-library';

// =============================================================================
// TYPES
// =============================================================================

export interface TranscriptContent {
  fullText: string;
  words?: Array<{
    word: string;
    start?: number;
    end?: number;
    confidence?: number;
  }>;
}

export interface GoogleDocsExportOptions {
  caseName?: string;
  caseNumber?: string;
  deponentName?: string;
  depositionDate?: Date;
  includeLineNumbers?: boolean;
  lineNumberInterval?: number;
  googleDocTitle?: string;
  googleFolderId?: string;
}

export interface GoogleDocsExportResult {
  success: boolean;
  documentId?: string;
  documentUrl?: string;
  title?: string;
  error?: string;
}

export interface GoogleOAuthTokens {
  access_token: string;
  refresh_token?: string;
  expiry_date?: number;
}

// =============================================================================
// MAIN EXPORT FUNCTION
// =============================================================================

export async function exportToGoogleDocs(
  content: TranscriptContent,
  options: GoogleDocsExportOptions,
  tokens: GoogleOAuthTokens
): Promise<GoogleDocsExportResult> {
  try {
    // Create OAuth client
    const oauth2Client = new OAuth2Client(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET
    );

    oauth2Client.setCredentials({
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token,
      expiry_date: tokens.expiry_date,
    });

    // Initialize Google Docs API
    const docs = google.docs({ version: 'v1', auth: oauth2Client });
    const drive = google.drive({ version: 'v3', auth: oauth2Client });

    // Generate document title
    const title = options.googleDocTitle || generateTitle(options);

    // Create blank document
    const createResponse = await docs.documents.create({
      requestBody: {
        title,
      },
    });

    const documentId = createResponse.data.documentId;
    if (!documentId) {
      throw new Error('Failed to create document');
    }

    // Build document content
    const requests = buildDocumentRequests(content, options);

    // Insert content
    if (requests.length > 0) {
      await docs.documents.batchUpdate({
        documentId,
        requestBody: {
          requests,
        },
      });
    }

    // Move to specific folder if provided
    if (options.googleFolderId) {
      await drive.files.update({
        fileId: documentId,
        addParents: options.googleFolderId,
        fields: 'id, parents',
      });
    }

    return {
      success: true,
      documentId,
      documentUrl: `https://docs.google.com/document/d/${documentId}/edit`,
      title,
    };
  } catch (error: any) {
    console.error('Google Docs export error:', error);
    return {
      success: false,
      error: error.message || 'Failed to export to Google Docs',
    };
  }
}

// =============================================================================
// BUILD DOCUMENT REQUESTS
// =============================================================================

function buildDocumentRequests(
  content: TranscriptContent,
  options: GoogleDocsExportOptions
): docs_v1.Schema$Request[] {
  const requests: docs_v1.Schema$Request[] = [];
  let index = 1; // Google Docs uses 1-based indexing

  // Title page content
  if (options.caseName) {
    // Title
    requests.push({
      insertText: {
        location: { index },
        text: 'DEPOSITION TRANSCRIPT\n\n',
      },
    });
    index += 'DEPOSITION TRANSCRIPT\n\n'.length;

    // Case name
    requests.push({
      insertText: {
        location: { index },
        text: `${options.caseName}\n`,
      },
    });
    index += options.caseName.length + 1;

    // Case number
    if (options.caseNumber) {
      const caseNumText = `Case No: ${options.caseNumber}\n`;
      requests.push({
        insertText: {
          location: { index },
          text: caseNumText,
        },
      });
      index += caseNumText.length;
    }

    // Deponent
    if (options.deponentName) {
      const deponentText = `Deposition of: ${options.deponentName}\n`;
      requests.push({
        insertText: {
          location: { index },
          text: deponentText,
        },
      });
      index += deponentText.length;
    }

    // Date
    if (options.depositionDate) {
      const dateText = `Date: ${options.depositionDate.toLocaleDateString()}\n`;
      requests.push({
        insertText: {
          location: { index },
          text: dateText,
        },
      });
      index += dateText.length;
    }

    // Page break
    requests.push({
      insertPageBreak: {
        location: { index },
      },
    });
    index += 1;
  }

  // Transcript content
  const lines = content.fullText.split('\n');
  let lineNumber = 1;

  for (const line of lines) {
    let lineText = '';

    // Add line number if enabled
    if (options.includeLineNumbers) {
      const showNumber = lineNumber % (options.lineNumberInterval || 5) === 0;
      lineText = showNumber 
        ? `${lineNumber.toString().padStart(3, ' ')}  ${line}\n`
        : `     ${line}\n`;
    } else {
      lineText = `${line}\n`;
    }

    requests.push({
      insertText: {
        location: { index },
        text: lineText,
      },
    });
    index += lineText.length;
    lineNumber++;
  }

  // Apply formatting (after all text is inserted)
  // This would include font changes, styling, etc.
  // Formatting requests need to come after all insertText requests

  return requests;
}

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

function generateTitle(options: GoogleDocsExportOptions): string {
  const parts: string[] = [];

  if (options.caseName) parts.push(options.caseName);
  if (options.deponentName) parts.push(options.deponentName);
  if (options.depositionDate) {
    parts.push(options.depositionDate.toISOString().split('T')[0]);
  }

  if (parts.length === 0) {
    return 'Deposition Transcript';
  }

  return parts.join(' - ') + ' - Transcript';
}

// =============================================================================
// CHECK GOOGLE OAUTH STATUS
// =============================================================================

export async function checkGoogleConnection(tokens: GoogleOAuthTokens): Promise<{
  connected: boolean;
  email?: string;
  error?: string;
}> {
  try {
    const oauth2Client = new OAuth2Client(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET
    );

    oauth2Client.setCredentials({
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token,
    });

    const oauth2 = google.oauth2({ version: 'v2', auth: oauth2Client });
    const userInfo = await oauth2.userinfo.get();

    return {
      connected: true,
      email: userInfo.data.email || undefined,
    };
  } catch (error: any) {
    return {
      connected: false,
      error: error.message,
    };
  }
}

// =============================================================================
// LIST USER'S GOOGLE DRIVE FOLDERS
// =============================================================================

export async function listGoogleDriveFolders(
  tokens: GoogleOAuthTokens
): Promise<Array<{ id: string; name: string }>> {
  try {
    const oauth2Client = new OAuth2Client(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET
    );

    oauth2Client.setCredentials({
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token,
    });

    const drive = google.drive({ version: 'v3', auth: oauth2Client });

    const response = await drive.files.list({
      q: "mimeType='application/vnd.google-apps.folder' and trashed=false",
      fields: 'files(id, name)',
      orderBy: 'name',
      pageSize: 100,
    });

    return (response.data.files || []).map((f: { id?: string | null; name?: string | null }) => ({
      id: f.id || '',
      name: f.name || '',
    }));
  } catch (error) {
    console.error('Failed to list folders:', error);
    return [];
  }
}
