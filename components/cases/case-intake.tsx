// ═══════════════════════════════════════════════════════════════
// COMPREHENSIVE CASE INTAKE COMPONENT (V2)
// components/cases/case-intake.tsx
// 
// Full document upload, AI extraction, review, and job creation
// Confidence-aware field display
// ═══════════════════════════════════════════════════════════════

'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useDropzone } from 'react-dropzone';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { 
  Upload, FileText, Check, AlertCircle, Loader2, Trash2,
  Edit, Save, Music, AlertTriangle, User, Building, MapPin,
  Calendar, Clock, Gavel, Users, FileQuestion, Tag
} from 'lucide-react';

// ═══════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════

interface UploadedFile {
  file: File;
  type: 'document' | 'audio';
  status: 'pending' | 'processing' | 'done' | 'error';
  documentType?: string;
}

interface ConfidenceFieldProps {
  label: string;
  value: string | null | undefined;
  confidence?: number;
  isEditing: boolean;
  onChange: (value: string) => void;
  icon?: React.ReactNode;
}

// ═══════════════════════════════════════════════════════════════
// CONFIDENCE-AWARE FIELD COMPONENT
// ═══════════════════════════════════════════════════════════════

function ConfidenceField({ 
  label, 
  value, 
  confidence, 
  isEditing, 
  onChange,
  icon 
}: ConfidenceFieldProps) {
  const needsReview = confidence !== undefined && confidence < 0.85;
  
  return (
    <div className="space-y-1">
      <div className="flex items-center gap-2">
        {icon}
        <Label className="text-sm font-medium">{label}</Label>
        {needsReview && (
          <Badge variant="outline" className="text-xs bg-yellow-50 text-yellow-700 border-yellow-300">
            <AlertTriangle className="h-3 w-3 mr-1" />
            Review
          </Badge>
        )}
        {confidence !== undefined && (
          <span className={`text-xs ${
            confidence >= 0.9 ? 'text-green-600' :
            confidence >= 0.7 ? 'text-yellow-600' :
            'text-red-600'
          }`}>
            {Math.round(confidence * 100)}%
          </span>
        )}
      </div>
      {isEditing ? (
        <Input
          value={value || ''}
          onChange={(e) => onChange(e.target.value)}
          className={needsReview ? 'border-yellow-400 bg-yellow-50' : ''}
        />
      ) : (
        <p className={`font-medium ${!value ? 'text-gray-400 italic' : ''} ${
          needsReview ? 'text-yellow-700' : ''
        }`}>
          {value || 'Not found'}
        </p>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════

export function CaseIntake() {
  const router = useRouter();
  
  // State
  const [files, setFiles] = useState<UploadedFile[]>([]);
  const [isExtracting, setIsExtracting] = useState(false);
  const [extractedData, setExtractedData] = useState<any>(null);
  const [confidenceByField, setConfidenceByField] = useState<any>({});
  const [deepgramKeywords, setDeepgramKeywords] = useState<string[]>([]);
  const [isEditing, setIsEditing] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [reviewReasons, setReviewReasons] = useState<string[]>([]);

  // File drop handler
  const onDrop = useCallback((acceptedFiles: File[]) => {
    const newFiles = acceptedFiles.map(file => ({
      file,
      type: file.type.startsWith('audio/') || file.type.startsWith('video/') 
        ? 'audio' as const 
        : 'document' as const,
      status: 'pending' as const,
    }));
    setFiles(prev => [...prev, ...newFiles]);
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/pdf': ['.pdf'],
      'audio/*': ['.mp3', '.wav', '.m4a', '.ogg'],
      'video/*': ['.mp4', '.webm'],
      'text/*': ['.txt'],
    },
  });

  // Remove file
  const removeFile = (index: number) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
  };

  // Extract data from documents
  const handleExtract = async () => {
    const documentFiles = files.filter(f => f.type === 'document');
    if (!documentFiles.length) {
      setError('Please upload at least one PDF document');
      return;
    }

    setIsExtracting(true);
    setError(null);
    setWarnings([]);

    try {
      const formData = new FormData();
      documentFiles.forEach(f => formData.append('files', f.file));
      formData.append('autoCreateJob', 'false');
      formData.append('autoCreateCase', 'false');

      const response = await fetch('/api/cases/intake', {
        method: 'POST',
        body: formData,
      });

      const result = await response.json();

      if (result.success && result.extractedData) {
        setExtractedData(result.extractedData);
        setConfidenceByField(result.confidenceByField || {});
        setDeepgramKeywords(result.deepgramKeywords || []);
        setReviewReasons(result.reviewReasons || []);
        if (result.warnings) setWarnings(result.warnings);
        
        // Update file statuses
        setFiles(prev => prev.map((f, i) => ({
          ...f,
          status: f.type === 'document' ? 'done' : f.status,
          documentType: result.documentsProcessed?.[i]?.type,
        })));
        
        // Auto-enable editing if needs review
        if (result.needsReview) {
          setIsEditing(true);
        }
      } else {
        setError(result.error || 'Failed to extract case information');
      }
    } catch (err) {
      setError('Failed to process documents. Please try again.');
      console.error(err);
    } finally {
      setIsExtracting(false);
    }
  };

  // Update field in extracted data
  const updateField = (path: string, value: any) => {
    if (!extractedData) return;
    
    const newData = JSON.parse(JSON.stringify(extractedData));
    const parts = path.split('.');
    let obj = newData;
    
    for (let i = 0; i < parts.length - 1; i++) {
      if (!obj[parts[i]]) obj[parts[i]] = {};
      obj = obj[parts[i]];
    }
    obj[parts[parts.length - 1]] = value;
    
    setExtractedData(newData);
  };

  // Create job
  const handleCreateJob = async () => {
    if (!extractedData) return;

    setIsCreating(true);
    setError(null);

    try {
      // Re-submit with create flags
      const formData = new FormData();
      files.filter(f => f.type === 'document').forEach(f => formData.append('files', f.file));
      formData.append('autoCreateJob', 'true');
      formData.append('autoCreateCase', 'true');

      const response = await fetch('/api/cases/intake', {
        method: 'POST',
        body: formData,
      });

      const result = await response.json();

      if (result.savedIds?.jobId) {
        // Upload audio files if present
        const audioFile = files.find(f => f.type === 'audio');
        if (audioFile) {
          const audioFormData = new FormData();
          audioFormData.append('file', audioFile.file);
          audioFormData.append('fileType', 'AUDIO');

          await fetch(`/api/jobs/${result.savedIds.jobId}/files`, {
            method: 'POST',
            body: audioFormData,
          });
        }

        router.push(`/jobs/${result.savedIds.jobId}`);
      } else {
        setError(result.error || 'Failed to create job');
      }
    } catch (err) {
      setError('Failed to create job. Please try again.');
      console.error(err);
    } finally {
      setIsCreating(false);
    }
  };

  // ═══════════════════════════════════════════════════════════════
  // RENDER
  // ═══════════════════════════════════════════════════════════════

  return (
    <div className="max-w-5xl mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">New Case Intake</h1>
        <p className="text-gray-600">Upload documents to automatically extract case information</p>
      </div>

      {/* Error Display */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-2 text-red-700">
          <AlertCircle className="h-5 w-5 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-medium">Error</p>
            <p className="text-sm">{error}</p>
          </div>
        </div>
      )}

      {/* Warnings */}
      {warnings.length > 0 && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <p className="font-medium text-yellow-800 mb-2">Warnings</p>
          <ul className="text-sm text-yellow-700 space-y-1">
            {warnings.map((w, i) => <li key={i}>• {w}</li>)}
          </ul>
        </div>
      )}

      {/* Step 1: Upload Files */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <span className="bg-blue-100 text-blue-700 rounded-full w-6 h-6 flex items-center justify-center text-sm font-bold">1</span>
            Upload Documents & Audio
          </CardTitle>
          <CardDescription>
            Notice of Deposition, CSR Paperwork, Depo Notes, and audio recording
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Dropzone */}
          <div
            {...getRootProps()}
            className={`
              border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors
              ${isDragActive ? 'border-blue-500 bg-blue-50' : 'border-gray-300 hover:border-gray-400'}
            `}
          >
            <input {...getInputProps()} />
            <Upload className="h-10 w-10 mx-auto text-gray-400 mb-2" />
            {isDragActive ? (
              <p className="text-blue-600 font-medium">Drop files here...</p>
            ) : (
              <>
                <p className="text-gray-600">Drag & drop files, or click to select</p>
                <p className="text-sm text-gray-400 mt-1">
                  PDF, MP3, WAV, M4A supported
                </p>
              </>
            )}
          </div>

          {/* File List */}
          {files.length > 0 && (
            <div className="space-y-2">
              {files.map((f, index) => (
                <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-3">
                    {f.type === 'audio' ? (
                      <Music className="h-5 w-5 text-purple-500" />
                    ) : (
                      <FileText className="h-5 w-5 text-blue-500" />
                    )}
                    <div>
                      <p className="font-medium text-sm">{f.file.name}</p>
                      <p className="text-xs text-gray-500">
                        {(f.file.size / 1024 / 1024).toFixed(2)} MB
                        {f.documentType && ` • ${f.documentType.replace(/_/g, ' ')}`}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {f.status === 'done' && <Check className="h-5 w-5 text-green-500" />}
                    {f.status === 'processing' && <Loader2 className="h-5 w-5 text-blue-500 animate-spin" />}
                    <Badge variant={f.type === 'audio' ? 'secondary' : 'default'}>
                      {f.type === 'audio' ? 'Audio' : 'Document'}
                    </Badge>
                    <Button variant="ghost" size="sm" onClick={() => removeFile(index)}>
                      <Trash2 className="h-4 w-4 text-gray-400" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Extract Button */}
          {files.some(f => f.type === 'document') && !extractedData && (
            <Button onClick={handleExtract} disabled={isExtracting} className="w-full" size="lg">
              {isExtracting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Extracting with AI...
                </>
              ) : (
                <>
                  <FileText className="h-4 w-4 mr-2" />
                  Extract Case Information
                </>
              )}
            </Button>
          )}
        </CardContent>
      </Card>

      {/* Step 2: Review Extracted Data */}
      {extractedData && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <span className="bg-green-100 text-green-700 rounded-full w-6 h-6 flex items-center justify-center text-sm font-bold">2</span>
                Review Extracted Information
              </CardTitle>
              <div className="flex items-center gap-2">
                {extractedData.needsReview && (
                  <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-300">
                    <AlertTriangle className="h-3 w-3 mr-1" />
                    Needs Review
                  </Badge>
                )}
                <Badge variant="outline">
                  {Math.round((extractedData.overallConfidence || 0) * 100)}% confidence
                </Badge>
                <Button variant="outline" size="sm" onClick={() => setIsEditing(!isEditing)}>
                  <Edit className="h-4 w-4 mr-1" />
                  {isEditing ? 'Done' : 'Edit'}
                </Button>
              </div>
            </div>
            {reviewReasons.length > 0 && (
              <div className="mt-2 p-2 bg-yellow-50 rounded text-sm text-yellow-700">
                <strong>Review needed:</strong> {reviewReasons.join(', ')}
              </div>
            )}
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="case">
              <TabsList className="mb-4 flex-wrap h-auto">
                <TabsTrigger value="case"><Gavel className="h-4 w-4 mr-1" /> Case</TabsTrigger>
                <TabsTrigger value="deposition"><Calendar className="h-4 w-4 mr-1" /> Deposition</TabsTrigger>
                <TabsTrigger value="deponent"><User className="h-4 w-4 mr-1" /> Deponent</TabsTrigger>
                <TabsTrigger value="attorneys"><Users className="h-4 w-4 mr-1" /> Attorneys ({extractedData.attorneys?.length || 0})</TabsTrigger>
                <TabsTrigger value="exhibits"><FileQuestion className="h-4 w-4 mr-1" /> Exhibits</TabsTrigger>
                <TabsTrigger value="keywords"><Tag className="h-4 w-4 mr-1" /> Keywords ({deepgramKeywords.length})</TabsTrigger>
              </TabsList>

              {/* Case Tab */}
              <TabsContent value="case" className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <ConfidenceField
                    label="Case Number"
                    value={extractedData.caseNumber}
                    confidence={confidenceByField.caseNumber}
                    isEditing={isEditing}
                    onChange={(v) => updateField('caseNumber', v)}
                    icon={<Gavel className="h-4 w-4 text-gray-400" />}
                  />
                  <ConfidenceField
                    label="Court"
                    value={extractedData.court?.name}
                    confidence={confidenceByField.court}
                    isEditing={isEditing}
                    onChange={(v) => updateField('court.name', v)}
                    icon={<Building className="h-4 w-4 text-gray-400" />}
                  />
                </div>
                <ConfidenceField
                  label="Case Style"
                  value={extractedData.caseStyle}
                  confidence={confidenceByField.caseStyle}
                  isEditing={isEditing}
                  onChange={(v) => updateField('caseStyle', v)}
                />
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-sm font-medium">Plaintiffs</Label>
                    <div className="mt-1 space-y-1">
                      {extractedData.plaintiffs?.map((p: any, i: number) => (
                        <Badge key={i} variant="outline" className="mr-1 mb-1">
                          {p.name} {p.type === 'company' && '(Co.)'}
                        </Badge>
                      )) || <span className="text-gray-400 text-sm italic">None found</span>}
                    </div>
                  </div>
                  <div>
                    <Label className="text-sm font-medium">Defendants</Label>
                    <div className="mt-1 space-y-1">
                      {extractedData.defendants?.map((d: any, i: number) => (
                        <Badge key={i} variant="outline" className="mr-1 mb-1">
                          {d.name} {d.type === 'company' && '(Co.)'}
                        </Badge>
                      )) || <span className="text-gray-400 text-sm italic">None found</span>}
                    </div>
                  </div>
                </div>
              </TabsContent>

              {/* Deposition Tab */}
              <TabsContent value="deposition" className="space-y-4">
                <div className="grid grid-cols-3 gap-4">
                  <ConfidenceField
                    label="Date"
                    value={extractedData.scheduling?.date}
                    confidence={confidenceByField.depositionDate}
                    isEditing={isEditing}
                    onChange={(v) => updateField('scheduling.date', v)}
                    icon={<Calendar className="h-4 w-4 text-gray-400" />}
                  />
                  <ConfidenceField
                    label="Time"
                    value={extractedData.scheduling?.scheduledTime}
                    confidence={confidenceByField.depositionTime}
                    isEditing={isEditing}
                    onChange={(v) => updateField('scheduling.scheduledTime', v)}
                    icon={<Clock className="h-4 w-4 text-gray-400" />}
                  />
                  <ConfidenceField
                    label="Time Zone"
                    value={extractedData.scheduling?.timeZone}
                    isEditing={isEditing}
                    onChange={(v) => updateField('scheduling.timeZone', v)}
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-medium flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-gray-400" />
                    Location
                  </Label>
                  <div className="p-3 bg-gray-50 rounded-lg">
                    <p className="font-medium">{extractedData.location?.name || 'Not specified'}</p>
                    <p className="text-sm text-gray-600">
                      {[
                        extractedData.location?.address,
                        extractedData.location?.address2,
                        extractedData.location?.city,
                        extractedData.location?.state,
                        extractedData.location?.zip
                      ].filter(Boolean).join(', ') || 'Address not found'}
                    </p>
                    {extractedData.location?.zoomLink && (
                      <p className="text-sm text-blue-600 mt-1">
                        Zoom: {extractedData.location.zoomLink}
                      </p>
                    )}
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="flex items-center gap-2">
                    <Checkbox checked={extractedData.recording?.isVideotaped} disabled />
                    <Label>Videotaped</Label>
                  </div>
                  <div className="flex items-center gap-2">
                    <Checkbox checked={extractedData.interpreter?.hasInterpreter} disabled />
                    <Label>Interpreter Required</Label>
                  </div>
                </div>
              </TabsContent>

              {/* Deponent Tab */}
              <TabsContent value="deponent" className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <ConfidenceField
                    label="Deponent Name"
                    value={extractedData.deponent?.name}
                    confidence={confidenceByField.deponentName}
                    isEditing={isEditing}
                    onChange={(v) => updateField('deponent.name', v)}
                    icon={<User className="h-4 w-4 text-gray-400" />}
                  />
                  <ConfidenceField
                    label="Role/Capacity"
                    value={extractedData.deponent?.capacity || extractedData.deponent?.role}
                    isEditing={isEditing}
                    onChange={(v) => updateField('deponent.role', v)}
                  />
                </div>
                <ConfidenceField
                  label="Company/Employer"
                  value={extractedData.deponent?.company}
                  isEditing={isEditing}
                  onChange={(v) => updateField('deponent.company', v)}
                  icon={<Building className="h-4 w-4 text-gray-400" />}
                />
                {extractedData.depositionTopics?.length > 0 && (
                  <div>
                    <Label className="text-sm font-medium">Deposition Topics ({extractedData.depositionTopics.length})</Label>
                    <div className="mt-2 max-h-48 overflow-y-auto space-y-1">
                      {extractedData.depositionTopics.slice(0, 10).map((topic: any, i: number) => (
                        <div key={i} className="text-sm p-2 bg-gray-50 rounded">
                          <span className="font-medium">{topic.number}.</span> {topic.description.slice(0, 100)}...
                        </div>
                      ))}
                      {extractedData.depositionTopics.length > 10 && (
                        <p className="text-sm text-gray-500 italic">
                          + {extractedData.depositionTopics.length - 10} more topics
                        </p>
                      )}
                    </div>
                  </div>
                )}
              </TabsContent>

              {/* Attorneys Tab */}
              <TabsContent value="attorneys" className="space-y-3">
                {extractedData.attorneys?.map((att: any, i: number) => (
                  <div key={i} className="p-4 bg-gray-50 rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <p className="font-medium">{att.name}</p>
                      <Badge>{att.role}</Badge>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-sm text-gray-600">
                      {att.firm && <p><strong>Firm:</strong> {att.firm}</p>}
                      {att.representing && <p><strong>Represents:</strong> {att.representing}</p>}
                      {att.email && <p><strong>Email:</strong> {att.email}</p>}
                      {att.phone && <p><strong>Phone:</strong> {att.phone}</p>}
                      {att.deliveryMethod && (
                        <p><strong>Delivery:</strong> {att.deliveryMethod} ({att.deliveryPriority || 'Standard'})</p>
                      )}
                    </div>
                    {att.associateAttorneys?.length > 0 && (
                      <p className="text-sm text-gray-500 mt-2">
                        Associates: {att.associateAttorneys.map((a: any) => a.name).join(', ')}
                      </p>
                    )}
                  </div>
                )) || <p className="text-gray-400 italic">No attorneys extracted</p>}
              </TabsContent>

              {/* Exhibits Tab */}
              <TabsContent value="exhibits" className="space-y-4">
                <div className="grid grid-cols-3 gap-4">
                  <div className="p-3 bg-gray-50 rounded-lg text-center">
                    <p className="text-2xl font-bold">{extractedData.exhibitStats?.totalCount || 0}</p>
                    <p className="text-sm text-gray-600">Total Exhibits</p>
                  </div>
                  <div className="p-3 bg-gray-50 rounded-lg text-center">
                    <p className="text-2xl font-bold">{extractedData.exhibitStats?.blackAndWhite || 0}</p>
                    <p className="text-sm text-gray-600">Black & White</p>
                  </div>
                  <div className="p-3 bg-gray-50 rounded-lg text-center">
                    <p className="text-2xl font-bold">{extractedData.exhibitStats?.color || 0}</p>
                    <p className="text-sm text-gray-600">Color</p>
                  </div>
                </div>
                {extractedData.exhibits?.length > 0 && (
                  <div className="max-h-48 overflow-y-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b">
                          <th className="text-left p-2">No.</th>
                          <th className="text-left p-2">Description</th>
                        </tr>
                      </thead>
                      <tbody>
                        {extractedData.exhibits.map((ex: any, i: number) => (
                          <tr key={i} className="border-b">
                            <td className="p-2 font-medium">{ex.number}</td>
                            <td className="p-2">{ex.description || '-'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </TabsContent>

              {/* Keywords Tab */}
              <TabsContent value="keywords">
                <p className="text-sm text-gray-600 mb-3">
                  These terms will be sent to Deepgram for better transcription accuracy.
                </p>
                <div className="flex flex-wrap gap-2 max-h-64 overflow-y-auto p-2 bg-gray-50 rounded-lg">
                  {deepgramKeywords.map((term, i) => (
                    <Badge key={i} variant="outline" className="text-sm">
                      {term}
                    </Badge>
                  ))}
                  {deepgramKeywords.length === 0 && (
                    <p className="text-gray-400 italic">No keywords extracted</p>
                  )}
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      )}

      {/* Step 3: Create Job */}
      {extractedData && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <span className="bg-blue-100 text-blue-700 rounded-full w-6 h-6 flex items-center justify-center text-sm font-bold">3</span>
              Create Job
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Button onClick={handleCreateJob} disabled={isCreating} className="w-full" size="lg">
              {isCreating ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Creating...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  Create Job & Continue
                </>
              )}
            </Button>
            <p className="text-center text-sm text-gray-500 mt-2">
              {files.some(f => f.type === 'audio') 
                ? `Audio file will be uploaded and ${deepgramKeywords.length} keywords sent to Deepgram`
                : 'You can upload audio files later'}
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

export default CaseIntake;
